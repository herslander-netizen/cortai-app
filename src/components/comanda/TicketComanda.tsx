import { Calendar, Check, Clock, Copy, Package, Sparkles, User, X, Hourglass } from "lucide-react";
import type { ReactNode } from "react";

import simbolo from "@/assets/flow-simbolo-escuro-256.png.asset.json";
import logotipo from "@/assets/flow-logotipo-escura-560.png.asset.json";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import {
  barrasDoCodigo,
  codigoLegivel,
  rotuloDaForma,
  ROTULO_DO_ESTADO,
  telefoneDoTicket,
  type DadosDoTicket,
  type ItemDoTicket,
} from "@/lib/comanda-ticket";

/** Marca Flow na versão escura (o papel do ticket é claro). */
export const SIMBOLO_MARCA = simbolo.url;
export const LOGOTIPO_MARCA = logotipo.url;

function Tracejado() {
  return <div className="my-4 border-t-2 border-dashed border-[var(--ticket-linha)]" aria-hidden />;
}

function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--ticket-mute)]">
      {children}
    </p>
  );
}

export function SimboloPix({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="var(--ticket-pix)">
        <rect x="7.5" y="1.5" width="9" height="9" rx="2" transform="rotate(45 12 6)" />
        <rect x="7.5" y="13.5" width="9" height="9" rx="2" transform="rotate(45 12 18)" />
        <rect
          x="1.5"
          y="7.5"
          width="9"
          height="9"
          rx="2"
          transform="rotate(45 6 12)"
          opacity=".85"
        />
        <rect
          x="13.5"
          y="7.5"
          width="9"
          height="9"
          rx="2"
          transform="rotate(45 18 12)"
          opacity=".85"
        />
      </g>
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        transform="rotate(45 12 12)"
        fill="var(--ticket-papel)"
      />
    </svg>
  );
}

