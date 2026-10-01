import { useState } from "react";

import { Check, Scissors, UserRoundPlus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";
import { termos } from "@/lib/segmentos";

import { estaAtrasado, hora, nomeEhGenerico, ROTULO_ESTADO, teclaDeAtivar } from "./tempo";

export type AcaoCard = "chegou" | "iniciar" | "terminar";

/** Ação principal do cartão, conforme o estado do atendimento. */
const ACAO_PRIMARIA: Partial<
  Record<string, { acao: AcaoCard; rotulo: string; Icone: LucideIcon }>
> = {
  agendado: { acao: "chegou", rotulo: "Cliente chegou", Icone: UserRoundPlus },
  chegou: { acao: "iniciar", rotulo: "Começar", Icone: Scissors },
  na_cadeira: { acao: "terminar", rotulo: "Finalizar e cobrar", Icone: Check },
};

export function ListaAgenda({
  itens,
  fuso,
  ehHoje,
  selecionado,
  novos,
  online,
  onAbrir,
  onPerfil,
  onFalta,
  onAcao,
}: {
  itens: AgendaItem[];
  fuso: string;
  ehHoje: boolean;
  selecionado: string | null;
  novos: Set<string>;
  online: boolean;
  onAbrir: (id: string) => void;
  onPerfil: (clienteId: string) => void;
  onFalta: (item: AgendaItem) => void;
  onAcao?: (item: AgendaItem, acao: AcaoCard) => void;
}) {
  const agora = useAgora();
  const segmento = useSegmentoDoPainel();
  const [aguardando, setAguardando] = useState<Set<string>>(() => new Set());
  return (
    <ul className="divide-y divide-line">
      {itens.map((item, indice) => {
        const atrasado = ehHoje && !aguardando.has(item.id) && estaAtrasado(item, agora);
        const primaria = onAcao ? ACAO_PRIMARIA[item.status] : undefined;
        return (
          <li
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`${hora(item.inicio, fuso)}, ${item.cliente}, ${item.servico}`}
            className={`agenda-item agenda-item-${item.status} ${indice < 6 ? "mov-item-cascata" : ""} ${selecionado === item.id ? "agenda-item-selecionado" : ""} ${novos.has(item.id) ? "agenda-novo" : ""}`}
            style={indice < 6 ? { animationDelay: `${indice * 30}ms` } : undefined}
            onClick={() => onAbrir(item.id)}
            onKeyDown={teclaDeAtivar(() => onAbrir(item.id))}
          >
            <div className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-start gap-3">
              <div className="pt-0.5">
                <p className="text-sm font-extrabold text-paper">{hora(item.inicio, fuso)}</p>
                {item.status === "na_cadeira" ? (
                  <p className="agenda-item-hora-agora" aria-hidden>
                    AGORA
                  </p>
                ) : null}
              </div>
              <div className="min-w-0">
                {item.clienteId ? (
                  <button
                    type="button"
                    className={`agenda-nome text-sm ${nomeEhGenerico(item.cliente) ? "text-mute" : "text-paper"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.clienteId) onPerfil(item.clienteId);
                    }}
                  >
                    {item.cliente}
                  </button>
                ) : (
                  <p className="agenda-nome text-sm text-paper">{item.cliente}</p>
                )}
                <p className="mt-0.5 truncate text-xs text-mute">
                  {item.servico} · {item.profissional}
                </p>
              </div>
              <div className="flex max-w-[45%] flex-wrap justify-end gap-1">
                <span className={`agenda-item-badge agenda-item-badge-${item.status}`}>
                  {item.status === "na_cadeira"
                    ? termos(segmento).statusAtendimento
                    : (ROTULO_ESTADO[item.status] ?? item.status)}
                </span>
                {item.encaixe ? (
                  <span className="agenda-item-badge agenda-item-badge-encaixe">Encaixe</span>
                ) : null}
                {item.confirmadoEm && item.status === "agendado" ? (
                  <span className="agenda-item-badge agenda-item-badge-confirmado">Confirmou</span>
                ) : null}
                {atrasado ? (
                  <span className="agenda-item-badge agenda-item-badge-atrasado">Atrasado</span>
                ) : null}
              </div>
            </div>
            {primaria || atrasado ? (
              <div className="agenda-item-acoes">
                {primaria ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="agenda-item-primaria min-h-11"
                    disabled={!online}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (primaria) onAcao?.(item, primaria.acao);
                    }}
                  >
                    <primaria.Icone aria-hidden />
                    {primaria.rotulo}
                  </Button>
                ) : null}
                {atrasado ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      disabled={!online}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFalta(item);
                      }}
                    >
                      Marcar falta
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAguardando((a) => new Set(a).add(item.id));
                      }}
                    >
                      Aguardar
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
