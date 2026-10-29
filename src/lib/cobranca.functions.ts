import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cpfCnpjValido, type Ciclo, type Forma, type StatusAssinatura } from "@/lib/cobranca";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

export type MinhaCobranca = {
  configurada: boolean;
  assinatura: null | {
    plano: string;
    ciclo: Ciclo;
    forma: Forma | null;
    valorCentavos: number;
    status: StatusAssinatura;
    proximoVencimento: string | null;
    pagoAte: string | null;
    cancelarNoFim: boolean;
  };
  cadastro: null | { nome: string; documento: string; email: string; telefone: string | null };
  faturaAberta: null | { vencimento: string | null; valorCentavos: number; link: string | null };
  historico: Array<{
    id: string;
    vencimento: string | null;
    valorCentavos: number;
    status: string;
    forma: Forma | null;
    pagoEm: string | null;
    link: string | null;
  }>;
};

function mascararDocumento(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length <= 4) return "••••";
  return `•••.${digitos.slice(-4)}`;
}

export const getMinhaCobranca = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MinhaCobranca> => {
    const tenantId = await tenantIdDoMembro(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: assinatura }, { data: cadastro }, { data: faturas }, { configDeCobranca }] =
      await Promise.all([
        supabaseAdmin
          .from("assinaturas")
          .select(
            "plano_chave, ciclo, forma, valor_centavos, status, proximo_vencimento, pago_ate, cancelar_no_fim",
          )
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        supabaseAdmin
          .from("dados_de_cobranca")
          .select("nome, cpf_cnpj, email, telefone")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        supabaseAdmin
          .from("faturas")
          .select("id, vencimento, valor_centavos, status, forma, pago_em, link_pagamento")
          .eq("tenant_id", tenantId)
          .order("criado_em", { ascending: false })
          .limit(12),
        import("@/lib/cobranca.server"),
      ]);
    const config = await configDeCobranca();
    const lista = faturas ?? [];
    const aberta = lista.find(
      (f) =>
        !f.pago_em &&
        !["DELETED", "RECEIVED", "CONFIRMED"].includes(String(f.status).toUpperCase()),
    );
    return {
      configurada: config.ligada,
      assinatura: assinatura
        ? {
            plano: assinatura.plano_chave,
            ciclo: assinatura.ciclo as Ciclo,
            forma: (assinatura.forma as Forma | null) ?? null,
            valorCentavos: assinatura.valor_centavos,
            status: assinatura.status as StatusAssinatura,
            proximoVencimento: assinatura.proximo_vencimento,
            pagoAte: assinatura.pago_ate,
            cancelarNoFim: Boolean(assinatura.cancelar_no_fim),
          }
        : null,
      cadastro: cadastro
        ? {
            nome: cadastro.nome,
            documento: mascararDocumento(cadastro.cpf_cnpj),
            email: cadastro.email,
            telefone: cadastro.telefone,
          }
        : null,
      faturaAberta: aberta
        ? {
            vencimento: aberta.vencimento,
            valorCentavos: aberta.valor_centavos,
            link: aberta.link_pagamento,
          }
        : null,
      historico: lista.map((f) => ({
        id: f.id,
        vencimento: f.vencimento,
        valorCentavos: f.valor_centavos,
        status: f.status,
        forma: (f.forma as Forma | null) ?? null,
        pagoEm: f.pago_em,
        link: f.link_pagamento,
      })),
    };
  });

const dadosSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  cpfCnpj: z.string().trim().min(11).max(18),
  email: z.string().trim().email().max(160),
  telefone: z.string().trim().max(24).optional(),
});

export const salvarMeusDadosDeCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => dadosSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_plano");
    if (!cpfCnpjValido(data.cpfCnpj)) throw new Error("Informe um CPF ou CNPJ válido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("dados_de_cobranca").upsert(
      {
        tenant_id: tenantId,
        nome: data.nome,
        cpf_cnpj: data.cpfCnpj.replace(/\D/g, ""),
        email: data.email,
        telefone: data.telefone?.replace(/\D/g, "") || null,
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error("Não foi possível salvar os dados de cobrança.");
    return { ok: true };
  });

export const contratarPlano = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        plano: z.string().regex(/^[a-z0-9_]{2,30}$/),
        ciclo: z.enum(["mensal", "anual"]),
        forma: z.enum(["pix", "boleto", "cartao"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_plano");
    const { configDeCobranca, criarAssinatura } = await import("@/lib/cobranca.server");
    if (!(await configDeCobranca()).ligada) {
      throw new Error("A cobrança online ainda não está configurada. Fale com o suporte do Flow.");
    }
    return criarAssinatura({
      tenantId,
      planoChave: data.plano,
      ciclo: data.ciclo,
      forma: data.forma,
      permitirTeste: true,
    });
  });
