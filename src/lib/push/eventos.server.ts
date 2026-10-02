/**
 * Ponto único de envio de push da equipe. Chamado pelo gatilho que também cria
 * o aviso do sino (notificar_agendamento), nunca por varredura.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { linkDoAgendamento } from "@/lib/links-de-tela";
import {
  decidirExibicao,
  destinatariosDoPush,
  focoAtivo,
  inscricaoVencida,
  textoDoPush,
  type MembroDaEquipe,
  type TipoDePush,
} from "./regras";
import { enviarPush, gerarChavesVapid, type ChavesVapid } from "./webpush.server";

// Tabelas novas ainda podem não estar nos tipos gerados em todos os ambientes.
type Db = SupabaseClient;

async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

/** Par VAPID guardado em chaves_internas (só service_role). Gerado na primeira vez. */
export async function chavesVapid(db?: Db): Promise<ChavesVapid> {
  const banco = db ?? (await admin());
  const ler = async () => {
    const { data } = await banco
      .from("chaves_internas")
      .select("valor")
      .eq("nome", "vapid")
      .maybeSingle();
    const valor = (data as { valor?: string } | null)?.valor;
    return valor ? (JSON.parse(valor) as ChavesVapid) : null;
  };
  const existente = await ler();
  if (existente) return existente;
  const novas = await gerarChavesVapid();
  await banco
    .from("chaves_internas")
    .upsert(
      { nome: "vapid", valor: JSON.stringify(novas) },
      { onConflict: "nome", ignoreDuplicates: true },
    );
  // Releitura: com duas chamadas simultâneas, vale sempre o par que ficou gravado.
  const gravadas = await ler();
  if (!gravadas) throw new Error("Chaves de push indisponíveis.");
  return gravadas;
}

function formatarQuando(inicio: string, fuso: string) {
  const d = new Date(inicio);
  const dia = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: fuso });
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  if (dia(d) === dia(new Date())) return hora;
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
  }).format(d);
  return `${data} ${hora}`;
}

const ENCERRADOS = ["cancelado", "cancelada", "nao_compareceu", "finalizado", "concluido"];

export async function processarEventoDePush(evento: {
  agendamentoId: string;
  tipo: TipoDePush;
  ator: string | null;
}) {
  const db = await admin();
  const { data: ag } = await db
    .from("agendamentos")
    .select("id, tenant_id, inicio, profissional_id, clientes(nome), profissionais(user_id)")
    .eq("id", evento.agendamentoId)
    .maybeSingle();
  if (!ag) return { enviados: 0 };
  const a = ag as unknown as {
    id: string;
    tenant_id: string;
    inicio: string;
    profissional_id: string | null;
    clientes: { nome: string | null } | null;
    profissionais: { user_id: string | null } | null;
  };

  const [{ data: equipeBruta }, { data: tenant }, { data: prefs }] = await Promise.all([
    db.from("tenant_usuarios").select("user_id, papel, ativo").eq("tenant_id", a.tenant_id),
    db.from("tenants").select("fuso").eq("id", a.tenant_id).maybeSingle(),
    db
      .from("notificacoes_preferencias")
      .select("user_id, no_push")
      .eq("tenant_id", a.tenant_id)
      .eq("tipo", evento.tipo),
  ]);
  const equipe: MembroDaEquipe[] = (
    (equipeBruta ?? []) as { user_id: string; papel: string; ativo: boolean | null }[]
  ).map((m) => ({ userId: m.user_id, papel: m.papel, ativo: m.ativo !== false }));
  const desligados = new Set(
    ((prefs ?? []) as { user_id: string; no_push: boolean }[])
      .filter((p) => p.no_push === false)
      .map((p) => p.user_id),
  );
  const pessoas = destinatariosDoPush(
    { tipo: evento.tipo, ator: evento.ator, profissionalUserId: a.profissionais?.user_id ?? null },
    equipe,
    desligados,
  );
  if (!pessoas.length) return { enviados: 0 };

  const fuso = (tenant as { fuso?: string | null } | null)?.fuso || "America/Sao_Paulo";
  let proximo = false;
  if (evento.tipo === "cliente_chegou" && a.profissional_id) {
    const hoje = new Date().toLocaleDateString("en-CA", { timeZone: fuso });
    const { data: lista } = await db
      .from("agendamentos")
      .select("id, inicio, status")
      .eq("profissional_id", a.profissional_id)
      .is("finished_at", null)
      .gte("inicio", new Date(Date.now() - 12 * 3600_000).toISOString())
      .order("inicio", { ascending: true })
      .limit(20);
    const primeiro = ((lista ?? []) as { id: string; inicio: string; status: string }[]).find(
      (x) =>
        !ENCERRADOS.includes(x.status) &&
        new Date(x.inicio).toLocaleDateString("en-CA", { timeZone: fuso }) === hoje,
    );
    proximo = primeiro?.id === a.id;
  }

  const { count: naoLidas } = await db
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", a.tenant_id)
    .is("lida_em", null);

  const { data: inscricoes } = await db
    .from("push_inscricoes")
    .select("id, user_id, endpoint, p256dh, auth, falhas, em_foco_ate, discreto")
    .eq("tenant_id", a.tenant_id)
    .in("user_id", pessoas);
  const lista = (inscricoes ?? []) as {
    id: string;
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    falhas: number;
    em_foco_ate: string | null;
    discreto: boolean | null;
  }[];
  if (!lista.length) return { enviados: 0 };

  const chaves = await chavesVapid(db);
  const quando = formatarQuando(a.inicio, fuso);
  const base = {
    tipo: evento.tipo,
    link: linkDoAgendamento(a.id),
    tag: `ag-${a.id}`,
    naoLidas: naoLidas ?? 0,
  };
  const imediato = evento.tipo === "cliente_chegou" || evento.tipo === "agendamento_cancelado";
  let enviados = 0;
  for (const inscricao of lista) {
    // Foco e modo discreto vêm de cada aparelho; o que não passa nem é enviado.
    const foco = focoAtivo(inscricao.em_foco_ate);
    if (decidirExibicao({ appVisivel: false, foco, tipo: evento.tipo, proximo }) === "nada") continue;
    const discreto = inscricao.discreto === true;
    const conteudo = {
      ...base,
      corpo: textoDoPush({
        tipo: evento.tipo,
        nome: discreto ? "" : (a.clientes?.nome ?? ""),
        quando,
        discreto,
      }),
    };
    // Dedupe por evento e pessoa: o mesmo acontecimento não toca duas vezes.
    const chave = `${a.id}:${evento.tipo}:${a.inicio}:${inscricao.user_id}:${inscricao.id}`;
    const { error: repetido } = await db.from("push_entregas").insert({ chave });
    if (repetido) continue;
    const status = await enviarPush(inscricao, conteudo, chaves, {
      ttl: imediato ? 900 : 3600,
      urgente: imediato,
      topico: conteudo.tag.replace(/-/g, "").slice(0, 32),
    });
    if (status >= 200 && status < 300) {
      enviados += 1;
      await db
        .from("push_inscricoes")
        .update({ ultimo_sucesso_em: new Date().toISOString(), falhas: 0 })
        .eq("id", inscricao.id);
    } else if (inscricaoVencida(status)) {
      await db.from("push_inscricoes").delete().eq("id", inscricao.id);
    } else {
      await db
        .from("push_inscricoes")
        .update({ falhas: inscricao.falhas + 1 })
        .eq("id", inscricao.id);
    }
  }
  return { enviados };
}
