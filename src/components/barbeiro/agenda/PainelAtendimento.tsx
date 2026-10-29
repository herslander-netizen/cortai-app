import {
  ArrowLeftRight,
  CalendarClock,
  CalendarX2,
  Check,
  ChevronDown,
  CircleCheck,
  CirclePlay,
  HandCoins,
  Info,
  MessageCircle,
  Phone,
  Scissors,
  Trash2,
  TriangleAlert,
  UserRound,
  UserRoundPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
import { useAgora } from "@/hooks/useAgora";
import { useFolhaEmDoisEstados } from "@/hooks/useFolhaEmDoisEstados";
import { FOLHA_CHEIA } from "@/lib/folha-dois-estados";
import { hojeNoFuso, isoNoFusoDaBarbearia } from "@/lib/horarios";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";
import { termos } from "@/lib/segmentos";

import {
  indicadorDeEstado,
  jaComecou,
  podeTrocarCliente,
  quandoDaFicha,
  rodapeDaFicha,
  type AcaoDaFicha,
  type IndicadorDeEstado,
} from "./ficha-regras";
import { FotoDoProfissional } from "./FotoDoProfissional";
import { TelaReagendar } from "./TelaReagendar";
import { TrocarCliente, type ClienteEscolhido } from "./TrocarCliente";
import { diaNoFuso, hora, linkWhatsApp } from "./tempo";

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
  profissionais: { id: string; nome: string; avatarUrl?: string | null }[];
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
  // Cliente trocado: vale na tela até a Agenda recarregar com o cliente novo.
  const [trocado, setTrocado] = useState<{ id: string; cliente: ClienteEscolhido } | null>(null);
  const base = props.item ?? (props.aberto ? remarcado : null);
  const item =
    base && trocado?.id === base.id && base.clienteId !== trocado.cliente.id
      ? {
          ...base,
          clienteId: trocado.cliente.id,
          cliente: trocado.cliente.nome,
          telefone: trocado.cliente.telefone,
          confirmadoEm: null,
        }
      : base;
  const [reagendando, setReagendando] = useState(false);
  const [trocandoCliente, setTrocandoCliente] = useState(false);
  const [maisAcoes, setMaisAcoes] = useState(false);
  // Como no Figaro: só o cancelamento pede confirmação; a falta tem o "Desfazer" de 5 s.
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const agora = useAgora();
  const segmento = useSegmentoDoPainel();
  // Duas etapas (decisão do dono, 26/10; substitui o cartão de um estado só de 24/10): abre na metade da tela,
  // a barrinha sobe até a altura exata do conteúdo (tudo à vista, sem rolar) e, para baixo, fecha de uma vez.
  const [folha, setFolha] = useState<HTMLDivElement | null>(null);
  const [conteudo, setConteudo] = useState<HTMLDivElement | null>(null);
  const [expandida, setExpandida] = useState(false);
  const { onFechar } = props;
  const fecharFicha = useCallback(() => onFechar(), [onFechar]);
  const alturaDoConteudo = useCallback(
    () =>
      folha && conteudo
        ? folha.offsetHeight - conteudo.clientHeight + conteudo.scrollHeight
        : window.innerHeight,
    [folha, conteudo],
  );
  // O gesto vale na ficha inteira (sem rolagem por dentro, puxar em qualquer ponto move a ficha).
  useFolhaEmDoisEstados(folha, folha, {
    ativo: props.aberto && !props.lateral,
    expandida,
    onExpandida: setExpandida,
    onFechar: fecharFicha,
    alturaDoConteudo,
  });
  useEffect(() => {
    if (props.aberto) setExpandida(false);
  }, [props.aberto, props.item?.id]);
  // Toque na barrinha (dono, 26/10): com conteúdo guardado, expande até mostrar tudo; já inteira, fecha.
  const tocarNaBarrinha = () => {
    if (!folha || !conteudo || expandida || conteudo.scrollHeight <= conteudo.clientHeight + 1) {
      props.onFechar();
      return;
    }
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    folha.style.transition = reduzido ? "none" : "max-height 280ms cubic-bezier(0.2, 0, 0, 1)";
    folha.style.maxHeight = `${Math.round(Math.min(alturaDoConteudo(), window.innerHeight * FOLHA_CHEIA))}px`;
    window.setTimeout(() => (folha.style.transition = ""), reduzido ? 0 : 300);
    setExpandida(true);
  };

  useEffect(() => {
    if (!props.aberto) {
      setRemarcado(null);
      setTrocado(null);
    }
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

  const itemId = item?.id ?? null;
  useEffect(() => {
    setReagendando(props.iniciarEm === "remarcar" && Boolean(itemId));
    setConfirmarCancelar(props.iniciarEm === "cancelar");
    setMaisAcoes(false);
    setTrocandoCliente(false);
  }, [itemId, props.aberto, props.iniciarEm]);

  const bloqueado = !props.online || props.ocupado;
  const whatsapp = item ? linkWhatsApp(item.telefone) : null;
  const telefone = item?.telefone?.replace(/\D/g, "") ?? "";
  const executar = (f: (i: AgendaItem) => void) => () => {
    if (!item) return;
    props.onFechar();
    f(item);
  };

  const quando = item
    ? quandoDaFicha(
        item.inicio,
        props.fuso,
        hojeNoFuso(props.fuso),
        diaNoFuso(item.inicio, props.fuso),
      )
    : "";
  const faixaDeHorario = item
    ? `${hora(item.inicio, props.fuso)} · ${hora(item.fim, props.fuso)}`
    : "";
  const estado = item ? indicadorDeEstado(item, agora, termos(segmento).statusAtendimento) : null;
  const rodape = item ? rodapeDaFicha(item, agora) : { principal: null, menu: [] };
  const emCurso = item ? jaComecou(item, agora) && item.status !== "finalizado" : false;

  /** Rótulo, ícone e efeito de cada ação da ficha (uma tabela só para o botão e a seta). */
  const acoes: Record<
    Exclude<AcaoDaFicha, "comanda">,
    { rotulo: string; Icone: LucideIcon; destrutiva?: boolean; agir: () => void }
  > = {
    reagendar: {
      rotulo: "Reagendar",
      Icone: CalendarClock,
      agir: () => setReagendando(true),
    },
    chegou: { rotulo: "Cliente chegou", Icone: UserRoundPlus, agir: executar(props.onChegou) },
    comecar: {
      rotulo: item?.clienteId ? "Começar" : "Vincular cliente",
      Icone: item?.clienteId ? Scissors : UserRoundPlus,
      agir: item?.clienteId ? executar(props.onIniciar) : () => setTrocandoCliente(true),
    },
    finalizar: { rotulo: "Finalizar e cobrar", Icone: Check, agir: executar(props.onComanda) },
    cobrar: {
      rotulo: item?.status === "finalizado" ? "Pagamento" : "Cobrar",
      Icone: HandCoins,
      agir: executar(props.onComanda),
    },
    falta: { rotulo: "Não compareceu", Icone: UserX, agir: executar(props.onFalta) },
    cancelar: {
      rotulo: "Cancelar agendamento",
      Icone: Trash2,
      destrutiva: true,
      agir: () => setConfirmarCancelar(true),
    },
  };
  const verComanda = (classe: string) =>
    item ? (
      <VerTicketDoAgendamento
        agendamentoId={item.id}
        desabilitado={!props.online}
        className={classe}
        onAbrir={(comandaId) => {
          setMaisAcoes(false);
          props.onFechar();
          props.onVerComanda(item, comandaId);
        }}
      />
    ) : null;

  return (
    <>
      <Sheet open={props.aberto && Boolean(item)} onOpenChange={(v) => !v && props.onFechar()}>
        <SheetContent
          ref={setFolha}
          side={props.lateral ? "right" : "bottom"}
          arrastarParaFechar={props.lateral ?? false}
          esconderX={!props.lateral}
          className={`agenda-painel agenda-ficha mov-agenda-painel border-0 bg-ink px-4 sm:px-5 ${props.lateral ? "pt-3 sm:pt-5 w-[380px]" : "agenda-ficha-cartao-unico mx-auto flex max-h-[62dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] pt-0"}`}
        >
          {!props.lateral ? (
            <div
              role="button"
              tabIndex={0}
              aria-label={expandida ? "Fechar a ficha" : "Ver a ficha inteira"}
              className="agenda-ficha-alca"
              onClick={tocarNaBarrinha}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  tocarNaBarrinha();
                }
              }}
            >
              <span aria-hidden />
            </div>
          ) : null}
          {item && estado ? (
            <>
              {/* Nunca rola (dono, 26/10): na primeira etapa o resto fica guardado; puxando, a ficha vai até a
                  altura do conteúdo, que pode ocupar a tela toda. O botão do rodapé fica fora, sempre à vista. */}
              <div
                ref={setConteudo}
                className={`min-h-0 flex-1 ${props.lateral ? "overflow-y-auto overscroll-contain pb-28 [scrollbar-width:thin]" : "overflow-hidden pb-2"}`}
              >
                {/* Como no Figaro (`AppointmentHeroGroup`): o serviço, o estado, quando e com
                    quem; o cliente num bloco logo abaixo. */}
                <section className="agenda-ficha-cartao">
                  <SheetHeader className="space-y-1 p-4 pb-3 text-left">
                    <SheetTitle className="min-w-0 truncate text-xl font-bold text-paper">
                      {item.servico}
                    </SheetTitle>
                    <LinhaDeEstado estado={estado} />
                    <SheetDescription className="flex flex-wrap items-baseline gap-x-1 text-sm font-semibold text-mute">
                      <span>{quando}</span>
                      <span className="font-mono font-medium tabular-nums">{faixaDeHorario}</span>
                    </SheetDescription>
                    <span className="agenda-ficha-profissional mt-1">
                      <FotoDoProfissional
                        nome={item.profissional}
                        url={
                          props.profissionais.find((p) => p.id === item.profissionalId)?.avatarUrl
                        }
                      />
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
                        className="h-auto min-w-0 flex-1 justify-start truncate p-0 text-base font-semibold text-paper hover:bg-transparent"
                        onClick={() => {
                          const id = item.clienteId;
                          props.onFechar();
                          if (id) props.onPerfil(id);
                        }}
                      >
                        <span className="truncate">{item.cliente}</span>
                      </Button>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-base font-semibold text-paper">
                        {item.cliente || "Sem cliente"}
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

                {podeTrocarCliente(item) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={bloqueado}
                    className="agenda-ficha-trocar"
                    onClick={() => setTrocandoCliente(true)}
                  >
                    <ArrowLeftRight aria-hidden className="size-4" /> Trocar cliente
                  </Button>
                ) : null}

                {!props.online ? (
                  <p className="mt-3 text-xs font-semibold text-mute">
                    Sem conexão: as ações voltam quando a internet voltar.
                  </p>
                ) : null}

                <p className="agenda-ficha-secao">Serviços</p>
                <section className="agenda-ficha-cartao">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-paper">{item.servico}</p>
                      <p className="truncate text-sm font-medium text-mute">{item.profissional}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums text-paper">
                        {brl(item.valor_centavos ?? 0)}
                      </p>
                      <p className="font-mono text-sm tabular-nums text-mute">{faixaDeHorario}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-line px-4 py-3">
                    <span className="font-bold text-paper">Total</span>
                    <span className="text-lg font-bold tabular-nums text-paper">
                      {brl(item.valor_centavos ?? 0)}
                    </span>
                  </div>
                </section>

                {item.ficha ? (
                  <>
                    <p className="agenda-ficha-secao">Observações</p>
                    <section className="agenda-ficha-cartao whitespace-pre-line px-4 py-3 text-sm text-paper">
                      {item.ficha}
                    </section>
                  </>
                ) : null}

                {emCurso ? (
                  <p className="agenda-ficha-nota">
                    <Info aria-hidden className="size-4 shrink-0" />
                    Em andamento — os serviços podem ser ajustados na cobrança.
                  </p>
                ) : null}
              </div>

              {/* Rodapé do Figaro: o botão principal à direita e, se houver mais ações, a seta. */}
              {rodape.principal ? (
                <div className="agenda-ficha-rodape">
                  {maisAcoes && rodape.menu.length ? (
                    <div className="agenda-ficha-menu" role="menu">
                      {rodape.menu.map((acao) => {
                        if (acao === "comanda")
                          return <span key={acao}>{verComanda("agenda-ficha-menu-item")}</span>;
                        const { rotulo, Icone, destrutiva, agir } = acoes[acao];
                        return (
                          <Button
                            key={acao}
                            role="menuitem"
                            variant="ghost"
                            className={`justify-start ${destrutiva ? "text-brick hover:text-brick" : ""}`}
                            disabled={bloqueado}
                            onClick={() => {
                              setMaisAcoes(false);
                              agir();
                            }}
                          >
                            <Icone /> {rotulo}
                          </Button>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1">
                    {rodape.principal === "comanda" ? (
                      verComanda(
                        `agenda-ficha-reagendar is-tonal ${rodape.menu.length ? "" : "is-sozinho"}`,
                      )
                    ) : (
                      <BotaoPrincipal
                        {...acoes[rodape.principal]}
                        sozinho={!rodape.menu.length}
                        disabled={bloqueado}
                        onClick={() => {
                          setMaisAcoes(false);
                          acoes[rodape.principal as Exclude<AcaoDaFicha, "comanda">].agir();
                        }}
                      />
                    )}
                    {rodape.menu.length ? (
                      <Button
                        size="icon"
                        variant="primary"
                        className={`agenda-ficha-mais ${rodape.principal === "comanda" ? "is-tonal" : ""}`}
                        aria-label={maisAcoes ? "Fechar outras ações" : "Outras ações"}
                        aria-expanded={maisAcoes}
                        onClick={() => setMaisAcoes((v) => !v)}
                      >
                        <ChevronDown
                          aria-hidden
                          className={`transition-transform duration-200 ${maisAcoes ? "rotate-180" : ""}`}
                        />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <TrocarCliente
                item={item}
                aberto={trocandoCliente}
                bloqueado={bloqueado}
                onAberto={setTrocandoCliente}
                onTrocado={(cliente) => setTrocado({ id: item.id, cliente })}
              />
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

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              O horário sai da sua agenda e o cliente é avisado pelo WhatsApp, quando ele estiver
              ligado. Você ainda pode desfazer por 5 segundos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter agendamento</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brick text-[color:var(--figaro-on-error)] hover:bg-brick/90"
              onClick={() => {
                setConfirmarCancelar(false);
                executar(props.onCancelar)();
              }}
            >
              Cancelar agendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const ICONE_DO_ESTADO: Record<IndicadorDeEstado["tom"], LucideIcon> = {
  andamento: CirclePlay,
  sucesso: CircleCheck,
  aviso: CalendarClock,
  erro: CalendarX2,
  neutro: CircleCheck,
};

/** Ícone + texto na cor do estado (Figaro: `StatusIndicatorRow`). */
function LinhaDeEstado({ estado }: { estado: IndicadorDeEstado }) {
  const Icone = estado.rotulo === "Não compareceu" ? TriangleAlert : ICONE_DO_ESTADO[estado.tom];
  return (
    <span className={`agenda-ficha-estado is-${estado.tom}`}>
      <Icone aria-hidden className="size-5" />
      {estado.rotulo}
    </span>
  );
}

function BotaoPrincipal({
  rotulo,
  Icone,
  sozinho,
  disabled,
  onClick,
}: {
  rotulo: string;
  Icone: LucideIcon;
  sozinho: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="lg"
      variant="primary"
      className={`agenda-ficha-reagendar ${sozinho ? "is-sozinho" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <Icone aria-hidden /> {rotulo}
    </Button>
  );
}