function Lista({
  titulo,
  icone,
  itens,
}: {
  titulo: string;
  icone: ReactNode;
  itens: ItemDoTicket[];
}) {
  if (!itens.length) return null;
  return (
    <section className="mt-4">
      <div className="flex items-center gap-2">
        {icone}
        <Rotulo>{titulo}</Rotulo>
      </div>
      <ul className="mt-2 space-y-1.5">
        {itens.map((i, n) => (
          <li key={n} className="flex items-baseline gap-3 text-[15px]">
            <span className="w-7 shrink-0 text-[var(--ticket-mute)]">{i.quantidade}x</span>
            <span className="min-w-0 flex-1 break-words">{i.descricao}</span>
            <span className="shrink-0 font-semibold tabular-nums">{brl(i.totalCentavos)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const COR_ESTADO = {
  pago: "text-[var(--ticket-pago)] bg-[color-mix(in_oklab,var(--ticket-pago)_12%,transparent)]",
  pendente:
    "text-[var(--ticket-pendente)] bg-[color-mix(in_oklab,var(--ticket-pendente)_14%,transparent)]",
  cancelado:
    "text-[var(--ticket-cancelado)] bg-[color-mix(in_oklab,var(--ticket-cancelado)_12%,transparent)]",
} as const;

export function TicketComanda({
  ticket,
  onCopiarPix,
}: {
  ticket: DadosDoTicket;
  onCopiarPix?: () => void;
}) {
  const { negocio } = ticket;
  const telefone = telefoneDoTicket(ticket.cliente.telefone);
  const barras = barrasDoCodigo(ticket.codigo);
  const IconeEstado =
    ticket.estado === "pago" ? Check : ticket.estado === "cancelado" ? X : Hourglass;
  const ehPix = ticket.forma === "pix";

  return (
    <div className="mx-auto w-full max-w-[360px] drop-shadow-[0_18px_30px_rgb(0_0_0/0.3)]">
      <article
        className="papel-ticket relative px-6 pb-8 pt-9"
        aria-label={`Comanda ${ticket.codigo}`}
      >
        <header className="flex flex-col items-center text-center">
          {negocio.logoUrl ? (
            <img
              src={negocio.logoUrl}
              alt={negocio.nome ?? "Logo"}
              className="size-16 rounded-[var(--raio-imagem)] object-cover"
            />
          ) : null}
          {negocio.nome ? (
            <p
              className={`${negocio.logoUrl ? "mt-2 text-lg" : "text-[22px]"} font-bold leading-tight text-[var(--ticket-navy)]`}
            >
              {negocio.nome}
            </p>
          ) : null}
          {!negocio.logoUrl && !negocio.nome ? (
            <img src={LOGOTIPO_MARCA} alt="Flow" className="h-9 w-auto" />
          ) : null}
          <p className="mt-3 text-[13px] font-semibold tracking-[0.5em] text-[var(--ticket-mute)]">
            COMANDA
          </p>
        </header>
        <Tracejado />

        <div className="grid grid-cols-2 gap-3">
          {[
            { icone: Calendar, rotulo: "DATA", valor: ticket.data },
            { icone: Clock, rotulo: "HORÁRIO", valor: ticket.horario },
          ].map(({ icone: Icone, rotulo, valor }) => (
            <div key={rotulo} className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ticket-suave)]">
                <Icone className="size-4 text-[var(--ticket-navy)]" aria-hidden />
              </span>
              <div>
                <Rotulo>{rotulo}</Rotulo>
                <p className="text-[15px] font-semibold tabular-nums">{valor}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[var(--raio-bloco)] bg-[var(--ticket-suave)] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--ticket-papel)]">
            <User className="size-4 text-[var(--ticket-navy)]" aria-hidden />
          </span>
          <div className="min-w-0">
            <Rotulo>CLIENTE</Rotulo>
            <p className="break-words text-[15px] font-semibold">{ticket.cliente.nome}</p>
            {telefone ? (
              <p className="text-[13px] text-[var(--ticket-mute)] tabular-nums">{telefone}</p>
            ) : null}
          </div>
        </div>

        <Lista
          titulo="SERVIÇO(S)"
          icone={<Sparkles className="size-4 text-[var(--ticket-navy)]" aria-hidden />}
          itens={ticket.servicos}
        />
        <Lista
          titulo="PRODUTO(S)"
          icone={<Package className="size-4 text-[var(--ticket-navy)]" aria-hidden />}
          itens={ticket.produtos}
        />

        <Tracejado />
        <div className="space-y-1 text-[14px]">
          <div className="flex justify-between">
            <span className="text-[var(--ticket-mute)]">SUBTOTAL</span>
            <span className="tabular-nums">{brl(ticket.subtotalCentavos)}</span>
          </div>
          {ticket.descontoCentavos > 0 ? (
            <div className="flex justify-between text-[var(--ticket-rosa)]">
              <span>DESCONTO</span>
              <span className="tabular-nums">- {brl(ticket.descontoCentavos)}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-3 rounded-[var(--raio-bloco)] bg-[var(--ticket-total)] px-4 py-3 text-center">
          <Rotulo>TOTAL</Rotulo>
          <p className="text-[34px] font-extrabold leading-tight tabular-nums text-[var(--ticket-navy)]">
            {brl(ticket.totalCentavos)}
          </p>
        </div>

        <section className="mt-4">
          <Rotulo>PAGAMENTO</Rotulo>
          {ehPix && ticket.pixChave && onCopiarPix ? (
            <Button
              variant="ghost"
              type="button"
              onClick={onCopiarPix}
              className="mt-2 h-auto min-h-12 w-full justify-start rounded-[var(--raio-bloco)] border border-[var(--ticket-linha)] px-3 py-2 text-left text-[var(--ticket-navy)] hover:bg-[var(--ticket-suave)]"
            >
              <SimboloPix />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Pix</span>
                <span className="block text-[12px] text-[var(--ticket-mute)]">
                  Clique para copiar a chave Pix
                </span>
              </span>
              <Copy className="size-4 text-[var(--ticket-navy)]" aria-hidden />
            </Button>
          ) : (
            <div className="mt-2 flex min-h-12 items-center gap-3 rounded-[var(--raio-bloco)] border border-[var(--ticket-linha)] px-3 py-2">
              {ehPix ? <SimboloPix /> : null}
              <span className="text-[15px] font-semibold">{rotuloDaForma(ticket.forma)}</span>
            </div>
          )}
        </section>

        <section className="mt-4 flex items-center justify-between">
          <Rotulo>STATUS</Rotulo>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${COR_ESTADO[ticket.estado]}`}
          >
            <IconeEstado className="size-3.5" aria-hidden />
            {ROTULO_DO_ESTADO[ticket.estado]}
          </span>
        </section>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--raio-bloco)] bg-[var(--ticket-suave)] px-3 py-3">
          <div className="min-w-0 flex-1">
            <Rotulo>CÓDIGO DA COMANDA</Rotulo>
            <p className="max-w-full overflow-x-auto whitespace-nowrap pb-1 text-[17px] font-bold tabular-nums tracking-wide">
              #{ticket.codigo}
            </p>
          </div>

        </div>

        <div className="mt-4 flex flex-col items-center" aria-hidden>
          <div className="flex h-14 items-stretch">
            {barras.map((b, i) => (
              <span
                key={i}
                style={{ width: b.larga ? 3 : 1.2 }}
                className={b.barra ? "bg-[var(--ticket-texto)]" : ""}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[12px] tracking-[0.2em] tabular-nums text-[var(--ticket-texto)]">
            {codigoLegivel(ticket.codigo)}
          </p>
        </div>

        <Tracejado />
        <p className="text-center text-[15px] font-semibold">Obrigado pela preferência!</p>
        <p className="mt-1 text-center text-[11px] text-[var(--ticket-mute)]">
          By Alvo Digital • Flow
        </p>
        <img src={SIMBOLO_MARCA} alt="" className="absolute bottom-6 right-6 size-6 opacity-90" />
      </article>
    </div>
  );
}
