export type DestinoDaReserva = "profissional" | "data" | "horario" | "dados";
export type AvancoDaReserva = DestinoDaReserva | "servico";

export function destinoDoAvanco(
  avanco: AvancoDaReserva,
  temProfissionais: boolean,
): DestinoDaReserva {
  return avanco === "servico" ? (temProfissionais ? "profissional" : "data") : avanco;
}

export function atalhoDaReserva(
  temServico: boolean,
  temAgenda: boolean,
  temHorario: boolean,
): "horario" | "data" | null {
  if (!temServico || temHorario) return null;
  return temAgenda ? "horario" : "data";
}

export function recolherListaDeHorarios(temHorario: boolean, editando: boolean): boolean {
  return temHorario && !editando;
}

export function avisoDaDisponibilidade(
  consultaComErro: boolean,
  atualizando: boolean,
): string | null {
  if (consultaComErro) {
    return "Não foi possível atualizar os horários. Estamos tentando novamente; confira as opções antes de confirmar.";
  }
  if (atualizando) return "Estamos atualizando os horários. Aguarde e confirme novamente.";
  return null;
}
