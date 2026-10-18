import {
  Check,
  ChevronDown,
  CircleCheck,
  HandCoins,
  MessageCircle,
  NotebookPen,
  Phone,
  Scissors,
  Trash2,
  UserRound,
  UserRoundPlus,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VerTicketDoAgendamento } from "@/components/comanda/VerTicketDoAgendamento";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { isoNoFusoDaBarbearia } from "@/lib/horarios";

import { TelaReagendar } from "./TelaReagendar";
import { hora, linkWhatsApp } from "./tempo";

export type PedidoRemarcar = { dia: string; hora: string; profissionalId: string | null };

type Props = {
  item: AgendaItem | null;
  aberto: boolean;
  onFechar: () => void;
  lateral: boolean;
  fuso: string;
  online: boolean;
  ocupado: boolean;
  passoMin: number;
  profissionais: { id: string; nome: string }[];
  onChegou: (item: AgendaItem) => void;
  onIniciar: (item: AgendaItem) => void;
  onComanda: (item: AgendaItem) => void;
  /** Abre o ticket trocando de superfície (a ficha fecha antes). */
  onVerComanda: (item: AgendaItem, comandaId: string) => void;
  onFalta: (item: AgendaItem) => void;
  onCancelar: (item: AgendaItem) => void;
  onPerfil: (clienteId: string) => void;
  onVerificar: (item: AgendaItem, pedido: PedidoRemarcar) => Promise<boolean>;
  onRemarcar: (item: AgendaItem, pedido: PedidoRemarcar) => Promise<void>;
  iniciarEm?: "remarcar" | "cancelar" | null;
};

