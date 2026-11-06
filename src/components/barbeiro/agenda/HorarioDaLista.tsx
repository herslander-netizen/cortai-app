/**
 * Blocos da lista da Agenda (pedido do dono para a Agenda, 06/11/2026): um horário com seus atendimentos ligados por
 * um trilho fino, e a onda discreta que separa os dias e marca a hora atual. O cartão é o mesmo de antes.
 */
import { Fragment, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { termos } from "@/lib/segmentos";

import { corDaCategoria, glifoDoEstado } from "./cartao-figaro";
import { IconeDoEstado } from "./IconeDoEstado";
import { ProgressoDoAtendimento } from "./ListaAgenda";
import { legendaDoHorario } from "./lista-horarios";
import { estaAtrasado, hora, nomeDaAgenda, ROTULO_ESTADO } from "./tempo";

/**
 * Linha ondulada fina. Com `rotulo` (hora atual) ou `children` (ação discreta, como "Ver mais dias"), a onda se divide
 * e o conteúdo fica no meio.
 */
export function OndaDaLista({
  rotulo,
  rotuloAcessivel,
  children,
}: {
  rotulo?: string;
  rotuloAcessivel?: string;
  children?: ReactNode;
}) {
  const meio =
    children ?? (rotulo ? <span className="agenda-lista-onda-rotulo">{rotulo}</span> : null);
  return (
    <div
      className="agenda-lista-onda"
      role={rotulo ? "separator" : undefined}
      aria-hidden={meio ? undefined : true}
      aria-label={rotuloAcessivel}
    >
      <span className="agenda-lista-onda-traco" aria-hidden />
      {meio ? (
        <>
          {meio}
          <span className="agenda-lista-onda-traco" aria-hidden />
        </>
      ) : null}
    </div>
  );
}

export function HorarioDaLista({
  itens,
  fuso,
  ehHoje,
  agora,
  segmento,
  discreto,
  mostrarProfissional,
  selecionado,
  tituloCurto,
  cascataDesde,
  onAbrir,
}: {
  itens: AgendaItem[];
  fuso: string;
  ehHoje: boolean;
  /** Relógio compartilhado (`useAgora`), em milissegundos. */
  agora: number;
  segmento: Parameters<typeof termos>[0];
  discreto: boolean;
  mostrarProfissional: boolean;
  selecionado: string | null;
  tituloCurto: string;
  /** Índice do primeiro cartão na cascata de entrada (só no primeiro dia); `null` sem cascata. */
  cascataDesde: number | null;
  onAbrir: (item: AgendaItem) => void;
}) {
  const primeiro = itens[0]!;
  return (
    <div className="agenda-lista-horario">
      <span className="agenda-lista-hora" aria-hidden>
        <strong>{hora(primeiro.inicio, fuso)}</strong>
        <span>{legendaDoHorario(itens)}</span>
      </span>
      <ul className="agenda-lista-trilho">
        {itens.map((item, i) => {
          const nome = nomeDaAgenda(item.cliente, discreto);
          const atrasado = ehHoje && estaAtrasado(item, agora);
          const estado =
            item.status === "na_cadeira"
              ? termos(segmento).statusAtendimento
              : (ROTULO_ESTADO[item.status] ?? item.status);
          const ordem = cascataDesde === null ? null : cascataDesde + i;
          const cascata = ordem !== null && ordem < 6;
          return (
            <li
              key={item.id}
              className={`agenda-lista-linha ${cascata ? "mov-item-cascata" : ""}`}
              style={cascata ? { animationDelay: `${ordem * 30}ms` } : undefined}
            >
              <span className="agenda-lista-no" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                aria-label={`${tituloCurto} ${hora(item.inicio, fuso)}, ${nome}, ${item.servico}, ${estado}`}
                aria-pressed={selecionado === item.id}
                className={`agenda-lista-cartao agenda-timeline-${item.status} ${item.confirmadoEm && item.status === "agendado" ? "agenda-timeline-confirmado" : ""} ${item.encaixe && item.status === "agendado" ? "agenda-timeline-encaixe" : ""} ${selecionado === item.id ? "agenda-lista-cartao-selecionado" : ""}`}
                style={{ ["--cor-categoria" as string]: corDaCategoria(item.categoriaIndice) }}
                onClick={() => onAbrir(item)}
              >
                {/* Figaro (`AgendaListRow`): serviço em destaque, cliente embaixo e a linha de detalhes
                    (categoria, profissional, valor) separada por bolinhas. */}
                <span className="agenda-lista-cartao-topo">
                  <strong className={item.status === "cancelado" ? "line-through" : ""}>
                    {item.servico}
                  </strong>
                  <IconeDoEstado glifo={glifoDoEstado(item, atrasado)} />
                </span>
                <span className="agenda-lista-servico">{nome}</span>
                <span className="agenda-lista-detalhe">
                  {[
                    item.categoria?.trim() || null,
                    mostrarProfissional ? item.profissional : null,
                    item.valor_centavos ? brl(item.valor_centavos) : null,
                    atrasado ? "Atrasado" : null,
                  ]
                    .filter((parte): parte is string => Boolean(parte))
                    .map((parte, k) => (
                      <Fragment key={k}>
                        {k > 0 ? <i aria-hidden className="agenda-lista-ponto" /> : null}
                        {parte}
                      </Fragment>
                    ))}
                </span>
                {ehHoje && item.status === "na_cadeira" ? (
                  <ProgressoDoAtendimento item={item} agora={agora} />
                ) : null}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
