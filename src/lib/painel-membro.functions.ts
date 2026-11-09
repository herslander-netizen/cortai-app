import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assinarFoto } from "@/lib/fotos.server";
import { exigirPermissao, tenantIdDoMembro } from "@/lib/tenant";
import type { MembroDaEquipe } from "@/lib/equipe.functions";

const UUID = z.string().uuid();
const PAGINA = 500;

/**
 * Ficha de um membro da equipe com ligação EXPLÍCITA ao cadastro de profissional.
 * Contas do Flow e profissionais da agenda são entidades distintas:
 * não relacionar por nome, telefone ou e-mail.
 */
export const getFichaCompletaDoMembro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((entrada: unknown) => z.object({ userId: UUID }).parse(entrada))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "gerenciar_permissoes");

    const { data: acessos, error: erroAcessos } = await context.supabase.rpc(
      "equipe_do_tenant",
      { _tenant_id: tenantId },
    );
    if (erroAcessos) throw new Error("Não foi possível consultar a equipe deste negócio.");

    const linha = (acessos ?? []).find(
      (item: Record<string, unknown>) => item["user_id"] === data.userId,
    ) as Record<string, unknown> | undefined;
    if (!linha) throw new Error("Esse membro não pertence à equipe do negócio.");

    const membro: MembroDaEquipe = {
      userId: data.userId,
      nome: (linha["nome"] as string | null) ?? null,
      email: (linha["email"] as string | null) ?? null,
      papel: String(linha["papel"] ?? ""),
      permissoes: (linha["permissoes"] as string[] | null) ?? [],
      ativo: linha["ativo"] === true,
      criadoEm: String(linha["criado_em"] ?? ""),
      aceitoEm: (linha["aceito_em"] as string | null) ?? null,
    };

    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: perfis, error: erroPerfis } = await db
      .from("profissionais")
      .select("id, nome, ativo, descricao, avatar_url")
      .eq("tenant_id", tenantId)
      .eq("user_id", data.userId)
      .order("criado_em")
      .limit(2);
    if (erroPerfis) throw new Error("Não foi possível consultar os perfis de atendimento.");

    if ((perfis ?? []).length > 1) {
      return {
        membro,
        profissional: null,
        vinculo: "multiplo" as const,
        metricas: null,
        servicos: [],
        disponibilidade: [],
      };
    }
    const profissional = perfis?.[0] ?? null;
    if (!profissional) {
      return {
        membro,
        profissional: null,
        vinculo: "ausente" as const,
        metricas: null,
        servicos: [],
        disponibilidade: [],
      };
    }

    const [
      contagem,
      listaServicos,
      escala,
      horarioNegocio,
      imagem,
    ] = await Promise.all([
      db.from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("profissional_id", profissional.id)
        .eq("status", "finalizado"),
      db.from("servicos")
        .select("id, nome, duracao_min, preco_centavos, profissional_ids")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("ordem"),
      db.from("escalas_de_profissional")
        .select("dia_semana, trabalha, abre, fecha")
        .eq("tenant_id", tenantId)
        .eq("profissional_id", profissional.id),
      db.from("horarios_de_funcionamento")
        .select("dia_semana, fechado, abre, fecha")
        .eq("tenant_id", tenantId),
      assinarFoto(db, profissional.avatar_url),
    ]);

    if (contagem.error || listaServicos.error || escala.error || horarioNegocio.error)
      throw new Error("Não foi possível carregar todos os dados do profissional.");

    // Consultas paginadas: não truncar a receita ou a média ao limite de 1.000 linhas do Supabase.
    let receitaConfirmadaCentavos = 0;
    for (let de = 0; ; de += PAGINA) {
      const { data: pagamentos, error } = await db
        .from("agendamentos")
        .select("id, valor_centavos")
        .eq("tenant_id", tenantId)
        .eq("profissional_id", profissional.id)
        .eq("status", "finalizado")
        .not("pagamento_confirmado_em", "is", null)
        .order("id")
        .range(de, de + PAGINA - 1);
      if (error) throw new Error("Não foi possível calcular os pagamentos confirmados.");
      for (const pagamento of pagamentos ?? []) {
        receitaConfirmadaCentavos += pagamento.valor_centavos ?? 0;
      }
      if ((pagamentos ?? []).length < PAGINA) break;
    }

    let somaNotas = 0;
    let totalNotas = 0;
    for (let de = 0; ; de += PAGINA) {
      const { data: notas, error } = await db
        .from("avaliacoes")
        .select("id, nota")
        .eq("tenant_id", tenantId)
        .eq("profissional_id", profissional.id)
        .order("id")
        .range(de, de + PAGINA - 1);
      if (error) throw new Error("Não foi possível carregar as avaliações.");
      for (const avaliacao of notas ?? []) {
        somaNotas += avaliacao.nota;
        totalNotas++;
      }
      if ((notas ?? []).length < PAGINA) break;
    }

    const servicos = (listaServicos.data ?? [])
      .filter((servico) => !servico.profissional_ids?.length ||
        servico.profissional_ids.includes(profissional.id))
      .map((servico) => ({
        id: servico.id,
        nome: servico.nome,
        duracaoMin: servico.duracao_min,
        precoCentavos: servico.preco_centavos,
        equipeToda: !servico.profissional_ids?.length,
      }));

    const disponibilidade = Array.from({ length: 7 }, (_, diaSemana) => {
      const ajuste = escala.data?.find((x) => x.dia_semana === diaSemana);
      const base = horarioNegocio.data?.find((x) => x.dia_semana === diaSemana);
      if (ajuste) return {
        diaSemana,
        fonte: "individual" as const,
        trabalha: ajuste.trabalha,
        abre: ajuste.abre ? String(ajuste.abre).slice(0, 5) : null,
        fecha: ajuste.fecha ? String(ajuste.fecha).slice(0, 5) : null,
      };
      return {
        diaSemana,
        fonte: "negocio" as const,
        trabalha: base ? !base.fechado : false,
        abre: base?.abre ? String(base.abre).slice(0, 5) : null,
        fecha: base?.fecha ? String(base.fecha).slice(0, 5) : null,
      };
    });

    return {
      membro,
      profissional: {
        id: profissional.id,
        nome: profissional.nome,
        descricao: profissional.descricao,
        ativo: profissional.ativo,
        foto: imagem,
      },
      vinculo: "unico" as const,
      metricas: {
        agendamentosFinalizados: contagem.count ?? 0,
        receitaConfirmadaCentavos,
        avaliacoes: totalNotas,
        mediaAvaliacao: totalNotas ? somaNotas / totalNotas : null,
      },
      servicos,
      disponibilidade,
    };
  });
