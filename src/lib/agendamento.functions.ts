import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clienteDoUsuario } from "@/lib/cliente";

export type Ocupado = { profissional_id: string | null; inicio: string; fim: string };

export type DadosAgendar = {
  tenant: { id: string; nome: string; rotulo_carteira: string | null };
  cliente: { id: string; nome: string; limite_fiado_centavos: number };
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
  profissionais: { id: string; nome: string }[];
  carteira: { saldo_creditos: number; saldo_centavos: number; fidelidade_progresso: number };
  regras: { tipo: string; ativo: boolean; bloqueia_agendamento_no_limite: boolean; fidelidade_alvo: number | null }[];
  ocupados: Ocupado[];
};

export const getDadosAgendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clienteId?: string | undefined }) => data ?? {})
  .handler(async ({ context }): Promise<DadosAgendar> => {
    const { db, tenant, cliente } = await clienteDoUsuario(context);

    const [servicosRes, profRes, regrasRes, carteiraRes] = await Promise.all([
      db
        .from("servicos")
        .select("id, nome, duracao_min, preco_centavos")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem"),
      db.from("profissionais").select("id, nome").eq("tenant_id", tenant.id).eq("ativo", true).order("nome"),
      db
        .from("regras_de_plano")
        .select("tipo, ativo, bloqueia_agendamento_no_limite, fidelidade_alvo")
        .eq("tenant_id", tenant.id),
      db
        .from("carteiras")
        .select("saldo_creditos, saldo_centavos, fidelidade_progresso")
        .eq("cliente_id", cliente.id)
        .maybeSingle(),
    ]);

    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    const ate = new Date(desde.getTime() + 21 * 24 * 60 * 60 * 1000);
    const { data: ocupados } = await db
      .from("agendamentos")
      .select("profissional_id, inicio, fim")
      .eq("tenant_id", tenant.id)
      .gte("inicio", desde.toISOString())
      .lte("inicio", ate.toISOString())
      .not("status", "in", "(cancelado,falta)");

    return {
      tenant,
      cliente,
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      carteira: carteiraRes.data ?? { saldo_creditos: 0, saldo_centavos: 0, fidelidade_progresso: 0 },
      regras: regrasRes.data ?? [],
      ocupados: ocupados ?? [],
    };
  });

export type ResultadoAgendamento = {
  agendamento_id: string;
  inicio: string;
  fim: string;
  forma_pagamento: string;
  valor_centavos: number;
  saldo_creditos: number;
  saldo_centavos: number;
  fidelidade_progresso: number;
  fidelidade_alvo: number | null;
};

export const criarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      tenantId?: string;
      clienteId?: string;
      profissionalId: string;
      servicoId: string;
      inicio: string;
      formaPagamento: "credito" | "pix" | "balcao" | "fiado";
    }) => data,
  )
  .handler(async ({ data, context }): Promise<ResultadoAgendamento> => {
    // A barbearia e o cliente vêm sempre da sessão, nunca do que a tela enviou.
    const { db, tenant, cliente } = await clienteDoUsuario(context);
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: tenant.id,
      _cliente_id: cliente.id,
      _profissional_id: data.profissionalId,
      _servico_id: data.servicoId,
      _inicio: data.inicio,
      _forma_pagamento: data.formaPagamento,
    });
    if (error) throw new Error(traduz(error.message));
    return res as unknown as ResultadoAgendamento;
  });

export const cancelarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { agendamentoId: string }) => data)
  .handler(async ({ data, context }) => {
    const { db, cliente } = await clienteDoUsuario(context);
    const { data: ag } = await db
      .from("agendamentos")
      .select("id")
      .eq("id", data.agendamentoId)
      .eq("cliente_id", cliente.id)
      .maybeSingle();
    if (!ag) throw new Error("Esse agendamento não é seu.");
    const { data: res, error } = await db.rpc("cancelar_agendamento", { _agendamento_id: data.agendamentoId });
    if (error) throw new Error(traduz(error.message));
    return res as unknown as { devolvido: boolean; saldo_creditos: number; saldo_centavos: number };
  });

export type AgendamentoCliente = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  forma_pagamento: string | null;
  valor_centavos: number;
  servicos: { nome: string } | null;
  profissionais: { nome: string } | null;
};

export const listarAgendamentosCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clienteId?: string | undefined }) => data ?? {})
  .handler(async ({ context }): Promise<AgendamentoCliente[]> => {
    const { db, cliente } = await clienteDoUsuario(context);
    const { data: rows } = await db
      .from("agendamentos")
      .select("id, inicio, fim, status, forma_pagamento, valor_centavos, servicos(nome), profissionais(nome)")
      .eq("cliente_id", cliente.id)
      .order("inicio", { ascending: false })
      .limit(30);
    return (rows ?? []) as AgendamentoCliente[];
  });

function traduz(msg: string): string {
  if (msg.includes("limite de fiado")) return "O limite de fiado foi atingido.";
  if (msg.includes("sem creditos")) return "Você não tem créditos disponíveis.";
  if (msg.includes("horario ja ocupado")) return "Esse horário acabou de ser ocupado.";
  return msg;
}
