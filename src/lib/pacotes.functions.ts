import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { erroPrecoDoConjunto, montarPacotes, precoAvulsoDoConjunto } from "@/lib/pacotes";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";

const PERMISSAO = "alterar_dados_barbearia";

/** As tabelas `pacotes` e `pacote_itens` (migração 0046) ainda não estão nos tipos gerados do cliente. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (context: { supabase: unknown }) => context.supabase as any;

/** A tabela chega com a migração 0046; antes disso (ou sem ela aplicada) a tela mostra aviso, não erro. */
function tabelaAusente(erro: { message?: string; code?: string } | null) {
  if (!erro) return false;
  return erro.code === "42P01" || erro.code === "PGRST205";
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
    if (servicos.error) throw new Error("Não foi possível consultar os serviços do negócio.");
    const servicosAtivos = servicos.data ?? [];
    if (tabelaAusente(pacotes.error)) {
      return { disponivel: false as const, pacotes: [], servicos: servicosAtivos };
    }
    if (pacotes.error) throw new Error(pacotes.error.message);
    if (tabelaAusente(itens.error)) {
      return { disponivel: false as const, pacotes: [], servicos: servicosAtivos };
    }
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
      .select("id, preco_centavos")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .in("id", ids);
    if (erroServicos) throw new Error(erroServicos.message);
    if ((validos ?? []).length !== ids.length)
      throw new Error("Escolha apenas serviços ativos do seu negócio.");
    // Combo é uma visita só: a quantidade de cada serviço é sempre 1.
    const itens = data.itens.map((i) => ({
      servicoId: i.servicoId,
      quantidade: data.tipo === "combo" ? 1 : i.quantidade,
    }));
    // Os preços de referência são sempre do banco, nunca do formulário.
    // Validar antes de INSERT/UPDATE/DELETE impede gravações inviáveis.
    const porId = new Map((validos ?? []).map((s) => [s.id, s.preco_centavos]));
    const valorAvulso = precoAvulsoDoConjunto(
      data.tipo,
      itens.map((item) => ({
        precoCentavos: porId.get(item.servicoId) ?? 0,
        quantidade: item.quantidade,
      })),
    );
    const erroPreco = erroPrecoDoConjunto(data.precoCentavos, valorAvulso);
    if (erroPreco) throw new Error(erroPreco);
    // A edição inteira ocorre em UMA única transação na RPC do Postgres.
    // Não retornar ao caminho antigo (UPDATE + DELETE + INSERT separados):
    // sem a migração, falhar com diagnóstico em vez de arriscar dados parciais.
    const { data: pacoteId, error } = await db(context).rpc("salvar_pacote_atomico", {
      _tenant_id: tenantId,
      _pacote_id: data.id ?? null,
      _tipo: data.tipo,
      _nome: data.nome,
      _descricao: data.descricao?.trim() || null,
      _preco_centavos: data.precoCentavos,
      _validade_dias: data.tipo === "pacote" ? data.validadeDias : null,
      _destaque: data.destaque,
      _ativo: data.ativo,
      _itens: itens,
    });
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883") {
        throw new Error(
          "A atualização de segurança dos pacotes ainda não está disponível neste ambiente.",
        );
      }
      // A RPC faz a última verificação tenant/RLS/preços e o rollback completo.
      throw new Error(error.message);
    }
    if (!z.string().uuid().safeParse(pacoteId).success) {
      throw new Error("O banco não confirmou o salvamento do pacote.");
    }
    return { ok: true, id: pacoteId };
  });
