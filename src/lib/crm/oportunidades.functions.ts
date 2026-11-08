/** Consulta autenticada de oportunidades; só leitura e sem envio de mensagens. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tenantIdDoMembro, exigirPermissao } from "@/lib/tenant";
import { exigirRecurso } from "@/lib/planos";
import { calcularOportunidadesCRM, type ClienteDoCRM, type AtendimentoConcluidoCRM, type HorarioFuturoCRM } from "./oportunidades";

const LOTE = 500;
const MAX_LOTES = 40;

export const getOportunidadesCRM = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await tenantIdDoMembro(context);
    await exigirPermissao(context, tenantId, "relatorios");
    await exigirPermissao(context, tenantId, "visualizar_clientes");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    await exigirRecurso(db, tenantId, "crescimento");
    const agora = new Date();

    async function carregarClientes(): Promise<ClienteDoCRM[]> {
      const resultado: ClienteDoCRM[] = [];
      for (let pagina = 0; pagina < MAX_LOTES; pagina++) {
        const { data, error } = await db.from("clientes")
          .select("id, nome")
          .eq("tenant_id", tenantId)
          .is("arquivado_em", null)
          .order("id")
          .range(pagina * LOTE, (pagina + 1) * LOTE - 1);
        if (error) throw new Error("Não foi possível consultar os clientes do CRM.");
        for (const c of data ?? []) resultado.push({ id: c.id, nome: c.nome });
        if ((data?.length ?? 0) < LOTE) return resultado;
      }
      throw new Error("O volume de clientes exige agregação no banco para esta análise.");
    }

    async function carregarAtendimentos(): Promise<AtendimentoConcluidoCRM[]> {
      const resultado: AtendimentoConcluidoCRM[] = [];
      for (let pagina = 0; pagina < MAX_LOTES; pagina++) {
        const { data, error } = await db.from("agendamentos")
          .select("id, cliente_id, inicio, status, servicos(nome,retorno_dias)")
          .eq("tenant_id", tenantId)
          .eq("status", "finalizado")
          .lte("inicio", agora.toISOString())
          .order("id")
          .range(pagina * LOTE, (pagina + 1) * LOTE - 1);
        if (error) throw new Error("Não foi possível consultar os atendimentos do CRM.");
        for (const a of data ?? []) {
          const servico = a.servicos as { nome?: string | null; retorno_dias?: number | null } | null;
          resultado.push({
            clienteId: a.cliente_id, inicio: a.inicio, status: a.status,
            retornoDias: servico?.retorno_dias ?? null,
            servico: servico?.nome ?? null,
          });
        }
        if ((data?.length ?? 0) < LOTE) return resultado;
      }
      throw new Error("O volume de atendimentos exige agregação no banco para esta análise.");
    }

    async function carregarFuturos(): Promise<HorarioFuturoCRM[]> {
      const resultado: HorarioFuturoCRM[] = [];
      for (let pagina = 0; pagina < MAX_LOTES; pagina++) {
        const { data, error } = await db.from("agendamentos")
          .select("id, cliente_id, inicio, status")
          .eq("tenant_id", tenantId)
          .in("status", ["agendado", "chegou", "na_cadeira"])
          .gt("inicio", agora.toISOString())
          .order("id")
          .range(pagina * LOTE, (pagina + 1) * LOTE - 1);
        if (error) throw new Error("Não foi possível consultar os horários futuros do CRM.");
        for (const a of data ?? []) {
          resultado.push({ clienteId: a.cliente_id, inicio: a.inicio, status: a.status });
        }
        if ((data?.length ?? 0) < LOTE) return resultado;
      }
      throw new Error("O volume de horários exige agregação no banco para esta análise.");
    }
    const [clientes, feitos, futuros] = await Promise.all([
      carregarClientes(), carregarAtendimentos(), carregarFuturos(),
    ]);
    return calcularOportunidadesCRM(clientes, feitos, futuros, agora);
  });
