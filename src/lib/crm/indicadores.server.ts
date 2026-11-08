/** Serviço interno do CRM; o chamador valida a permissão e este serviço valida o plano. */
import { exigirRecurso } from "@/lib/planos";
import { fusoDoTenant } from "@/lib/fuso.server";
import { calcularIndicadoresCRM } from "./indicadores";
const LOTE = 500;
const MAX_LOTES = 40;
export async function consultarIndicadoresCRMDoTenant(tenantId: string) {
  if (!tenantId?.trim()) throw new Error("Negócio inválido para o CRM.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin;
  await exigirRecurso(db, tenantId, "crescimento");
    // Paginação estável: nunca apresentar uma amostra truncada como total real.
    const carregarClientes = async () => {
      const todos: { id: string; criadoEm: string }[] = [];
      for (let i = 0; i < MAX_LOTES; i += 1) {
        const { data, error } = await db.from("clientes")
          .select("id, criado_em")
          .eq("tenant_id", tenantId)
          .is("arquivado_em", null)
          .order("id")
          .range(i * LOTE, (i + 1) * LOTE - 1);
        if (error) throw new Error("Não foi possível carregar os clientes do CRM.");
        for (const item of data ?? []) todos.push({ id: item.id, criadoEm: item.criado_em });
        if ((data?.length ?? 0) < LOTE) return todos;
      }
      throw new Error("O CRM precisa de agregação paginada para este volume de clientes.");
    };

    const carregarFinalizados = async () => {
      const todos: { clienteId: string | null; inicio: string; status: string }[] = [];
      for (let i = 0; i < MAX_LOTES; i += 1) {
        const { data, error } = await db.from("agendamentos")
          .select("id, cliente_id, inicio, status")
          .eq("tenant_id", tenantId)
          .eq("status", "finalizado")
          .order("id")
          .range(i * LOTE, (i + 1) * LOTE - 1);
        if (error) throw new Error("Não foi possível carregar os atendimentos do CRM.");
        for (const item of data ?? []) {
          todos.push({ clienteId: item.cliente_id, inicio: item.inicio, status: item.status });
        }
        if ((data?.length ?? 0) < LOTE) return todos;
      }
      throw new Error("O CRM precisa de agregação paginada para este volume de atendimentos.");
    };

    const [clientes, atendimentos, fuso] = await Promise.all([
      carregarClientes(),
      carregarFinalizados(),
      fusoDoTenant(tenantId),
    ]);
    return calcularIndicadoresCRM(clientes, atendimentos, new Date(), fuso);
}
