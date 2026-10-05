import { ValorAnimado } from "@/components/painel/ValorAnimado";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaDia, AgendaItem } from "@/lib/barbeiro.functions";

import { contarLivres, resumoOperacional } from "./tempo";

export function ResumoDia({
  itens,
  horarios,
  dia,
  fuso,
  passoMin,
  profissionalIds,
  ehHoje,
  fila: _fila,
  rotuloAtendimento: _rotuloAtendimento,
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
    <span key="atendimento">
      <ValorAnimado valor={r.emAtendimento} formatar={String} primeiraCarga /> em atendimento
    </span>,
    <span key="feitos">
      <ValorAnimado valor={r.finalizados} formatar={String} primeiraCarga /> concluídos
    </span>,
    <span key="livres">
      <ValorAnimado valor={livres} formatar={String} primeiraCarga /> horários livres
    </span>,
  ];
  return (
    <>
      {partes.map((parte, indice) => (
        <span key={parte.key}>
          {indice ? " · " : ""}
          {parte}
        </span>
      ))}
    </>
  );
}
