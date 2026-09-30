import {
  Ban,
  CalendarPlus,
  Check,
  Clock3,
  HandCoins,
  MessageCircle,
  NotebookPen,
  Scissors,
  UserRoundPlus,
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
  onFalta: (item: AgendaItem) => void;
  onCancelar: (item: AgendaItem) => void;
  onPerfil: (clienteId: string) => void;
  onVerificar: (item: AgendaItem, pedido: PedidoRemarcar) => Promise<boolean>;
  onRemarcar: (item: AgendaItem, pedido: PedidoRemarcar) => Promise<void>;
};

/** Painel único do atendimento, usado na agenda e no Modo Foco. */
export function PainelAtendimento(props: Props) {
  const { item } = props;
  const [remarcar, setRemarcar] = useState<PedidoRemarcar | null>(null);
  const [erroRemarcar, setErroRemarcar] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  useEffect(() => {
    setRemarcar(null);
    setErroRemarcar(null);
  }, [item?.id, props.aberto]);

  const pendente = item?.status === "agendado" || item?.status === "chegou";
  const bloqueado = !props.online || props.ocupado;
  const whatsapp = item ? linkWhatsApp(item.telefone) : null;
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
              <div className="agenda-painel-acoes mt-4">
                {item.status === "agendado" ? (
                  <Button variant="outline" disabled={bloqueado} onClick={executar(props.onChegou)}>
                    <UserRoundPlus /> Chegou
                  </Button>
                ) : null}
                {pendente ? (
                  <Button
                    variant="outline"
                    disabled={bloqueado}
                    onClick={executar(props.onIniciar)}
                  >
                    <Scissors /> Iniciar
                  </Button>
                ) : null}
                {item.status === "na_cadeira" ? (
                  <Button
                    variant="outline"
                    disabled={bloqueado}
                    onClick={executar(props.onComanda)}
                  >
                    <Check /> Concluir
                  </Button>
                ) : null}
                {pendente ? (
                  <Button
                    variant="outline"
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
                  <Button variant="outline" disabled={bloqueado} onClick={executar(props.onFalta)}>
                    <Clock3 /> Falta
                  </Button>
                ) : null}
                {pendente ? (
                  <Button
                    variant="outline"
                    disabled={bloqueado}
                    onClick={() => {
                      if (item.confirmadoEm) setConfirmarCancelar(true);
                      else executar(props.onCancelar)();
                    }}
                  >
                    <Ban /> Cancelar
                  </Button>
                ) : null}
                {whatsapp ? (
                  <Button asChild variant="outline">
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir conversa com ${item.cliente} no WhatsApp`}
                    >
                      <MessageCircle /> WhatsApp
                    </a>
                  </Button>
                ) : null}
                {item.clienteId ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const id = item.clienteId;
                      props.onFechar();
                      if (id) props.onPerfil(id);
                    }}
                  >
                    <NotebookPen /> Notas do cliente
                  </Button>
                ) : null}
                {pendente || item.status === "finalizado" ? (
                  <Button
                    variant="outline"
                    disabled={!props.online}
                    onClick={executar(props.onComanda)}
                  >
                    <HandCoins /> Comanda
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

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o horário de {item?.cliente}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse cliente já confirmou presença pelo WhatsApp. Você ainda poderá desfazer por 5
              segundos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarCancelar(false);
                executar(props.onCancelar)();
              }}
            >
              Cancelar horário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
