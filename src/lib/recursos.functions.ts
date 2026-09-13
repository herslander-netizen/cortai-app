import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERMISSOES, type PapelEquipe, type Permissao } from "@/lib/permissoes";
import { RECURSOS_OPCIONAIS, type ChaveRecursoTenant } from "@/lib/recursos";
import { recursoLiberado } from "@/lib/planos";
import { tenantIdDoMembro } from "@/lib/tenant";

export type RecursoDaBarbearia = {
  chave: ChaveRecursoTenant;
  ativo: boolean;
  /** false quando o plano da barbearia não inclui o recurso. */
  disponivelNoPlano: boolean;
};

export type ContextoBarbearia = {
  tenantId: string;
  papel: PapelEquipe;
  permissoes: Permissao[];
  plano: string;
  recursos: RecursoDaBarbearia[];
};

async function acesso(context: any) {
  const tenantId = await tenantIdDoMembro(context);
  const { data: vinculo } = await context.supabase
    .from("tenant_usuarios")
    .select("papel, permissoes")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!vinculo) throw new Error("Acesso à barbearia não encontrado.");
  const papel = vinculo.papel as PapelEquipe;
  const permissoes = papel === "dono" ? [...PERMISSOES] : ((vinculo.permissoes ?? []) as Permissao[]);
  return { tenantId, papel, permissoes };
}

/** Papel, permissões individuais e recursos ativos da barbearia do usuário. */
export const getContextoBarbearia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContextoBarbearia> => {
    const base = await acesso(context);
    const [{ data: linhas }, { data: tenant }] = await Promise.all([
      context.supabase.from("recursos_do_tenant").select("chave, ativo").eq("tenant_id", base.tenantId),
      context.supabase.from("tenants").select("plano").eq("id", base.tenantId).maybeSingle(),
    ]);
    const plano = (tenant?.plano as string) ?? "essencial";
    const salvos = new Map<string, boolean>((linhas ?? []).map((l: any) => [l.chave as string, Boolean(l.ativo)]));
    const { data: regras } = await context.supabase
      .from("recursos_de_plano")
      .select("chave, liberado")
      .eq("plano", plano);
    const porPlano = new Map<string, boolean>((regras ?? []).map((r: any) => [r.chave as string, Boolean(r.liberado)]));

    const recursos = RECURSOS_OPCIONAIS.map((recurso) => {
      const disponivelNoPlano = recurso.plano ? (porPlano.get(recurso.plano) ?? true) : true;
      const ativo = disponivelNoPlano && (salvos.get(recurso.chave) ?? true);
      return { chave: recurso.chave, ativo, disponivelNoPlano };
    });
    return { ...base, plano, recursos };
  });

export const definirRecursoDaBarbearia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chave: z.enum(RECURSOS_OPCIONAIS.map((r) => r.chave) as [ChaveRecursoTenant, ...ChaveRecursoTenant[]]),
        ativo: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const base = await acesso(context);
    if (!base.permissoes.includes("alterar_dados_barbearia")) {
      throw new Error("Você não tem permissão para alterar os recursos da barbearia.");
    }
    const recurso = RECURSOS_OPCIONAIS.find((r) => r.chave === data.chave)!;
    if (data.ativo && recurso.plano) {
      const { liberado } = await recursoLiberado(context.supabase, base.tenantId, recurso.plano);
      if (!liberado) throw new Error("O plano atual da sua barbearia não inclui este recurso.");
    }

    // Dependências: ligar o filho liga o pai; desligar o pai desliga os filhos.
    const alteracoes: { chave: ChaveRecursoTenant; ativo: boolean }[] = [{ chave: data.chave, ativo: data.ativo }];
    if (data.ativo && recurso.depende) alteracoes.push({ chave: recurso.depende, ativo: true });
    if (!data.ativo) {
      for (const filho of RECURSOS_OPCIONAIS.filter((r) => r.depende === data.chave)) {
        alteracoes.push({ chave: filho.chave, ativo: false });
      }
    }

    const { error } = await context.supabase.from("recursos_do_tenant").upsert(
      alteracoes.map((a) => ({ tenant_id: base.tenantId, chave: a.chave, ativo: a.ativo })),
      { onConflict: "tenant_id,chave" },
    );
    if (error) throw new Error(error.message);

    // A loja pública segue a mesma chave já usada pelo tenant.
    if (alteracoes.some((a) => a.chave === "loja_online")) {
      const loja = alteracoes.find((a) => a.chave === "loja_online")!;
      await context.supabase.from("tenants").update({ loja_ativa: loja.ativo }).eq("id", base.tenantId);
    }

    await context.supabase.rpc("registrar_auditoria_barbearia", {
      _tenant_id: base.tenantId,
      _acao: data.ativo ? "ativou_recurso" : "desativou_recurso",
      _alvo: data.chave,
      _detalhes: { alteracoes },
    });
    return { ok: true };
  });
