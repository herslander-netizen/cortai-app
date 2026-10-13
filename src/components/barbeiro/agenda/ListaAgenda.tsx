import { useState } from "react";

import {
  CalendarClock,
  Check,
  Scissors,
  UserRoundPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";
import { termos } from "@/lib/segmentos";

import {
  estaAtrasado,
  fichaRelevante,
  hora,
  minutosDecorridos,
  nomeDaAgenda,
  nomeEhGenerico,
  ROTULO_ESTADO,
  tempoExcedido,
} from "./tempo";

export type AcaoCard = "chegou" | "iniciar" | "terminar";

const ENCERRADOS = new Set(["finalizado", "cancelado", "remarcado", "nao_compareceu"]);
const PRIORIDADE: Record<string, number> = { na_cadeira: 0, chegou: 1, agendado: 2 };

type AcaoPrincipal = { acao: AcaoCard; rotulo: string; Icone: LucideIcon };

function acaoDoItem(item: AgendaItem, agora: number, ehHoje: boolean): AcaoPrincipal | null {
  if (item.status === "na_cadeira")
    return { acao: "terminar", rotulo: "Finalizar e cobrar", Icone: Check };
  if (item.status === "chegou") return { acao: "iniciar", rotulo: "Começar", Icone: Scissors };
  if (item.status !== "agendado") return null;
  if (ehHoje && new Date(item.inicio).getTime() - agora <= 30 * 60_000)
    return {
      acao:
        estaAtrasado(item, agora) && agora >= new Date(item.fim).getTime() ? "terminar" : "chegou",
      rotulo:
        estaAtrasado(item, agora) && agora >= new Date(item.fim).getTime()
          ? "Atendi"
          : "Cliente chegou",
      Icone:
        estaAtrasado(item, agora) && agora >= new Date(item.fim).getTime() ? Check : UserRoundPlus,
    };
  return null;
}

export function ListaAgenda({
  itens,
  fuso,
  ehHoje,
  selecionado,
  novos,
  online,
  mostrarProfissional,
  discreto = false,
  onAbrir,
  onFalta,
  onAcao,
}: {
  itens: AgendaItem[];
  fuso: string;
  ehHoje: boolean;
  selecionado: string | null;
  novos: Set<string>;
  online: boolean;
  mostrarProfissional: boolean;
  discreto?: boolean;
  onAbrir: (id: string) => void;
  onFalta: (item: AgendaItem) => void;
  onAcao?: (item: AgendaItem, acao: AcaoCard) => void;
}) {
  const agora = useAgora();
  const segmento = useSegmentoDoPainel();
  const [aguardando, setAguardando] = useState<Set<string>>(() => new Set());
  const [encerradosAbertos, setEncerradosAbertos] = useState(false);
  const abertos = ehHoje ? itens.filter((item) => !ENCERRADOS.has(item.status)) : itens;
  const encerrados = ehHoje ? itens.filter((item) => ENCERRADOS.has(item.status)) : [];
  const visiveis = encerradosAbertos ? [...abertos, ...encerrados] : abertos;
  const prioritario = [...abertos]
    .filter((item) => acaoDoItem(item, agora, ehHoje))
    .sort(
      (a, b) =>
        (PRIORIDADE[a.status] ?? 9) - (PRIORIDADE[b.status] ?? 9) ||
        new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    )[0]?.id;

  return (
    <div>
      <ul className="divide-y divide-line">
        {visiveis.map((item, indice) => {
          const nome = nomeDaAgenda(item.cliente, discreto);
          const atrasado = ehHoje && !aguardando.has(item.id) && estaAtrasado(item, agora);
          const depoisDoHorario = atrasado && agora >= new Date(item.fim).getTime();
          const principal = onAcao ? acaoDoItem(item, agora, ehHoje) : null;
          const alergia = item.status === "na_cadeira" ? fichaRelevante(item.ficha) : null;
          const decorrido =
            item.status === "na_cadeira"
              ? minutosDecorridos(item.startedAt ?? item.inicio, agora)
              : 0;
          const estourou = decorrido > item.duracaoMin;
          const estado =
            item.status === "na_cadeira"
              ? termos(segmento).statusAtendimento
              : (ROTULO_ESTADO[item.status] ?? item.status);
          return (
            <li
              key={item.id}
              className={`agenda-item agenda-item-${item.status} ${item.confirmadoEm && item.status === "agendado" ? "agenda-item-confirmado" : ""} ${item.encaixe && item.status === "agendado" ? "agenda-item-encaixe" : ""} ${indice < 6 ? "mov-item-cascata" : ""} ${selecionado === item.id ? "agenda-item-selecionado" : ""} ${novos.has(item.id) ? "agenda-novo" : ""}`}
              style={indice < 6 ? { animationDelay: `${indice * 30}ms` } : undefined}
            >
              <Button
                type="button"
                variant="ghost"
                className="agenda-item-resumo h-auto min-h-12 w-full flex-col items-stretch justify-start gap-1 rounded-none whitespace-normal px-0 py-0 text-left hover:bg-transparent active:bg-transparent"
                aria-label={`${hora(item.inicio, fuso)}, ${nome}, ${item.servico}, ${estado}`}
                aria-pressed={selecionado === item.id}
                onClick={() => onAbrir(item.id)}
              >
                <span className="grid grid-cols-[54px_minmax(0,1fr)] items-start gap-3">
                  <span className="pt-0.5">
                    <span className="block text-sm font-extrabold text-paper">
                      {hora(item.inicio, fuso)}
                    </span>
                    {item.status === "na_cadeira" ? (
                      <span className="agenda-item-hora-agora block" aria-hidden>
                        AGORA
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`agenda-nome text-sm ${nomeEhGenerico(item.cliente) ? "text-mute" : "text-paper"}`}
                    >
                      {nome}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-mute">
                      {item.servico}
                      {mostrarProfissional ? ` · ${item.profissional}` : ""}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {item.status !== "na_cadeira" ? (
                        <span className={`agenda-item-badge agenda-item-badge-${item.status}`}>
                          {estado}
                        </span>
                      ) : null}
                      {item.encaixe ? (
                        <span className="agenda-item-badge agenda-item-badge-encaixe">Encaixe</span>
                      ) : null}
                      {item.confirmadoEm && item.status === "agendado" ? (
                        <span className="agenda-item-badge agenda-item-badge-confirmado">
                          Confirmou
                        </span>
                      ) : null}
                      {atrasado ? (
                        <span className="agenda-item-badge agenda-item-badge-atrasado">
                          Atrasado
                        </span>
                      ) : null}
                    </span>
                  </span>
                </span>
                {alergia ? (
                  <span className="mt-2 block border-l-2 border-brick pl-2 text-xs font-semibold text-paper">
                    {alergia}
                  </span>
                ) : null}
                {item.status === "na_cadeira" ? (
                  <span className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <progress
                      className={`agenda-progress ${estourou ? "agenda-progress-estourado" : ""}`}
                      max={Math.max(item.duracaoMin, decorrido)}
                      value={decorrido}
                      aria-label={`${decorrido} de ${item.duracaoMin} minutos`}
                    />
                    <span
                      className={`agenda-tempo text-xs font-bold ${estourou ? "agenda-tempo-estourado" : ""}`}
                    >
                      {estourou
                        ? tempoExcedido(decorrido, item.duracaoMin)
                        : `${decorrido}/${item.duracaoMin} min`}
                    </span>
                  </span>
                ) : null}
              </Button>
              {principal || atrasado ? (
                <div className="agenda-item-acoes">
                  {principal ? (
                    <Button
                      variant={prioritario === item.id ? "primary" : "outline"}
                      size="sm"
                      className="agenda-item-primaria min-h-12"
                      disabled={!online}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcao?.(item, principal.acao);
                      }}
                    >
                      <principal.Icone aria-hidden /> {principal.rotulo}
                    </Button>
                  ) : null}
                  {atrasado ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-12"
                        disabled={!online}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFalta(item);
                        }}
                      >
                        <UserX /> Faltou
                      </Button>
                      {depoisDoHorario ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-12"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAbrir(item.id);
                          }}
                        >
                          <CalendarClock /> Remarcar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-12"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAguardando((a) => new Set(a).add(item.id));
                          }}
                        >
                          Aguardar
                        </Button>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {ehHoje && encerrados.length ? (
        <Button
          variant="ghost"
          className="mt-2 min-h-12 w-full"
          aria-expanded={encerradosAbertos}
          onClick={() => setEncerradosAbertos((aberto) => !aberto)}
        >
          {encerradosAbertos
            ? "Ocultar finalizados e cancelados"
            : `Ver finalizados e cancelados (${encerrados.length})`}
        </Button>
      ) : null}
      <p className="mt-2 border-t border-line pt-2 text-center text-xs text-mute" role="note">
        Toque no cartão para ver opções, remarcar ou cancelar
      </p>
    </div>
  );
}
