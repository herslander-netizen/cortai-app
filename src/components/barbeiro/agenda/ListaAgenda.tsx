import { useState } from "react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";

import { teclaDeAtivar } from "./AgoraProximos";
import { estaAtrasado, hora, nomeEhGenerico } from "./tempo";

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
}) {
  const agora = useAgora();
  const [aguardando, setAguardando] = useState<Set<string>>(() => new Set());
  return (
    <ul className="divide-y divide-line">
      {itens.map((item) => {
        const atrasado = ehHoje && !aguardando.has(item.id) && estaAtrasado(item, agora);
        return (
          <li
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`${hora(item.inicio, fuso)}, ${item.cliente}, ${item.servico}`}
            className={`agenda-lista-item agenda-barra-${item.status} ${selecionado === item.id ? "agenda-item-selecionado" : ""} ${novos.has(item.id) ? "agenda-novo" : ""}`}
            onClick={() => onAbrir(item.id)}
            onKeyDown={teclaDeAtivar(() => onAbrir(item.id))}
          >
            <div className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-start gap-3">
              <p className="pt-0.5 text-sm font-extrabold text-paper">{hora(item.inicio, fuso)}</p>
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
              <div className="flex flex-wrap justify-end gap-1">
                {item.status === "na_cadeira" ? <StatusBadge status="na_cadeira" /> : null}
                {atrasado ? <StatusBadge status="nao_compareceu" label="Atrasado" /> : null}
                {item.encaixe ? <StatusBadge status="encaixe" /> : null}
                {item.confirmadoEm && item.status === "agendado" ? (
                  <StatusBadge status="confirmado" label="Confirmou" />
                ) : null}
                {item.status !== "agendado" && item.status !== "na_cadeira" ? (
                  <StatusBadge status={item.status} />
                ) : null}
              </div>
            </div>
            {atrasado ? (
              <div className="mt-2 ml-[66px] flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-brick">Não chegou?</span>
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
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
