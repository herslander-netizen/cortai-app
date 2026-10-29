/**
 * Escolha de cliente na tela (pop-up de homônimos).
 *
 * Quando a busca por nome devolve mais de um cliente, a Flow IA não chuta: a tela mostra as
 * opções e a pessoa toca em uma. O toque manda o ID do cliente; o servidor confere que ele é
 * deste negócio e a política de execução direta passa a tratar esse cliente como resolvido.
 *
 * Segurança: o nome do cliente é dado de terceiros (pode ter sido digitado por um visitante),
 * então NUNCA entra na instrução enviada ao modelo — só o ID, já validado.
 */
export type OpcaoDeEscolha = {
  tipo: "cliente";
  id: string;
  rotulo: string;
  /** Algo que diferencia homônimos, ex.: "final 4321". */
  detalhe: string | null;
};

export type ClienteEscolhido = { id: string; nome: string; telefoneFinal: string | null };

type Candidato = { id?: unknown; nome?: unknown; telefoneFinal?: unknown };

/** Opções para a tela a partir do resultado de `buscar_cliente_por_nome` (só se há mais de um). */
export function opcoesDeClientes(resultado: unknown): OpcaoDeEscolha[] {
  const clientes = (resultado as { clientes?: unknown } | null)?.clientes;
  if (!Array.isArray(clientes) || clientes.length < 2) return [];
  return (clientes as Candidato[])
    .filter((c) => typeof c.id === "string" && typeof c.nome === "string")
    .slice(0, 6)
    .map((c) => ({
      tipo: "cliente" as const,
      id: c.id as string,
      rotulo: (c.nome as string).slice(0, 80),
      detalhe:
        typeof c.telefoneFinal === "string" && c.telefoneFinal ? `final ${c.telefoneFinal}` : null,
    }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O cliente existe, não está arquivado e é DESTE negócio? Devolve null se não. */
export async function validarClienteEscolhido(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente de banco encadeável
  db: { from: (tabela: "clientes") => any },
  tenantId: string,
  id: string,
): Promise<ClienteEscolhido | null> {
  if (!UUID.test(id)) return null;
  const { data } = await db
    .from("clientes")
    .select("id, nome, telefone")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .is("arquivado_em", null)
    .maybeSingle();
  const c = data as { id: string; nome: string | null; telefone: string | null } | null;
  if (!c || !c.nome) return null;
  return {
    id: c.id,
    nome: c.nome,
    telefoneFinal: c.telefone ? c.telefone.replace(/\D/g, "").slice(-4) || null : null,
  };
}

/** Texto que o modelo recebe junto da mensagem: só o ID validado, nunca o nome. */
export function mensagemComEscolha(mensagem: string, clienteId: string): string {
  return `${mensagem}\n\n[Escolha confirmada pelo usuário na tela: o cliente é o de id ${clienteId}. Use exatamente este id em criar_agendamento e não busque o cliente de novo.]`;
}
