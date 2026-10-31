/**
 * Lê do banco o retrato `flow/v1` de um negócio: nome, endereço, link de agendar, serviços com preço do catálogo e
 * horário do dia (semana + horário especial + intervalo da data), tudo no fuso do negócio.
 */
import type { Realidade } from "./nucleo/contratos";
import { montarRealidade } from "./realidade";
import { intervalosPersonalizadosPorData, regrasDaBarbearia } from "@/lib/agenda-regras.server";
import { diaEMinutoNoFuso } from "@/lib/disponibilidade";
import { somarDias } from "@/lib/horarios";
import { urlPublica } from "@/lib/origem-publica";

export async function realidadeDoNegocio(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente Supabase do servidor
  db: any,
  tenantId: string,
  agora: number,
): Promise<Realidade> {
  const [regras, { data: tenant, error: erroTenant }, { data: servicos, error: erroServicos }] =
    await Promise.all([
      regrasDaBarbearia(db, tenantId),
      db.from("tenants").select("nome, slug, endereco").eq("id", tenantId).maybeSingle(),
      db
        .from("servicos")
        .select("nome, preco_centavos")
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome"),
    ]);
  // Sem os dados oficiais o bot não responde: nunca inventa nem responde com retrato pela metade.
  if (erroTenant || !tenant) throw new Error("Não foi possível ler o negócio para o bot.");
  if (erroServicos) throw new Error("Não foi possível ler os serviços para o bot.");
  const { dia, minuto } = diaEMinutoNoFuso(agora, regras.fuso);
  // Ontem (virada da noite) até 14 dias à frente (próxima abertura).
  const intervalosPorData = await intervalosPersonalizadosPorData(
    db,
    tenantId,
    somarDias(dia, -1),
    somarDias(dia, 14),
  );
  return montarRealidade({
    nome: String(tenant.nome),
    endereco: (tenant.endereco as string | null) ?? null,
    linkDeAgendar: urlPublica(`/agendar/${String(tenant.slug)}`),
    servicos: (servicos ?? []) as { nome: string; preco_centavos: number }[],
    dia,
    minuto,
    agenda: { horarios: regras.horarios, intervalosPorData },
  });
}
