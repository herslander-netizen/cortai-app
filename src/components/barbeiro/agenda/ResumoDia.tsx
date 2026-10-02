import type { ReactElement } from "react";

import { ValorAnimado } from "@/components/painel/ValorAnimado";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaDia, AgendaItem } from "@/lib/barbeiro.functions";

import { contarLivres, disponibilidadeHoje, resumoOperacional } from "./tempo";

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
  const livresHoje = ehHoje
    ? disponibilidadeHoje({ itens, horarios, dia, fuso, profissionalIds, agora })
    : null;
  const livres = ehHoje
    ? 0
    : contarLivres({ horarios, dia, fuso, itens, profissionalIds, passoMin, agora, ehHoje });
  const partes = [
    <span key="fazer">
      <ValorAnimado valor={r.aFazer} formatar={String} primeiraCarga />{" "}
      {r.aFazer === 1 ? "restante" : "restantes"}
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
    livresHoje ? <span key="livres-hoje">{livresHoje}</span> : null,
    !ehHoje ? (
      <span key="livres">
        <ValorAnimado valor={livres} formatar={String} primeiraCarga />{" "}
        {livres === 1 ? "horário livre" : "horários livres"}
      </span>
    ) : null,
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
