/**
 * Próximo dia com atendimento depois de uma data (dono, 06/11/2026: "o Ver mais aparece sem ser necessário"). A lista
 * da Agenda só mostra "Ver mais dias" quando existe algo à frente, e diz qual é o próximo dia.
 *
 * Mesmo acesso de `getAgendaPeriodo` (membro do negócio; banco privilegiado com filtro de negócio à mão). Fica num
 * arquivo próprio porque `barbeiro.functions.ts` está reservado em "Em andamento".
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fusoDoTenant } from "@/lib/fuso.server";
import { isoNoFusoDaBarbearia } from "@/lib/horarios";
import { tenantIdDoMembro } from "@/lib/tenant";

/** Estados que a lista mostra por padrão (cancelados, faltas e remarcados ficam recolhidos). */
const ATIVOS = ["agendado", "chegou", "na_cadeira", "finalizado"] as const;

/** Dia (AAAA-MM-DD) de um instante no fuso do negócio. */
export function diaNoFusoDoNegocio(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export const getProximoDiaDaAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { depoisDe: string; profissionalId?: string | null | undefined }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.depoisDe)) throw new Error("Dia inválido");
    const prof = data.profissionalId ?? null;
    if (prof !== null && !/^[0-9a-f-]{36}$/i.test(prof)) throw new Error("Profissional inválido");
    return { depoisDe: data.depoisDe, profissionalId: prof };
  })
  .handler(async ({ data, context }): Promise<{ dia: string | null }> => {
    const tenantId = await tenantIdDoMembro(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const fuso = await fusoDoTenant(tenantId);
    const desde = isoNoFusoDaBarbearia(data.depoisDe, "00:00", fuso);
    let consulta = db
      .from("agendamentos")
      .select("inicio")
      .eq("tenant_id", tenantId)
      .in("status", [...ATIVOS])
      .gte("inicio", new Date(desde).toISOString())
      .order("inicio")
      .limit(1);
    if (data.profissionalId) consulta = consulta.eq("profissional_id", data.profissionalId);
    const { data: linhas, error } = await consulta;
    // Falha de leitura não esconde nada: quem chama mantém "Ver mais dias" visível.
    if (error) throw new Error("Não foi possível conferir os próximos dias.");
    const inicio = linhas?.[0]?.inicio;
    return { dia: inicio ? diaNoFusoDoNegocio(inicio, fuso) : null };
  });
