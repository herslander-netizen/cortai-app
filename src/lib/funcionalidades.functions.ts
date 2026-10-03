import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";
import { capacidadesDoTenant } from "@/lib/capacidades.functions";
import { PLANOS, ROTULO_DO_PLANO } from "@/lib/planos";
import {
  FUNCIONALIDADES,
  funcionalidade,
  type ChaveDeFuncionalidade,
  type LeituraDasFuncionalidades,
} from "@/lib/funcionalidades";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lê o estado real de cada interruptor existente, sem matriz paralela. */
export const getFuncionalidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeituraDasFuncionalidades> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = await admin();
    const [caps, tenantRes, regrasRes, configRes, matrizRes, acessoRes] = await Promise.all([
      capacidadesDoTenant(context.supabase, tenantId),
      db
        .from("tenants")
        .select("loja_ativa, indicacao_ativa, listada, lista_espera_automatica")
        .eq("id", tenantId)
        .maybeSingle(),
      db
        .from("regras_de_plano")
        .select("tipo, ativo, bloqueia_agendamento_no_limite")
        .eq("tenant_id", tenantId)
        .in("tipo", ["fidelidade", "fiado"]),
      db
        .from("config_atendimento_ia")
        .select("confirmacao_automatica, lembretes, recuperacao_ativa")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      db.from("recursos_de_plano").select("plano, chave, liberado").eq("liberado", true),
      context.supabase.rpc("meu_acesso_no_tenant", { _tenant_id: tenantId }),
    ]);

    const t = tenantRes.data;
    const fidelidade = regrasRes.data?.find((r) => r.tipo === "fidelidade");
    const fiado = regrasRes.data?.find((r) => r.tipo === "fiado");
    const c = configRes.data;
    const valores: LeituraDasFuncionalidades["valores"] = {};
    for (const item of FUNCIONALIDADES) {
      const fonte = item.fonte;
      if (fonte.tipo === "recurso") valores[item.chave] = caps.ativos[fonte.chave] ?? true;
      else if (fonte.tipo === "tenant") valores[item.chave] = Boolean(t?.[fonte.coluna]);
      else if (fonte.tipo === "lista_automatica")
        valores[item.chave] = t?.lista_espera_automatica !== false;
      else if (fonte.tipo === "regra")
        valores[item.chave] =
          fonte.regra === "fidelidade"
            ? Boolean(fidelidade?.ativo)
            : fonte.regra === "fiado"
              ? Boolean(fiado?.ativo)
              : Boolean(fiado?.bloqueia_agendamento_no_limite);
      else if (fonte.tipo === "secretaria")
        // Mesmos padrões que o motor da Secretária usa quando não há linha salva.
        valores[item.chave] =
          fonte.coluna === "confirmacao_automatica"
            ? (c?.confirmacao_automatica ?? true)
            : fonte.coluna === "lembretes"
              ? Boolean(c?.lembretes)
              : Boolean(c?.recuperacao_ativa);
    }

    const planoMinimo: Record<string, string> = {};
    for (const plano of PLANOS) {
      for (const linha of matrizRes.data ?? []) {
        if (linha.plano === plano && !planoMinimo[linha.chave as string])
          planoMinimo[linha.chave as string] = ROTULO_DO_PLANO[plano] ?? plano;
      }
    }

    const acesso = (acessoRes.data as { permissoes: string[] }[] | null)?.[0];
    return {
      valores,
      liberados: caps.liberados,
      planoMinimo,
      permissoes: acesso?.permissoes ?? [],
    };
  });

/** Liga ou desliga um interruptor existente. Nunca apaga dados. */
export const definirFuncionalidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chave: z.enum(FUNCIONALIDADES.map((x) => x.chave) as [ChaveDeFuncionalidade]),
        ativo: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const item = funcionalidade(data.chave);
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");
    if (item.permissaoExtra) await exigirPermissao(context, tenantId, item.permissaoExtra);

    const caps = await capacidadesDoTenant(context.supabase, tenantId);
    if (item.plano && caps.liberados[item.plano] === false)
      throw new Error("Esta funcionalidade não está incluída no seu plano.");
    if (data.ativo && item.depende) {
      const base = funcionalidade(item.depende);
      if (base.fonte.tipo === "recurso" && caps.ativos[base.fonte.chave] === false)
        throw new Error(`Ligue "${base.rotulo}" antes.`);
    }

    const db = await admin();
    const fonte = item.fonte;
    let erro: { message: string } | null = null;
    if (fonte.tipo === "recurso") {
      ({ error: erro } = await db
        .from("recursos_do_tenant")
        .upsert(
          { tenant_id: tenantId, chave: fonte.chave, ativo: data.ativo },
          { onConflict: "tenant_id,chave" },
        ));
    } else if (fonte.tipo === "tenant") {
      ({ error: erro } = await db
        .from("tenants")
        .update({ [fonte.coluna]: data.ativo } as { listada: boolean })
        .eq("id", tenantId));
    } else if (fonte.tipo === "lista_automatica") {
      ({ error: erro } = await context.supabase.rpc("definir_lista_espera_automatica", {
        _tenant_id: tenantId,
        _ativo: data.ativo,
      }));
    } else if (fonte.tipo === "secretaria") {
      ({ error: erro } = await db
        .from("config_atendimento_ia")
        .upsert(
          { tenant_id: tenantId, [fonte.coluna]: data.ativo } as {
            tenant_id: string;
            lembretes: boolean;
          },
          { onConflict: "tenant_id" },
        ));
    } else if (fonte.tipo === "regra") {
      const tipo = fonte.regra === "fidelidade" ? "fidelidade" : "fiado";
      const campos =
        fonte.regra === "fiado_bloqueio"
          ? { bloqueia_agendamento_no_limite: data.ativo }
          : { ativo: data.ativo };
      const { data: existente } = await db
        .from("regras_de_plano")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("tipo", tipo)
        .maybeSingle();
      if (existente) {
        ({ error: erro } = await db.from("regras_de_plano").update(campos).eq("id", existente.id));
      } else {
        // Regra nova nasce como hoje: Voltaí com meta padrão de 10; fiado sem bloqueio.
        ({ error: erro } = await db.from("regras_de_plano").insert({
          tenant_id: tenantId,
          tipo,
          ativo: fonte.regra === "fiado_bloqueio" ? true : data.ativo,
          ...(tipo === "fidelidade" ? { fidelidade_alvo: 10 } : {}),
          ...campos,
        }));
      }
    } else {
      throw new Error("Esta funcionalidade é ajustada na própria tela.");
    }
    if (erro) throw new Error("Não foi possível salvar agora. Tente de novo.");
    return { ok: true as const };
  });
