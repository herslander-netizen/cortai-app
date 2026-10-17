import {
  Ban,
  CalendarPlus,
  Check,
  HandCoins,
  MessageCircle,
  PhoneCall,
  NotebookPen,
  Phone,
  Scissors,
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
  const { item } = props;
  const [remarcar, setRemarcar] = useState<PedidoRemarcar | null>(null);
  const [erroRemarcar, setErroRemarcar] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<"cancelar" | "falta" | null>(null);
  const [escolhaWhatsApp, setEscolhaWhatsApp] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const compacto = !props.lateral;

  useEffect(() => {
    setRemarcar(
      props.iniciarEm === "remarcar" && item
        ? {
            dia: diaNoFuso(item.inicio, props.fuso),
            hora: hora(item.inicio, props.fuso),
            profissionalId: item.profissionalId ?? null,
          }
        : null,
    );
    setConfirmacao(props.iniciarEm === "cancelar" ? "cancelar" : null);
    setErroRemarcar(null);
    setExpandido(Boolean(props.iniciarEm));
  }, [item, props.aberto, props.fuso, props.iniciarEm]);

  const pendente = item?.status === "agendado" || item?.status === "chegou";
  const bloqueado = !props.online || props.ocupado;
  const whatsapp = item ? linkWhatsApp(item.telefone) : null;
  const telefone = item?.telefone?.replace(/\D/g, "") ?? "";
  const executar = (f: (i: AgendaItem) => void) => () => {
    if (!item) return;
    props.onFechar();
    f(item);
  };

  async function enviarRemarcar() {
    if (!item || !remarcar) return;
    setErroRemarcar(null);
    setVerificando(true);
    try {
      const livre = await props.onVerificar(item, remarcar);
      if (!livre) {
        const nome = props.profissionais.find((p) => p.id === remarcar.profissionalId)?.nome;
        setErroRemarcar(`Esse horário está ocupado${nome ? ` para ${nome}` : ""}. Escolha outro.`);
        return;
      }
      props.onFechar();
      await props.onRemarcar(item, remarcar);
    } catch (e) {
      setErroRemarcar(e instanceof Error ? e.message : "Não foi possível conferir o horário.");
    } finally {
      setVerificando(false);
    }
  }

  return (
    <>
      <Sheet open={props.aberto && Boolean(item)} onOpenChange={(v) => !v && props.onFechar()}>
        <SheetContent
          side={props.lateral ? "right" : "bottom"}
          arrastarParaFechar
          className={`agenda-painel mov-agenda-painel border-line bg-ink2 px-5 pt-5 ${props.lateral ? "w-[380px]" : "mx-auto max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl"}`}
        >
          {item ? (
            <>
              <SheetHeader className="pr-10 text-left">
                <SheetTitle className="truncate text-lg text-paper">{item.cliente}</SheetTitle>
                <SheetDescription className="text-sm text-mute">
                  {hora(item.inicio, props.fuso)} · {item.servico} · {item.profissional}
                </SheetDescription>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={item.status} />
                  {item.confirmadoEm && item.status === "agendado" ? (
                    <StatusBadge status="confirmado" label="Confirmou pelo WhatsApp" />
                  ) : null}
                </div>
              </SheetHeader>
              {!props.online ? (
                <p className="mt-3 text-xs font-semibold text-mute">
                  Sem conexão: as ações voltam quando a internet voltar.
                </p>
              ) : null}
              <div className="mt-5 grid gap-3">
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

                {telefone || whatsapp ? (
                  <div
                    className={`grid gap-2 ${telefone && whatsapp ? "grid-cols-2" : "grid-cols-1"}`}
                    aria-label="Contato do cliente"
                  >
                    {telefone ? (
                      <Button asChild variant="outline" className="min-h-12">
                        <a href={`tel:${telefone}`} aria-label={`Ligar para ${item.cliente}`}>
                          <Phone /> Ligar
                        </a>
                      </Button>
                    ) : null}
                    {whatsapp ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12"
                        aria-label={`Escolher ligação ou mensagem no WhatsApp para ${item.cliente}`}
                        onClick={() => setEscolhaWhatsApp(true)}
                      >
                        <MessageCircle /> WhatsApp
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {(!compacto || expandido) ? (
                  <>
                <div className="grid grid-cols-2 gap-2" aria-label="Registro do atendimento">
                  {item.clienteId ? (
                    <Button
                      variant="outline"
                      className="min-h-12"
                      onClick={() => {
                        const id = item.clienteId;
                        props.onFechar();
                        if (id) props.onPerfil(id);
                      }}
                    >
                      <NotebookPen /> Notas
                    </Button>
                  ) : null}
                  {pendente || item.status === "finalizado" ? (
                    <Button
                      variant="outline"
                      className="min-h-12"
                      disabled={!props.online}
                      onClick={executar(props.onComanda)}
                    >
                      <HandCoins /> {pendente ? "Cobrar" : "Pagamento"}
                    </Button>
                  ) : null}
                  <VerTicketDoAgendamento
                    agendamentoId={item.id}
                    desabilitado={!props.online}
                    onAbrir={(comandaId) => {
                      props.onFechar();
                      props.onVerComanda(item, comandaId);
                    }}
                  />
                </div>

                {pendente ? (
                  <p className="border-t border-line pt-3 text-xs font-bold uppercase text-mute">
                    Ajustar horário
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {pendente ? (
                    <Button
                      variant="ghost"
                      className="min-h-12"
                      disabled={bloqueado}
                      onClick={() =>
                        setRemarcar({
                          dia: diaNoFuso(item.inicio, props.fuso),
                          hora: hora(item.inicio, props.fuso),
                          profissionalId: item.profissionalId ?? null,
                        })
                      }
                    >
                      <CalendarPlus /> Remarcar
                    </Button>
                  ) : null}
                  {pendente ? (
                    <Button
                      variant="ghost"
                      className="min-h-12"
                      disabled={bloqueado}
                      onClick={() => setConfirmacao("falta")}
                    >
                      <UserX /> Faltou
                    </Button>
                  ) : null}
                  {pendente ? (
                    <Button
                      variant="destructive"
                      className="min-h-12"
                      disabled={bloqueado}
                      onClick={() => {
                        if (item.confirmadoEm) setConfirmacao("cancelar");
                        else executar(props.onCancelar)();
                      }}
                    >
                      <Ban /> Cancelar
                    </Button>
                  ) : null}
                </div>
                  </>
                ) : null}
                {compacto ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full"
                    aria-expanded={expandido}
                    onClick={() => setExpandido((aberto) => !aberto)}
                  >
                    {expandido ? "Mostrar menos" : "Mais ações"}
                  </Button>
                ) : null}
              </div>
              {remarcar ? (
                <form
                  className="mt-2 grid gap-3 border-t border-line pt-4 pb-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void enviarRemarcar();
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-mute">
                      Dia
                      <input
                        type="date"
                        required
                        value={remarcar.dia}
                        onChange={(e) => setRemarcar({ ...remarcar, dia: e.target.value })}
                        className="agenda-campo"
                      />
                    </label>
                    <label className="text-xs font-semibold text-mute">
                      Horário
                      <input
                        type="time"
                        required
                        step={props.passoMin * 60}
                        value={remarcar.hora}
                        onChange={(e) => setRemarcar({ ...remarcar, hora: e.target.value })}
                        className="agenda-campo"
                      />
                    </label>
                  </div>
                  {props.profissionais.length > 1 ? (
                    <label className="text-xs font-semibold text-mute">
                      Profissional
                      <select
                        value={remarcar.profissionalId ?? ""}
                        onChange={(e) =>
                          setRemarcar({ ...remarcar, profissionalId: e.target.value || null })
                        }
                        className="agenda-campo"
                      >
                        {props.profissionais.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {erroRemarcar ? (
                    <p className="text-sm font-semibold text-brick" role="alert">
                      {erroRemarcar}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setRemarcar(null)}
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="flex-1"
                      disabled={bloqueado || verificando}
                    >
                      {verificando ? "Conferindo…" : "Remarcar"}
                    </Button>
                  </div>
                </form>
              ) : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={escolhaWhatsApp} onOpenChange={setEscolhaWhatsApp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como deseja falar com {item?.cliente}?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha se quer abrir o WhatsApp para fazer uma chamada ou enviar uma mensagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Button
              type="button"
              className="min-h-12 w-full"
              onClick={() => {
                if (!whatsapp) return;
                setEscolhaWhatsApp(false);
                window.open(whatsapp, "_blank", "noopener,noreferrer");
              }}
            >
              <PhoneCall /> Ligar pelo WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full"
              onClick={() => {
                if (!whatsapp) return;
                setEscolhaWhatsApp(false);
                window.open(whatsapp, "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle /> Enviar mensagem
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
