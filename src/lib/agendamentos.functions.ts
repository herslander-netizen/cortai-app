import { createServerFn } from "@tanstack/react-start";
import { inicioDoDiaNoFuso, inicioDoMesNoFuso } from "@/lib/horarios";
import { fusoDoTenant } from "@/lib/fuso.server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { exigirPermissao, tenantIdDoMembro, type ContextoAutenticado } from "@/lib/tenant";

export type AgendamentoConfirmado = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  clienteNome: string;
  telefone: string | null;
  servico: string | null;
  profissional: string | null;
  valorCentavos: number | null;
  origem: string | null;
};

// Estados oficiais (CHECK do banco): agendado, chegou, na_cadeira, finalizado + excepcionais.
const ATIVOS = ["agendado", "chegou", "na_cadeira"];

/**
 * Lista os agendamentos confirmados (ativos) da barbearia do usuário — com nome,
 * WhatsApp e horário. Sempre pelo vínculo real, nunca por id vindo da tela.
 */
export const listarAgendamentosConfirmados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ periodo: z.enum(["hoje", "proximos", "passados"]).default("proximos") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AgendamentoConfirmado[]> => {
    const ctx = context as unknown as ContextoAutenticado;
    const tenantId = await tenantIdDoMembro(ctx);
    await exigirPermissao(ctx, tenantId, "visualizar_clientes");
    const db = ctx.supabase;

    const agora = new Date();
    const inicioDeHoje = inicioDoDiaNoFuso(await fusoDoTenant(tenantId), agora);
    const fimDeHoje = new Date(inicioDeHoje.getTime() + 24 * 60 * 60 * 1000);

    let consulta = db
      .from("agendamentos")
      .select(
        "id, inicio, fim, status, valor_centavos, origem, clientes(nome, telefone), servicos(nome), profissionais(nome)",
      )
      .eq("tenant_id", tenantId)
      .in("status", data.periodo === "passados" ? [...ATIVOS, "finalizado"] : ATIVOS);

    if (data.periodo === "hoje") {
      consulta = consulta
        .gte("inicio", inicioDeHoje.toISOString())
        .lt("inicio", fimDeHoje.toISOString())
        .order("inicio");
    } else if (data.periodo === "proximos") {
      consulta = consulta.gte("inicio", agora.toISOString()).order("inicio").limit(100);
    } else {
      consulta = consulta
        .lt("inicio", agora.toISOString())
        .order("inicio", { ascending: false })
        .limit(50);
    }

    const { data: linhas, error } = await consulta;
    if (error) throw new Error("Não consegui carregar os agendamentos agora.");

    return (linhas ?? []).map((a: any) => ({
      id: a.id as string,
      inicio: a.inicio as string,
      fim: a.fim as string,
      status: a.status as string,
      clienteNome: (a.clientes?.nome as string) ?? "Cliente",
      telefone: (a.clientes?.telefone as string) ?? null,
      servico: (a.servicos?.nome as string) ?? null,
      profissional: (a.profissionais?.nome as string) ?? null,
      valorCentavos: (a.valor_centavos as number) ?? null,
      origem: (a.origem as string) ?? null,
    }));
  });
