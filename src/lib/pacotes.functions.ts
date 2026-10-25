import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { montarPacotes } from "@/lib/pacotes";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

const PERMISSAO = "alterar_dados_barbearia";

/** As tabelas `pacotes` e `pacote_itens` (migração 0046) ainda não estão nos tipos gerados do cliente. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (context: { supabase: unknown }) => context.supabase as any;

/** A tabela chega com a migração 0046; antes disso (ou sem ela aplicada) a tela mostra aviso, não erro. */
function tabelaAusente(erro: { message?: string; code?: string } | null) {
  if (!erro) return false;
  return (
    erro.code === "42P01" ||
    erro.code === "PGRST205" ||
    /pacotes|schema cache/i.test(erro.message ?? "")
  );
}

export const getPacotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro({ supabase: context.supabase, userId: context.userId });
    await exigirPermissao(context, tenantId, PERMISSAO);
    const [pacotes, itens, servicos] = await Promise.all([
      db(context)
        .from("pacotes")
        .select("id, tipo, nome, descricao, preco_centavos, validade_dias, destaque, ativo")
        .eq("tenant_id", tenantId)
        .order("ordem")
        .order("criado_em"),
      db(context)
        .from("pacote_itens")
        .select("pacote_id, servico_id, quantidade")
        .eq("tenant_id", tenantId),
      context.supabase
        .from("servicos")
        .select("id, nome, preco_centavos, duracao_min")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("ordem"),
    ]);
    const servicosAtivos = servicos.data ?? [];
    if (tabelaAusente(pacotes.error)) {
      return { disponivel: false as const, pacotes: [], servicos: servicosAtivos };
    }
    if (pacotes.error) throw new Error(pacotes.error.message);
    if (itens.error) throw new Error(itens.error.message);
    return {
      disponivel: true as const,
      pacotes: montarPacotes(pacotes.data ?? [], itens.data ?? [], servicosAtivos),
      servicos: servicosAtivos,
    };
  });

const pacoteSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(["pacote", "combo"]),
  nome: z.string().trim().min(2).max(80),
  descricao: z.string().trim().max(300).nullable().default(null),
  precoCentavos: z.number().int().min(0).max(100_000_00),
  validadeDias: z.number().int().min(1).max(730).nullable().default(null),
  destaque: z.boolean().default(false),
  ativo: z.boolean().default(true),
  itens: z
    .array(
      z.object({
        servicoId: z.string().uuid(),
        quantidade: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(12),
});

export const salvarPacote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => pacoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro({ supabase: context.supabase, userId: context.userId });
    await exigirPermissao(context, tenantId, PERMISSAO);
    const ids = [...new Set(data.itens.map((i) => i.servicoId))];
    if (ids.length !== data.itens.length)
      throw new Error("Cada serviço entra uma vez só; use a quantidade.");
    const { data: validos, error: erroServicos } = await context.supabase
      .from("servicos")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("id", ids);
    if (erroServicos) throw new Error(erroServicos.message);
    if ((validos ?? []).length !== ids.length)
      throw new Error("Escolha só serviços do seu negócio.");
    // Combo é uma visita só: a quantidade de cada serviço é sempre 1.
    const itens = data.itens.map((i) => ({
      servicoId: i.servicoId,
      quantidade: data.tipo === "combo" ? 1 : i.quantidade,
    }));
    const campos = {
      tenant_id: tenantId,
      tipo: data.tipo,
      nome: data.nome,
      descricao: data.descricao?.trim() ? data.descricao : null,
      preco_centavos: data.precoCentavos,
      validade_dias: data.tipo === "pacote" ? data.validadeDias : null,
      destaque: data.destaque,
      ativo: data.ativo,
    };
    let pacoteId = data.id;
    if (pacoteId) {
      const { error } = await db(context)
        .from("pacotes")
        .update(campos)
        .eq("id", pacoteId)
        .eq("tenant_id", tenantId);
      if (error) throw new Error(error.message);
      // Os itens do pacote são trocados de uma vez: é o que o editor mostra na tela.
      const { error: limpar } = await db(context)
        .from("pacote_itens")
        .delete()
        .eq("pacote_id", pacoteId)
        .eq("tenant_id", tenantId);
      if (limpar) throw new Error(limpar.message);
    } else {
      const { data: novo, error } = await db(context)
        .from("pacotes")
        .insert(campos)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      pacoteId = novo.id as string;
    }
    const { error: erroItens } = await db(context)
      .from("pacote_itens")
      .insert(
        itens.map((i) => ({
          pacote_id: pacoteId,
          tenant_id: tenantId,
          servico_id: i.servicoId,
          quantidade: i.quantidade,
        })),
      );
    if (erroItens) throw new Error(erroItens.message);
    return { ok: true, id: pacoteId };
  });
