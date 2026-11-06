/**
 * Lista de espera dentro da Agenda (dono, 06/11/2026: "coloque a sugestão que achar melhor"). Regras puras: quem
 * aparece em cada dia e como a oferta em andamento é descrita. A decisão de oferecer continua só em `ofertarVaga`.
 */

export type PessoaNaEspera = {
  id: string;
  posicao: number;
  cliente: string;
  servico: string | null;
  profissional: string | null;
  /** Dia desejado (AAAA-MM-DD) ou `null` = qualquer dia. */
  dia: string | null;
  janelaInicio: number | null;
  janelaFim: number | null;
  oferta: { inicio: string; expiraEm: string } | null;
};

/**
 * Quem conta para um dia da Agenda: quem pediu aquele dia; em hoje, também quem aceita qualquer dia (é hoje que uma
 * vaga liberada pode virar atendimento). Mostrar "qualquer dia" em todos os dias seria ruído.
 */
export function esperaDoDia(pessoas: readonly PessoaNaEspera[], dia: string, hoje: string) {
  return pessoas.filter((p) => p.dia === dia || (p.dia === null && dia === hoje));
}

/** Período desejado em texto curto ("tarde", "9h–12h", "qualquer horário"). */
export function periodoDaPessoa(p: Pick<PessoaNaEspera, "janelaInicio" | "janelaFim">) {
  if (p.janelaInicio === null || p.janelaFim === null) return "qualquer horário";
  if (p.janelaInicio >= 5 && p.janelaFim <= 12) return "manhã";
  if (p.janelaInicio >= 12 && p.janelaFim <= 18) return "tarde";
  if (p.janelaInicio >= 17) return "noite";
  return `${p.janelaInicio}h–${p.janelaFim}h`;
}

/** Minutos que faltam para a oferta expirar (0 se já passou). */
export function minutosParaExpirar(expiraEm: string, agora: number) {
  return Math.max(0, Math.ceil((Date.parse(expiraEm) - agora) / 60_000));
}

/** "Oferecida à Carla · responde até 10:30" — a linha discreta do cartão liberado. */
export function linhaDaOferta(cliente: string, expiraEmHora: string) {
  const primeiro = cliente.trim().split(/\s+/)[0] || "cliente";
  return `Oferecida a ${primeiro} · responde até ${expiraEmHora}`;
}
