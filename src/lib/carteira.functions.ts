import { createServerFn } from "@tanstack/react-start";

export type Movimento = {
  id: string;
  tipo: string;
  descricao: string | null;
  creditos_delta: number;
  centavos_delta: number;
  criado_em: string;
};

export type DadosCarteira = {
  tenant: { id: string; nome: string; rotulo_carteira: string | null };
  cliente: { id: string; nome: string; limite_fiado_centavos: number };
  clientes: { id: string; nome: string }[];
  carteira: { saldo_creditos: number; saldo_centavos: number; fidelidade_progresso: number };
  fidelidade: { ativo: boolean; alvo: number | null };
  movimentos: Movimento[];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getCarteira = createServerFn({ method: "GET" })
  .inputValidator((data: { clienteId?: string | undefined }) => data ?? {})
  .handler(async ({ data }): Promise<DadosCarteira> => {
    const db = await admin();

    const { data: tenant } = await db
      .from("tenants")
      .select("id, nome, rotulo_carteira")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!tenant) throw new Error("Nenhuma barbearia cadastrada");

    const { data: clientes } = await db
      .from("clientes")
      .select("id, nome, limite_fiado_centavos")
      .eq("tenant_id", tenant.id)
      .order("nome");

    const lista = clientes ?? [];
    const cliente = lista.find((c) => c.id === data.clienteId) ?? lista[0];
    if (!cliente) throw new Error("Nenhum cliente cadastrado");

    const { data: carteira } = await db
      .from("carteiras")
      .select("id, saldo_creditos, saldo_centavos, fidelidade_progresso")
      .eq("cliente_id", cliente.id)
      .maybeSingle();

    const { data: regra } = await db
      .from("regras_de_plano")
      .select("ativo, fidelidade_alvo")
      .eq("tenant_id", tenant.id)
      .eq("tipo", "fidelidade")
      .maybeSingle();

    let movimentos: Movimento[] = [];
    if (carteira) {
      const { data: movs } = await db
        .from("movimentos")
        .select("id, tipo, descricao, creditos_delta, centavos_delta, criado_em")
        .eq("carteira_id", carteira.id)
        .order("criado_em", { ascending: false })
        .limit(50);
      movimentos = movs ?? [];
    }

    return {
      tenant,
      cliente,
      clientes: lista.map((c) => ({ id: c.id, nome: c.nome })),
      carteira: carteira
        ? {
            saldo_creditos: carteira.saldo_creditos,
            saldo_centavos: carteira.saldo_centavos,
            fidelidade_progresso: carteira.fidelidade_progresso,
          }
        : { saldo_creditos: 0, saldo_centavos: 0, fidelidade_progresso: 0 },
      fidelidade: { ativo: regra?.ativo ?? false, alvo: regra?.fidelidade_alvo ?? null },
      movimentos,
    };
  });
