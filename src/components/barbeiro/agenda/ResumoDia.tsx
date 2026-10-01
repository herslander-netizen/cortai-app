import type { ReactElement } from "react";

import { ValorAnimado } from "@/components/painel/ValorAnimado";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaDia, AgendaItem } from "@/lib/barbeiro.functions";

import { contarLivres, hora, minutosNoFuso, resumoOperacional, turnosDoDia } from "./tempo";

const OCUPANDO_AGORA = new Set(["agendado", "chegou", "na_cadeira"]);

export function disponibilidadeHoje({ itens, horarios, dia, fuso, profissionalIds, agora }: {
  itens: AgendaItem[]; horarios: AgendaDia["horarios"]; dia: string; fuso: string;
  profissionalIds: string[]; agora: number;
}) {
  const minuto = minutosNoFuso(agora, fuso);
  if (!turnosDoDia(horarios, dia).some(([inicio, fim]) => minuto >= inicio && minuto < fim)) return null;
  const ocupado = (id: string) => itens.some((item) => item.profissionalId === id && OCUPANDO_AGORA.has(item.status) && new Date(item.inicio).getTime() <= agora && agora < new Date(item.fim).getTime());
  if (profissionalIds.length > 1) {
    const livres = profissionalIds.filter((id) => !ocupado(id)).length;
    return livres ? `${livres} livres agora` : null;
  }
  const id = profissionalIds[0];
  if (id && ocupado(id)) return null;
  const proximo = itens.filter((item) => (!id || item.profissionalId === id) && OCUPANDO_AGORA.has(item.status) && new Date(item.inicio).getTime() > agora).sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];
  return proximo ? `livre até ${hora(proximo.inicio, fuso)}` : "livre agora";
}

export function ResumoDia({ itens, horarios, dia, fuso, passoMin, profissionalIds, ehHoje, fila, rotuloAtendimento }: {
  itens: AgendaItem[]; horarios: AgendaDia["horarios"]; dia: string; fuso: string; passoMin: number;
  profissionalIds: string[]; ehHoje: boolean; fila: number; rotuloAtendimento: string;
}) {
  const agora = useAgora();
  const r = resumoOperacional(itens);
  const livresHoje = ehHoje ? disponibilidadeHoje({ itens, horarios, dia, fuso, profissionalIds, agora }) : null;
  const livres = ehHoje ? 0 : contarLivres({ horarios, dia, fuso, itens, profissionalIds, passoMin, agora, ehHoje });
  const partes = [
    <span key="fazer"><ValorAnimado valor={r.aFazer} formatar={String} primeiraCarga /> restantes</span>,
    r.emAtendimento ? <span key="atendimento"><ValorAnimado valor={r.emAtendimento} formatar={String} primeiraCarga /> {rotuloAtendimento.toLocaleLowerCase("pt-BR")}</span> : null,
    r.finalizados ? <span key="feitos"><ValorAnimado valor={r.finalizados} formatar={String} primeiraCarga /> {r.finalizados === 1 ? "feito" : "feitos"}</span> : null,
    livresHoje ? <span key="livres-hoje">{livresHoje}</span> : null,
    !ehHoje ? <span key="livres"><ValorAnimado valor={livres} formatar={String} primeiraCarga /> {livres === 1 ? "horário livre" : "horários livres"}</span> : null,
    fila ? <span key="fila"><ValorAnimado valor={fila} formatar={String} primeiraCarga /> na fila</span> : null,
  ].filter((parte): parte is ReactElement => Boolean(parte));
  return <>{partes.map((parte, indice) => <span key={parte.key}>{indice ? " · " : ""}{parte}</span>)}</>;
}