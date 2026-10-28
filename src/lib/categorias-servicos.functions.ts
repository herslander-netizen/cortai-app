import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import { chaveCategoria, corPadraoCategoria, type CorCategoria } from "@/lib/categorias-servicos";

const corSchema = z.enum([
  "roxo",
  "azul",
  "verde",
  "rosa",
  "vermelho",
  "amarelo",
  "laranja",
  "turquesa",
  "cinza",
]);

const salvarSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  nomeAnterior: z.string().trim().min(2).max(40).nullable().optional(),
  nome: z.string().trim().min(2).max(40),
  cor: corSchema,
  ordem: z.number().int().min(0).max(500).default(0),
});

export type CategoriaDeServico = {
  id: string | null;
  nome: string;
  cor: CorCategoria;
  ordem: number;
  quantidadeServicos: number;
  sistema: boolean;
};

type CategoriaSalva = {
  id: string;
  nome: string;
  cor: CorCategoria;
  ordem: number;
};

/** Lista categorias explícitas e converte os rótulos já usados por serviços em categorias legadas. */
export const listarCategoriasServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    categorias: CategoriaDeServico[];
    persistenciaDisponivel: boolean;
  }> => {
    const tenantId = await tenantIdDoMembro(context);
    const db = context.supabase as any;
    const [categoriasResult, servicosResult] = await Promise.all([
      db
        .from("categorias_servicos")
        .select("id, nome, cor, ordem")
        .eq("tenant_id", tenantId)
        .order("ordem")
        .order("nome"),
      db.from("servicos").select("categoria").eq("tenant_id", tenantId).eq("ativo", true),
    ]);

    if (servicosResult.error) {
      throw new Error("Não foi possível carregar as categorias dos serviços.");
    }

    const contagem = new Map<string, { nome: string; quantidade: number }>();
    for (const servico of (servicosResult.data ?? []) as { categoria: string | null }[]) {
      const nome = servico.categoria?.trim() || "Outros serviços";
      const chave = chaveCategoria(nome);
      const atual = contagem.get(chave);
      contagem.set(chave, {
        nome: atual?.nome ?? nome,
        quantidade: (atual?.quantidade ?? 0) + 1,
      });
    }

    const categorias: CategoriaDeServico[] = [];
    const adicionar = (item: CategoriaDeServico) => {
      if (categorias.some((existente) => chaveCategoria(existente.nome) === chaveCategoria(item.nome))) return;
      categorias.push(item);
    };

    const totalOutros = contagem.get(chaveCategoria("Outros serviços"))?.quantidade ?? 0;
    adicionar({
      id: null,
      nome: "Outros serviços",
      cor: "cinza",
      ordem: -1,
      quantidadeServicos: totalOutros,
      sistema: true,
    });

    const metadados = Array.isArray(categoriasResult.data)
      ? (categoriasResult.data as {
          id: string;
          nome: string;
          cor: string;
          ordem: number;
        }[])
      : [];

    for (const meta of metadados) {
      const dados = contagem.get(chaveCategoria(meta.nome));
      adicionar({
        id: meta.id,
        nome: meta.nome,
        cor: corSchema.safeParse(meta.cor).success ? (meta.cor as CorCategoria) : corPadraoCategoria(meta.nome),
        ordem: meta.ordem,
        quantidadeServicos: dados?.quantidade ?? 0,
        sistema: false,
      });
    }

    const nomesLegados = [...contagem.values()]
      .filter((item) => chaveCategoria(item.nome) !== chaveCategoria("Outros serviços"))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    for (const legado of nomesLegados) {
      adicionar({
        id: null,
        nome: legado.nome,
        cor: corPadraoCategoria(legado.nome),
        ordem: 100,
        quantidadeServicos: legado.quantidade,
        sistema: false,
      });
    }

    categorias.sort((a, b) => {
      if (a.sistema) return -1;
      if (b.sistema) return 1;
      if (a.id && b.id) return a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");
      if (a.id) return -1;
      if (b.id) return 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    return {
      categorias,
      // Até a migração 0049 ser aplicada no ambiente de prévia, exibe dados legados em modo de leitura.
      persistenciaDisponivel: !categoriasResult.error,
    };
  });

/** Cria/edita a categoria e atualiza o rótulo dos serviços na mesma transação SQL. */
export const salvarCategoriaServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => salvarSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ categoria: CategoriaSalva }> => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "alterar_dados_barbearia");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: categoria, error } = await (supabaseAdmin as any).rpc("salvar_categoria_servicos", {
      _tenant_id: tenantId,
      _categoria_id: data.id ?? null,
      _nome_anterior: data.nomeAnterior ?? null,
      _nome: data.nome,
      _cor: data.cor,
      _ordem: data.ordem,
    });

    if (error) {
      if (
        error.code === "PGRST202" ||
        error.code === "42883" ||
        error.code === "42P01" ||
        /categorias_servicos|salvar_categoria_servicos/i.test(error.message ?? "")
      ) {
        throw new Error("A personalização de categorias precisa ser ativada no ambiente de prévia antes de salvar.");
      }
      if (/ja existe|already exists|duplicate/i.test(error.message ?? "")) {
        throw new Error("Já existe uma categoria com esse nome.");
      }
      if (/categoria padrao/i.test(error.message ?? "")) {
        throw new Error("A categoria padrão não pode ser personalizada.");
      }
      throw new Error("Não foi possível salvar esta categoria. Tente novamente.");
    }

    return {
      categoria: {
        id: categoria.id as string,
        nome: categoria.nome as string,
        cor: categoria.cor as CorCategoria,
        ordem: categoria.ordem as number,
      },
    };
  });
