/**
 * Push para qualquer aviso do sininho da equipe (Pix, falhas, lista de espera,
 * atraso…), independente do WhatsApp. Chamado pelo gatilho de inserção em
 * `notificacoes`; os avisos da agenda seguem em `eventos.server.ts`.
 * Nunca lança: falha de push nunca bloqueia a operação.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { chavesVapid } from "./eventos.server";
import { destinatariosDoAviso, focoAtivo, inscricaoVencida, textoDoAviso } from "./regras";
import { enviarPush } from "./webpush.server";

type Db = SupabaseClient;

export async function processarAvisoDoSininho(notificacaoId: string): Promise<{ enviados: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as Db;
  const { data: n } = await db
    .from("notificacoes")
    .select("id, tenant_id, user_id, tipo, titulo, corpo, link, prioridade, destinatario_tipo, canais, obsoleta_em")
    .eq("id", notificacaoId)
    .maybeSingle();
  if (!n || n.obsoleta_em) return { enviados: 0 };

  const [{ data: equipeBruta }, { data: prefs }] = await Promise.all([
    db.from("tenant_usuarios").select("user_id, papel, ativo").eq("tenant_id", n.tenant_id),
    db
      .from("notificacoes_preferencias")
      .select("user_id, no_push")
      .eq("tenant_id", n.tenant_id)
      .eq("tipo", n.tipo),
  ]);
  const equipe = ((equipeBruta ?? []) as { user_id: string; papel: string; ativo: boolean | null }[]).map(
    (m) => ({ userId: m.user_id, papel: m.papel, ativo: m.ativo !== false }),
  );
  const alvos = destinatariosDoAviso(
    { tipo: n.tipo, userId: n.user_id, destinatarioTipo: n.destinatario_tipo },
    equipe,
  );
  const registro: Record<string, { push: { enviar: boolean; motivo: string } }> = {};
  const desligou = new Set(
    ((prefs ?? []) as { user_id: string; no_push: boolean }[]).filter((p) => p.no_push === false).map((p) => p.user_id),
  );
  const liberados = alvos.filter((id) => {
    if (desligou.has(id)) registro[id] = { push: { enviar: false, motivo: "push_desligado" } };
    return !desligou.has(id);
  });

  let enviados = 0;
  if (liberados.length) {
    const { data: inscricoes } = await db
      .from("push_inscricoes")
      .select("id, user_id, endpoint, p256dh, auth, falhas, em_foco_ate")
      .eq("tenant_id", n.tenant_id)
      .in("user_id", liberados);
    const lista = (inscricoes ?? []) as {
      id: string; user_id: string; endpoint: string; p256dh: string; auth: string; falhas: number; em_foco_ate: string | null;
    }[];
    for (const id of liberados) if (!lista.some((i) => i.user_id === id)) registro[id] = { push: { enviar: false, motivo: "sem_inscricao" } };
    const critica = n.prioridade === "critica";
    const chaves = lista.length ? await chavesVapid(db) : null;
    for (const inscricao of lista) {
      if (focoAtivo(inscricao.em_foco_ate) && !critica) {
        registro[inscricao.user_id] ??= { push: { enviar: false, motivo: "modo_foco" } };
        continue;
      }
      const chave = `aviso:${n.id}:${inscricao.id}`;
      const { error: repetido } = await db.from("push_entregas").insert({ chave });
      if (repetido) continue;
      const status = await enviarPush(
        inscricao,
        { tipo: n.tipo, corpo: textoDoAviso(n.titulo, n.corpo), link: n.link || "/painel", tag: `av-${n.tipo}` },
        chaves!,
        { ttl: critica ? 900 : 3600, urgente: critica || n.prioridade === "importante" },
      ).catch(() => 0);
      if (status >= 200 && status < 300) {
        enviados += 1;
        registro[inscricao.user_id] = { push: { enviar: true, motivo: "enviado" } };
        await db.from("push_inscricoes").update({ ultimo_sucesso_em: new Date().toISOString(), falhas: 0 }).eq("id", inscricao.id);
      } else {
        registro[inscricao.user_id] ??= { push: { enviar: false, motivo: "falha_envio" } };
        if (inscricaoVencida(status)) await db.from("push_inscricoes").delete().eq("id", inscricao.id);
        else await db.from("push_inscricoes").update({ falhas: inscricao.falhas + 1 }).eq("id", inscricao.id);
      }
    }
  }
  if (Object.keys(registro).length) {
    const anterior = (n.canais ?? {}) as Record<string, Record<string, unknown>>;
    const junto: Record<string, unknown> = { ...anterior };
    for (const [id, r] of Object.entries(registro)) junto[id] = { ...(anterior[id] ?? {}), ...r };
    await db.from("notificacoes").update({ canais: junto }).eq("id", n.id).then(undefined, () => undefined);
  }
  return { enviados };
}