/** Painel único do atendimento, usado na agenda e no Modo Foco. */
export function PainelAtendimento(props: Props) {
  // Como no Figaro: depois de reagendar, a ficha continua aberta com o horário novo, mesmo que o
  // atendimento tenha ido para outro dia (e saia da lista do dia que está na tela).
  const [remarcado, setRemarcado] = useState<AgendaItem | null>(null);
  const item = props.item ?? (props.aberto ? remarcado : null);
  const [reagendando, setReagendando] = useState(false);
  const [maisAcoes, setMaisAcoes] = useState(false);
  const [confirmacao, setConfirmacao] = useState<"cancelar" | "falta" | null>(null);

  useEffect(() => {
    if (!props.aberto) setRemarcado(null);
  }, [props.aberto]);
  useEffect(() => {
    if (props.item && remarcado && props.item.id !== remarcado.id) setRemarcado(null);
  }, [props.item, remarcado]);

  async function remarcar(alvo: AgendaItem, pedido: PedidoRemarcar) {
    await props.onRemarcar(alvo, pedido);
    const inicio = isoNoFusoDaBarbearia(pedido.dia, pedido.hora, props.fuso);
    const duracao = new Date(alvo.fim).getTime() - new Date(alvo.inicio).getTime();
    setRemarcado({
      ...alvo,
      inicio,
      fim: new Date(new Date(inicio).getTime() + duracao).toISOString(),
      profissionalId: pedido.profissionalId ?? alvo.profissionalId ?? null,
      profissional:
        props.profissionais.find((p) => p.id === pedido.profissionalId)?.nome ?? alvo.profissional,
    });
  }

  useEffect(() => {
    setReagendando(props.iniciarEm === "remarcar" && Boolean(item));
    setConfirmacao(props.iniciarEm === "cancelar" ? "cancelar" : null);
    setMaisAcoes(false);
  }, [item, props.aberto, props.iniciarEm]);

  const pendente = item?.status === "agendado" || item?.status === "chegou";
  const bloqueado = !props.online || props.ocupado;
  const whatsapp = item ? linkWhatsApp(item.telefone) : null;
  const telefone = item?.telefone?.replace(/\D/g, "") ?? "";
  const executar = (f: (i: AgendaItem) => void) => () => {
    if (!item) return;
    props.onFechar();
    f(item);
  };

  const dataExtensa = item
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: props.fuso,
      }).format(new Date(item.inicio))
    : "";
  const faixaDeHorario = item
    ? `${hora(item.inicio, props.fuso)} · ${hora(item.fim, props.fuso)}`
    : "";
  const confirmado = item?.confirmadoEm && item.status === "agendado";

  return (
    <>
      <Sheet open={props.aberto && Boolean(item)} onOpenChange={(v) => !v && props.onFechar()}>
        <SheetContent
          side={props.lateral ? "right" : "bottom"}
          arrastarParaFechar
          className={`agenda-painel agenda-ficha mov-agenda-painel border-0 bg-ink px-4 pt-3 sm:px-5 sm:pt-5 ${props.lateral ? "w-[380px]" : "mx-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px]"}`}
        >
          {item ? (
            <>
              <div className="mb-3 flex justify-center md:hidden" aria-hidden="true">
                <span className="h-1.5 w-12 rounded-full bg-mute/50" />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28 [scrollbar-width:thin]">
                {/* Como no Figaro: quem, quando e com quem num cartão; o cliente logo abaixo. */}
                <section className="agenda-ficha-cartao">
                  <SheetHeader className="space-y-1 p-4 pb-3 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <SheetTitle className="min-w-0 truncate text-xl font-bold text-paper">
                        {item.cliente}
                      </SheetTitle>
                      {confirmado ? (
                        <span className="agenda-ficha-confirmado">
                          <CircleCheck aria-hidden className="size-4" /> Confirmado
                        </span>
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                    </div>
                    <SheetDescription className="text-sm text-mute">
                      {dataExtensa}{" "}
                      <span className="font-mono tabular-nums text-paper">{faixaDeHorario}</span>
                    </SheetDescription>
                    <span className="agenda-ficha-profissional">
                      <span className="agenda-ficha-avatar" aria-hidden>
                        {item.profissional.trim().charAt(0).toUpperCase()}
                      </span>
                      {item.profissional.split(" ")[0]}
                    </span>
                  </SheetHeader>
                  <div className="agenda-ficha-cliente">
                    <span className="agenda-ficha-avatar is-cliente" aria-hidden>
                      <UserRound className="size-4" />
                    </span>
                    {item.clienteId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto min-w-0 flex-1 justify-start truncate p-0 text-base font-normal text-paper hover:bg-transparent"
                        onClick={() => {
                          const id = item.clienteId;
                          props.onFechar();
                          if (id) props.onPerfil(id);
                        }}
                      >
                        <span className="truncate">{item.cliente}</span>
                      </Button>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-base text-paper">
                        {item.cliente}
                      </span>
                    )}
                    {telefone ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label={`Ligar para ${item.cliente}`}
                      >
                        <a href={`tel:${telefone}`}>
                          <Phone />
                        </a>
                      </Button>
                    ) : null}
                    {whatsapp ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label={`Abrir WhatsApp para ${item.cliente}`}
                      >
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                          <MessageCircle />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </section>

                {!props.online ? (
                  <p className="mt-3 text-xs font-semibold text-mute">
                    Sem conexão: as ações voltam quando a internet voltar.
                  </p>
                ) : null}

                {/* A ação do momento continua à mão (o Figaro não tinha as etapas do Cortaí). */}
                <div className="mt-3 grid gap-2">
                  {item.status === "agendado" ? (
                    <Button
                      size="lg"
                      variant="primary"
                      className="min-h-14 w-full"
                      disabled={bloqueado}
                      onClick={executar(props.onChegou)}
                    >
                      <UserRoundPlus /> Cliente chegou
                    </Button>
                  ) : null}
                  {item.status === "chegou" ? (
                    <Button
                      size="lg"
                      variant="primary"
                      className="min-h-14 w-full"
                      disabled={bloqueado}
                      onClick={executar(props.onIniciar)}
                    >
                      <Scissors /> Começar
                    </Button>
                  ) : null}
                  {item.status === "na_cadeira" ? (
                    <Button
                      size="lg"
                      variant="primary"
                      className="min-h-14 w-full"
                      disabled={bloqueado}
                      onClick={executar(props.onComanda)}
                    >
                      <Check /> Finalizar e cobrar
                    </Button>
                  ) : null}
                </div>

                <p className="mb-2 mt-5 text-sm font-medium text-mute">Serviços</p>
                <section className="agenda-ficha-cartao">
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-paper">{item.servico}</p>
                      <p className="truncate text-sm text-mute">{item.profissional}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-paper">{brl(item.valor_centavos ?? 0)}</p>
                      <p className="font-mono text-sm tabular-nums text-mute">{faixaDeHorario}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-line p-4">
                    <span className="font-semibold text-paper">Total</span>
                    <span className="font-semibold text-paper">
                      {brl(item.valor_centavos ?? 0)}
                    </span>
                  </div>
                </section>
              </div>

              {/* Rodapé do Figaro: "Reagendar" com a seta que abre as outras ações (aqui também
                  ficam Notas, Cobrar e a comanda, que o Figaro não tinha). */}
              <div className="agenda-ficha-rodape">
                {maisAcoes ? (
                  <div className="agenda-ficha-menu" role="menu">
                    {item.clienteId ? (
                      <Button
                        role="menuitem"
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          const id = item.clienteId;
                          setMaisAcoes(false);
                          props.onFechar();
                          if (id) props.onPerfil(id);
                        }}
                      >
                        <NotebookPen /> Notas do cliente
                      </Button>
                    ) : null}
                    {pendente || item.status === "finalizado" ? (
                      <Button
                        role="menuitem"
                        variant="ghost"
                        className="justify-start"
                        disabled={!props.online}
                        onClick={() => {
                          setMaisAcoes(false);
                          executar(props.onComanda)();
                        }}
                      >
                        <HandCoins /> {pendente ? "Cobrar" : "Pagamento"}
                      </Button>
                    ) : null}
                    <VerTicketDoAgendamento
                      agendamentoId={item.id}
                      desabilitado={!props.online}
                      className="agenda-ficha-menu-item"
                      onAbrir={(comandaId) => {
                        setMaisAcoes(false);
                        props.onFechar();
                        props.onVerComanda(item, comandaId);
                      }}
                    />
                    {pendente ? (
                      <Button
                        role="menuitem"
                        variant="ghost"
                        className="justify-start"
                        disabled={bloqueado}
                        onClick={() => {
                          setMaisAcoes(false);
                          setConfirmacao("falta");
                        }}
                      >
                        <UserX /> Marcar falta
                      </Button>
                    ) : null}
                    {pendente ? (
                      <Button
                        role="menuitem"
                        variant="ghost"
                        className="justify-start text-brick hover:text-brick"
                        disabled={bloqueado}
                        onClick={() => {
                          setMaisAcoes(false);
                          if (item.confirmadoEm) setConfirmacao("cancelar");
                          else executar(props.onCancelar)();
                        }}
                      >
                        <Trash2 /> Cancelar agendamento
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex items-center gap-1">
                  {pendente ? (
                    <Button
                      size="lg"
                      variant="primary"
                      className="agenda-ficha-reagendar"
                      disabled={bloqueado}
                      onClick={() => {
                        setMaisAcoes(false);
                        setReagendando(true);
                      }}
                    >
                      Reagendar
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    variant="primary"
                    className={`agenda-ficha-mais ${pendente ? "" : "is-sozinho"}`}
                    aria-label={maisAcoes ? "Fechar outras ações" : "Outras ações"}
                    aria-expanded={maisAcoes}
                    onClick={() => setMaisAcoes((v) => !v)}
                  >
                    <ChevronDown
                      aria-hidden
                      className={`transition-transform duration-200 ${maisAcoes ? "rotate-180" : ""}`}
                    />
                  </Button>
                </div>
              </div>
              <TelaReagendar
                item={item}
                aberto={reagendando}
                fuso={props.fuso}
                profissionais={props.profissionais}
                bloqueado={bloqueado}
                onVoltar={() => setReagendando(false)}
                onVerificar={props.onVerificar}
                onRemarcar={remarcar}
              />
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(confirmacao)}
        onOpenChange={(aberto) => !aberto && setConfirmacao(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmacao === "falta"
                ? `Marcar falta de ${item?.cliente}?`
                : `Cancelar o horário de ${item?.cliente}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmacao === "falta"
                ? "O atendimento será registrado como não comparecimento. Você poderá desfazer por 5 segundos."
                : "Esse cliente já confirmou presença pelo WhatsApp. Você ainda poderá desfazer por 5 segundos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const acao = confirmacao;
                setConfirmacao(null);
                if (acao === "falta") executar(props.onFalta)();
                else executar(props.onCancelar)();
              }}
            >
              {confirmacao === "falta" ? "Marcar falta" : "Cancelar horário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
