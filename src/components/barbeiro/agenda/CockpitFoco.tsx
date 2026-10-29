import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { nomeDaAgenda, hora } from "./tempo";
import { situacaoDoLembrete, type DadosCockpit } from "./cockpit-foco";

type Props = {
  dados: DadosCockpit;
  fuso?: string | undefined;
  agora: number;
  discreto: boolean;
  bloqueado?: boolean;
  ficha?: ReactNode;
  somenteLeitura?: boolean;
  fila?: number | undefined;
  onPrincipal?: (() => void) | undefined;
  onMais?: (() => void) | undefined;
  onFalta?: (() => void) | undefined;
  onCancelar?: (() => void) | undefined;
  onRemarcar?: (() => void) | undefined;
  onAvisar?: ((item: AgendaItem) => void) | undefined;
  onChamarFila?: (() => void) | undefined;
};

export function CockpitFoco(props: Props) {
  const { dados, agora } = props;
  const item = dados.principal;
  const acao =
    dados.estado === "chegou"
      ? "Começar"
      : dados.estado === "na_cadeira" || dados.estado === "passou_do_tempo"
        ? "Finalizar e cobrar"
        : dados.estado === "receber"
          ? "Receber"
          : dados.estado === "encerrado"
            ? "Dia encerrado"
            : dados.estado === "livre"
              ? "Encaixar cliente"
              : "Cliente chegou";
  return (
    <main
      className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]"
      data-cockpit-foco
    >
      <section
        className="flex min-h-0 flex-col border-y border-line bg-ink2 px-4 py-4 sm:px-6"
        aria-label="Agora"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <strong
            className={`text-[15px] font-extrabold ${dados.estado === "passou_do_tempo" || dados.estado === "atrasado" ? "text-status-warning" : "text-status-active"}`}
          >
            {dados.rotulo}
          </strong>
          {dados.termino ? (
            <span className="text-[15px] font-semibold text-mute">
              {dados.estado === "passou_do_tempo" ? "era até" : "termina"} {dados.termino}
            </span>
          ) : null}
        </div>
        {item ? (
          <>
            <h1 className="mt-4 overflow-wrap-anywhere text-4xl font-extrabold leading-none text-paper sm:text-[40px]">
              {nomeDaAgenda(item.cliente, props.discreto)}
            </h1>
            <p className="mt-2 text-[16px] text-mute">
              {item.servico} · {item.duracaoMin} min
            </p>
            {item.status === "na_cadeira" ? (
              <div className="mt-5" role="timer">
                <div className="h-3 overflow-hidden rounded-full bg-ink3">
                  <span
                    className={`block h-full origin-left rounded-full ${dados.estado === "passou_do_tempo" ? "bg-status-warning" : "bg-status-active"}`}
                    style={{ transform: `scaleX(${dados.progresso})` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-3 text-[15px] font-bold">
                  <span>{dados.decorrido} min</span>
                  <span
                    className={
                      dados.estado === "passou_do_tempo" ? "text-status-warning" : "text-mute"
                    }
                  >
                    {dados.excedido ?? `faltam ${dados.restante} min`}
                  </span>
                </div>
              </div>
            ) : null}
            {props.ficha}
          </>
        ) : (
          <div className="grid flex-1 place-content-center py-10 text-center">
            <strong className="text-2xl text-paper">Agenda livre</strong>
            <span className="mt-2 text-[15px] text-mute">Aproveite o intervalo.</span>
          </div>
        )}
      </section>

      <aside
        className="flex min-h-0 flex-col gap-3 lg:justify-end"
        aria-label="Próximos atendimentos"
      >
        {dados.proximo ? (
          <section className="border border-line bg-ink2 p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[15px] font-extrabold text-paper">
              <span>PRÓXIMO · {hora(dados.proximo.inicio, props.fuso)}</span>
              <span className="text-mute">
                em {Math.max(0, Math.ceil((+new Date(dados.proximo.inicio) - agora) / 60_000))} min
              </span>
            </div>
            <strong className="mt-3 block truncate text-xl text-paper">
              {nomeDaAgenda(dados.proximo.cliente, props.discreto)}
            </strong>
            <p className="mt-1 text-[15px] text-mute">{dados.proximo.servico}</p>
            <p className="mt-3 text-[15px] font-semibold text-paper">
              {situacaoDoLembrete(dados.proximo)}
            </p>
            {dados.atrasoPrevisto >= 5 && props.onAvisar ? (
              <Button
                variant="outline"
                className="mt-3 min-h-12 w-full"
                onClick={() => props.onAvisar?.(dados.proximo as AgendaItem)}
              >
                Avisar {dados.proximo.cliente.split(" ")[0]}: {dados.atrasoPrevisto} min de atraso
              </Button>
            ) : null}
            {dados.depois.length ? (
              <p className="mt-4 border-t border-line pt-3 text-[15px] text-mute">
                Depois:{" "}
                {dados.depois
                  .map((x) => `${x.cliente.split(" ")[0]} ${hora(x.inicio, props.fuso)}`)
                  .join(" · ")}
              </p>
            ) : null}
          </section>
        ) : null}
      </aside>

      <footer
        className={`${props.somenteLeitura ? "col-span-full" : "fixed inset-x-0 bottom-0 z-30 lg:static lg:col-span-2"} grid grid-cols-[64px_minmax(0,1fr)] gap-2 border-t border-line bg-ink px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] lg:bg-transparent lg:px-0 lg:pb-0`}
      >
        <Button
          variant="outline"
          size="icon"
          className="size-16"
          aria-label="Outras ações"
          onClick={props.onMais}
          disabled={props.somenteLeitura || props.bloqueado || dados.estado === "encerrado"}
        >
          <MoreHorizontal className="size-6" />
        </Button>
        <Button
          size="lg"
          className="min-h-16 text-base active:scale-[0.98] motion-reduce:active:scale-100"
          onClick={props.onPrincipal}
          disabled={props.somenteLeitura || props.bloqueado}
        >
          {acao}
        </Button>
        {dados.estado === "atrasado" ? (
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant="outline"
              className="min-h-12"
              onClick={props.onFalta}
              disabled={props.somenteLeitura || props.bloqueado}
            >
              Não veio
            </Button>
            <Button
              variant="outline"
              className="min-h-12"
              onClick={props.onRemarcar}
              disabled={props.somenteLeitura || props.bloqueado}
            >
              Remarcar
            </Button>
            <Button
              variant="destructive"
              className="min-h-12"
              onClick={props.onCancelar}
              disabled={props.somenteLeitura || props.bloqueado}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="min-h-12"
              onClick={() => {
                if (item) props.onAvisar?.(item);
              }}
              disabled={props.somenteLeitura || props.bloqueado}
            >
              Avisar
            </Button>
          </div>
        ) : null}
        {!item && props.fila ? (
          <Button
            variant="outline"
            className="col-span-2 min-h-12"
            onClick={props.onChamarFila}
            disabled={props.somenteLeitura || props.bloqueado}
          >
            Chamar da fila
          </Button>
        ) : null}
      </footer>
    </main>
  );
}
