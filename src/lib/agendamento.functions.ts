import { createServerFn } from "@tanstack/react-start";

export type Ocupado = { profissional_id: string | null; inicio: string; fim: string };

export type DadosAgendar = {
  tenant: { id: string; nome: string; rotulo_carteira: string | null };
  cliente: { id: string; nome: string; limite_fiado_centavos: number };
  clientes: { id: string; nome: string }[];
  servicos: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
  profissionais: { id: string; nome: string }[];
  carteira: { saldo_creditos: number; saldo_centavos: number; fidelidade_progresso: number };
  regras: { tipo: string; ativo: boolean; bloqueia_agendamento_no_limite: boolean; fidelidade_alvo: number | null }[];
  ocupados: Ocupado[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getDadosAgendar = createServerFn({ method: "GET" })
  .inputValidator((data: { clienteId?: string | undefined }) => data ?? {})
  .handler(async ({ data }): Promise<DadosAgendar> => {
    const db = await admin();

    const { data: tenant } = await db
      .from("tenants")
      .select("id, nome, rotulo_carteira")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!tenant) throw new Error("Nenhuma barbearia cadastrada");

    const [clientesRes, servicosRes, profRes, regrasRes] = await Promise.all([
      db.from("clientes").select("id, nome, limite_fiado_centavos").eq("tenant_id", tenant.id).order("nome"),
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
    ]);

    const clientes = clientesRes.data ?? [];
    const cliente = clientes.find((c) => c.id === data.clienteId) ?? clientes[0];
    if (!cliente) throw new Error("Nenhum cliente cadastrado");

    const { data: carteira } = await db
      .from("carteiras")
      .select("saldo_creditos, saldo_centavos, fidelidade_progresso")
      .eq("cliente_id", cliente.id)
      .maybeSingle();

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
      clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
      servicos: servicosRes.data ?? [],
      profissionais: profRes.data ?? [],
      carteira: carteira ?? { saldo_creditos: 0, saldo_centavos: 0, fidelidade_progresso: 0 },
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
  .inputValidator(
    (data: {
      tenantId: string;
      clienteId: string;
      profissionalId: string;
      servicoId: string;
      inicio: string;
      formaPagamento: "credito" | "pix" | "balcao" | "fiado";
    }) => data,
  )
  .handler(async ({ data }): Promise<ResultadoAgendamento> => {
    const db = await admin();
    const { data: res, error } = await db.rpc("criar_agendamento", {
      _tenant_id: data.tenantId,
      _cliente_id: data.clienteId,
      _profissional_id: data.profissionalId,
      _servico_id: data.servicoId,
      _inicio: data.inicio,
      _forma_pagamento: data.formaPagamento,
    });
    if (error) throw new Error(traduz(error.message));
    return res as unknown as ResultadoAgendamento;
  });

export const cancelarAgendamento = createServerFn({ method: "POST" })
  .inputValidator((data: { agendamentoId: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: res, error } = await db.rpc("cancelar_agendamento", { _agendamento_id: data.agendamentoId });
    if (error) throw new Error(traduz(error.message));
    return res as unknown as { devolvido: boolean; saldo_creditos: number; saldo_centavos: number };
  });

export const marcarFalta = createServerFn({ method: "POST" })
  .inputValidator((data: { agendamentoId: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.rpc("marcar_falta", { _agendamento_id: data.agendamentoId });
    if (error) throw new Error(traduz(error.message));
    return { ok: true };
  });

export const listarAgendamentosCliente = createServerFn({ method: "GET" })
  .inputValidator((data: { clienteId: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows } = await db
      .from("agendamentos")
      .select("id, inicio, fim, status, forma_pagamento, valor_centavos, servicos(nome), profissionais(nome)")
      .eq("cliente_id", data.clienteId)
      .order("inicio", { ascending: false })
      .limit(30);
    return rows ?? [];
  });

function traduz(msg: string): string {
  if (msg.includes("limite de fiado")) return "O limite de fiado foi atingido.";
  if (msg.includes("sem creditos")) return "Você não tem créditos disponíveis.";
  if (msg.includes("horario ja ocupado")) return "Esse horário acabou de ser ocupado.";
  return msg;
}
