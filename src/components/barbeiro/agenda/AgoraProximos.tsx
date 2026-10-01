import { Check, CalendarClock, MessageCircle, UserX } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";

import {
  TERMINAIS,
  estaAtrasado,
  fichaRelevante,
  hora,
  linkWhatsApp,
  minutosDecorridos,
  nomeEhGenerico,
  tempoExcedido,
  teclaDeAtivar,
} from "./tempo";

/** Faixa Agora/Próximos: compacta no celular, detalhada no computador. Todos os planos. */
export function AgoraProximos({
  itens,
  fuso,
  selecionado,
  onAbrir,
  onPerfil,
  onComanda,
  onFalta,
  onLista,
}: {
  itens: AgendaItem[];
  fuso: string;
  selecionado: string | null;
  onAbrir: (id: string) => void;
  onPerfil: (clienteId: string) => void;
  onComanda: (item: AgendaItem) => void;
  onFalta: (item: AgendaItem) => void;
  onLista: () => void;
}) {
  const agora = useAgora();
  const ativos = itens.filter((i) => i.status === "na_cadeira");
  const pendentes = itens
    .filter((i) => estaAtrasado(i, agora))
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const pendente = pendentes[0];
  const futuros = itens.filter(
    (i) =>
      !TERMINAIS.has(i.status) &&
      i.status !== "na_cadeira" &&
      !estaAtrasado(i, agora) &&
      new Date(i.fim).getTime() >= agora,
  );
  const proximo = futuros[0];
  const fimPrevisto = ativos.length
    ? Math.max(
        ...ativos.map((a) => new Date(a.startedAt ?? a.inicio).getTime() + a.duracaoMin * 60_000),
      )
    : 0;

  return (
    <section className="agenda-agora-proximos" aria-label="Agora e próximos">
      {ativos.length ? (
        ativos.map((item) => {
          const decorrido = minutosDecorridos(item.startedAt ?? item.inicio, agora);
          const estourou = decorrido > item.duracaoMin;
          const alergia = fichaRelevante(item.ficha);
          return (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`Agora: ${item.cliente}, ${item.servico}`}
              className={`agenda-agora-compacto ${selecionado === item.id ? "agenda-item-selecionado" : ""}`}
              onClick={() => onAbrir(item.id)}
              onKeyDown={teclaDeAtivar(() => onAbrir(item.id))}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="agenda-rotulo">Agora</span>
                <StatusBadge status="na_cadeira" />
              </div>
              <div className="mt-1 min-w-0">
                {item.clienteId ? (
                  <button
                    type="button"
                    className={`agenda-nome ${nomeEhGenerico(item.cliente) ? "text-mute" : "text-paper"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.clienteId) onPerfil(item.clienteId);
                    }}
                  >
                    {item.cliente}
                  </button>
                ) : (
                  <p className="agenda-nome text-paper">{item.cliente}</p>
                )}
                <p className="truncate text-xs text-mute">
                  {item.servico} · {item.profissional}
                </p>
              </div>
              {alergia ? (
                <p className="mt-2 border-l-2 border-brick pl-2 text-xs font-semibold text-paper">
                  {alergia}
                </p>
              ) : null}
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
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
              </div>
            </article>
          );
        })
      ) : pendente ? (
        <div className="agenda-livre-agora" role="status">
          <p>
            <span className="agenda-rotulo">Pendente</span> {pendente.cliente},{" "}
            {hora(pendente.inicio, fuso)} · atrasado
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {agora < new Date(pendente.fim).getTime() ? (
              <Button className="min-h-12" onClick={() => onAbrir(pendente.id)}>
                <Check /> Cliente chegou
              </Button>
            ) : (
              <Button className="min-h-12" onClick={() => onComanda(pendente)}>
                <Check /> Atendi
              </Button>
            )}
            <Button variant="outline" className="min-h-12" onClick={() => onFalta(pendente)}>
              <UserX /> Faltou
            </Button>
            {agora >= new Date(pendente.fim).getTime() ? (
              <Button variant="ghost" className="min-h-12" onClick={() => onAbrir(pendente.id)}>
                <CalendarClock /> Remarcar
              </Button>
            ) : null}
            {pendentes.length > 1 ? (
              <Button variant="ghost" className="min-h-12" onClick={onLista}>
                +{pendentes.length - 1} pendentes
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className="agenda-livre-agora min-h-12 cursor-pointer py-3"
          role={proximo ? "button" : "status"}
          tabIndex={proximo ? 0 : undefined}
          onClick={() => proximo && onAbrir(proximo.id)}
          onKeyDown={proximo ? teclaDeAtivar(() => onAbrir(proximo.id)) : undefined}
        >
          <span className="agenda-rotulo">Agora</span> · Livre
          {proximo ? ` · próximo: ${proximo.cliente} às ${hora(proximo.inicio, fuso)}` : ""}
        </div>
      )}

      {ativos.length && proximo ? (
        <ul className="agenda-proximos-lista">
          {[proximo].map((item) => {
            const espera = Math.max(
              0,
              Math.ceil((fimPrevisto - new Date(item.inicio).getTime()) / 60_000),
            );
            const aviso =
              espera > 0
                ? linkWhatsApp(
                    item.telefone,
                    `Olá, ${item.cliente}! O atendimento anterior atrasou um pouco. A previsão de espera é de cerca de ${espera} minutos. Avisamos assim que liberar.`,
                  )
                : null;
            return (
              <li
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Próximo: ${item.cliente} às ${hora(item.inicio, fuso)}`}
                className="agenda-proximo-linha"
                onClick={() => onAbrir(item.id)}
                onKeyDown={teclaDeAtivar(() => onAbrir(item.id))}
              >
                <span className="agenda-rotulo">Próximo</span>
                <strong className="text-sm text-paper">{hora(item.inicio, fuso)}</strong>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">
                    {item.cliente}
                  </span>
                  <span className="block truncate text-xs text-mute">
                    {item.servico}
                    {espera > 0 ? (
                      <span className="font-semibold text-brick"> · ~{espera} min de espera</span>
                    ) : null}
                  </span>
                </span>
                {aviso ? (
                  <Button asChild variant="secondary" size="sm" className="min-h-11">
                    <a
                      href={aviso}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Avisar ${item.cliente} pelo WhatsApp`}
                    >
                      <MessageCircle /> Avisar
                    </a>
                  </Button>
                ) : item.status === "chegou" ? (
                  <StatusBadge status="chegou" />
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
