import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clienteDoUsuario } from "@/lib/cliente";

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
  carteira: { saldo_creditos: number; saldo_centavos: number; fidelidade_progresso: number };
  fidelidade: { ativo: boolean; alvo: number | null };
  movimentos: Movimento[];
};

export const getCarteira = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { slug?: string | undefined }) => data ?? {})
  .handler(async ({ data, context }): Promise<DadosCarteira> => {
    const { db, tenant, cliente } = await clienteDoUsuario(context, { slug: data.slug ?? null });

    const { data: carteira } = await db
      .from("carteiras")
      .select("id, saldo_creditos, saldo_centavos, fidelidade_progresso")
      .eq("cliente_id", cliente.id)
      .maybeSingle();

    const { data: personalizacao } = await db
      .from("clientes")
      .select("fidelidade_participa")
      .eq("id", cliente.id)
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
      carteira: carteira
        ? {
            saldo_creditos: carteira.saldo_creditos,
            saldo_centavos: carteira.saldo_centavos,
            fidelidade_progresso: carteira.fidelidade_progresso,
          }
        : { saldo_creditos: 0, saldo_centavos: 0, fidelidade_progresso: 0 },
      fidelidade: (() => {
        // A escolha individual do cliente sobrescreve o padrão da barbearia.
        const ativo = personalizacao?.fidelidade_participa ?? regra?.ativo ?? false;
        return { ativo, alvo: ativo ? (regra?.fidelidade_alvo ?? null) : null };
      })(),
      movimentos,
    };
  });
