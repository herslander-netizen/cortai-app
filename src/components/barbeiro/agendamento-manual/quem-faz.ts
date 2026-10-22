/**
 * Quem faz o quê no novo agendamento. `profissional_ids` vazio ou nulo no serviço = qualquer
 * profissional ativo faz; preenchido = só esses. Serviço e profissional nunca formam uma
 * combinação que o servidor recusaria ("Esse profissional não faz esse serviço").
 */

export type ServicoDeAgendamento = { id: string; profissional_ids?: string[] | null };
export type ProfissionalDeAgendamento = { id: string; nome: string };

export function profissionaisDoServico<P extends ProfissionalDeAgendamento>(
  servico: ServicoDeAgendamento | undefined,
  profissionais: readonly P[],
): P[] {
  const ids = servico?.profissional_ids ?? [];
  return ids.length ? profissionais.filter((p) => ids.includes(p.id)) : [...profissionais];
}

/** Só serviços que alguém ativo faz: um serviço sem ninguém não pode ser agendado. */
export function servicosAgendaveis<S extends ServicoDeAgendamento>(
  servicos: readonly S[],
  profissionais: readonly ProfissionalDeAgendamento[],
): S[] {
  return servicos.filter((s) => profissionaisDoServico(s, profissionais).length > 0);
}

/** Mantém o profissional atual se ele faz o serviço; senão, o primeiro que faz. */
export function profissionalParaOServico(
  servico: ServicoDeAgendamento | undefined,
  profissionais: readonly ProfissionalDeAgendamento[],
  atualId: string,
): string {
  const quemFaz = profissionaisDoServico(servico, profissionais);
  return quemFaz.find((p) => p.id === atualId)?.id ?? quemFaz[0]?.id ?? "";
}

/**
 * Combinação inicial: o profissional da Agenda (se houver) com o primeiro serviço que ele faz;
 * sem preferência, o primeiro serviço agendável com o primeiro profissional que o faz.
 */
export function combinacaoInicial(
  servicos: readonly ServicoDeAgendamento[],
  profissionais: readonly ProfissionalDeAgendamento[],
  profissionalPreferidoId?: string,
): { servicoId: string; profissionalId: string } {
  const agendaveis = servicosAgendaveis(servicos, profissionais);
  if (profissionalPreferidoId) {
    const dele = agendaveis.find((s) =>
      profissionaisDoServico(s, profissionais).some((p) => p.id === profissionalPreferidoId),
    );
    if (dele) return { servicoId: dele.id, profissionalId: profissionalPreferidoId };
  }
  const primeiro = agendaveis[0];
  if (!primeiro) return { servicoId: "", profissionalId: "" };
  return {
    servicoId: primeiro.id,
    profissionalId: profissionalParaOServico(primeiro, profissionais, ""),
  };
}
