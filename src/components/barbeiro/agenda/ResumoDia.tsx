import { useAgora } from "@/hooks/useAgora";
import { ValorAnimado } from "@/components/painel/ValorAnimado";
import type { ReactElement } from "react";
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
  const livres = contarLivres({
    horarios,
    dia,
    fuso,
    itens,
    profissionalIds,
    passoMin,
    agora,
    ehHoje,
  });
  const partes = [
    <span key="fazer">
      <ValorAnimado valor={r.aFazer} formatar={String} primeiraCarga /> a fazer
    </span>,
    r.emAtendimento ? (
      <span key="atendimento">
        <ValorAnimado valor={r.emAtendimento} formatar={String} primeiraCarga />{" "}
        {rotuloAtendimento.toLocaleLowerCase("pt-BR")}
      </span>
    ) : null,
    r.finalizados ? (
      <span key="feitos">
        <ValorAnimado valor={r.finalizados} formatar={String} primeiraCarga />{" "}
        {r.finalizados === 1 ? "feito" : "feitos"}
      </span>
    ) : null,
    <span key="livres">
      <ValorAnimado valor={livres} formatar={String} primeiraCarga />{" "}
      {livres === 1 ? "horário livre" : "horários livres"}
    </span>,
    fila ? (
      <span key="fila">
        <ValorAnimado valor={fila} formatar={String} primeiraCarga /> na fila
      </span>
    ) : null,
  ].filter((parte): parte is ReactElement => Boolean(parte));
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
