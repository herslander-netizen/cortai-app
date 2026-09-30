import { useAgora } from "@/hooks/useAgora";
import type { AgendaDia, AgendaItem } from "@/lib/barbeiro.functions";

import { contarLivres, resumoOperacional } from "./tempo";

/** Resumo em uma linha: a fazer · em atendimento · feitos · livres · fila. */
export function ResumoDia({
  itens,
  horarios,
  dia,
  fuso,
  passoMin,
  profissionalIds,
  ehHoje,
  fila,
  rotuloAtendimento,
}: {
  itens: AgendaItem[];
  horarios: AgendaDia["horarios"];
  dia: string;
  fuso: string;
  passoMin: number;
  profissionalIds: string[];
  ehHoje: boolean;
  fila: number;
  rotuloAtendimento: string;
}) {
  const agora = useAgora();
  const r = resumoOperacional(itens);
  const livres = contarLivres({ horarios, dia, fuso, itens, profissionalIds, passoMin, agora, ehHoje });
  const partes = [
    `${r.aFazer} a fazer`,
    r.emAtendimento ? `${r.emAtendimento} ${rotuloAtendimento.toLocaleLowerCase("pt-BR")}` : null,
    r.finalizados ? `${r.finalizados} ${r.finalizados === 1 ? "feito" : "feitos"}` : null,
    `${livres} ${livres === 1 ? "horário livre" : "horários livres"}`,
    fila ? `${fila} na fila` : null,
  ].filter(Boolean);
  return <>{partes.join(" · ")}</>;
}
