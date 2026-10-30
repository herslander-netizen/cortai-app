import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, CalendarClock, CalendarPlus, CalendarX, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  GrupoDeLinhas,
  LinhaComInterruptor,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { aviso } from "@/lib/avisos";
import {
  definirAvisoDoCliente,
  getAvisosDosClientes,
  type AvisosDosClientes,
  type ChaveDeAvisoDeCliente,
} from "@/lib/avisos-clientes.functions";

/** Os quatro eventos do Figaro (`NotificationMessageType`), cada um ligado às mensagens que já existem no Flow. */
const EVENTOS = [
  {
    id: "novo",
    rotulo: "Novo agendamento",
    icone: CalendarPlus,
    chaves: ["confirmacao_agendamento"],
    detalhe: "Confirmação enviada assim que o horário é marcado.",
  },
  {
    id: "lembrete",
    rotulo: "Lembrete de horário",
    icone: BellRing,
    chaves: ["lembrete_24h", "lembrete_2h"],
    detalhe: "Lembra o cliente antes do horário.",
  },
  {
    id: "reagendamento",
    rotulo: "Reagendamento",
    icone: CalendarClock,
    chaves: ["alteracao_agendamento"],
    detalhe: "Avisa quando o dia ou o horário mudam.",
  },
  {
    id: "cancelamento",
    rotulo: "Cancelamento",
    icone: CalendarX,
    chaves: ["cancelamento_agendamento"],
    detalhe: "Avisa quando o horário é cancelado.",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  rotulo: string;
  icone: LucideIcon;
  chaves: readonly ChaveDeAvisoDeCliente[];
  detalhe: string;
}>;

type Evento = (typeof EVENTOS)[number];

/** Antecedências que os modelos aprovados suportam (véspera e no dia), como os chips do Figaro (`LeadTimesSection`). */
const ANTECEDENCIAS = [
  { chave: "lembrete_24h", rotulo: "24 h antes", detalhe: "Véspera" },
  { chave: "lembrete_2h", rotulo: "2 h antes", detalhe: "No dia" },
] as const;

const CHAVE = ["avisos-dos-clientes"] as const;

function resumo(evento: Evento, d: AvisosDosClientes) {
  if (!d.whatsappGeral) return "Pausado: WhatsApp desligado no negócio";
  if (evento.id === "lembrete") {
    const horas = ANTECEDENCIAS.filter((a) => d.ligados[a.chave]).map((a) => a.rotulo);
    return horas.length ? `WhatsApp · ${horas.join(" e ")}` : "Desligado";
  }
  return d.ligados[evento.chaves[0]] ? "WhatsApp · Disparo imediato" : "Desligado";
}

/** "Para clientes" de Avisos e Lembretes, no desenho do Figaro: quatro eventos e uma folha com o canal. */
export function AvisosParaClientes() {
  const queryClient = useQueryClient();
  const carregar = useServerFn(getAvisosDosClientes);
  const definir = useServerFn(definirAvisoDoCliente);
  const consulta = useQuery({ queryKey: CHAVE, queryFn: () => carregar() });
  const [aberto, setAberto] = useState<Evento | null>(null);

  const salvar = useMutation({
    mutationFn: (mudancas: { chave: ChaveDeAvisoDeCliente; ativa: boolean }[]) =>
      Promise.all(mudancas.map((m) => definir({ data: m }))),
    onMutate: async (mudancas) => {
      await queryClient.cancelQueries({ queryKey: CHAVE });
      const anterior = queryClient.getQueryData<AvisosDosClientes>(CHAVE);
      queryClient.setQueryData<AvisosDosClientes>(CHAVE, (atual) =>
        atual
          ? {
              ...atual,
              ligados: {
                ...atual.ligados,
                ...Object.fromEntries(mudancas.map((m) => [m.chave, m.ativa])),
              },
            }
          : atual,
      );
      return { anterior };
    },
    onError: (_erro, _m, contexto) => {
      queryClient.setQueryData(CHAVE, contexto?.anterior);
      aviso.erro("Não deu certo salvar este aviso. Tenta de novo?");
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: CHAVE }),
  });

  const d = consulta.data;
  const editavel = !!d?.podeEditar && !salvar.isPending;
  const ligadoNoEvento = (e: Evento) => !!d && e.chaves.some((c) => d.ligados[c]);

  return (
    <>
      <SecaoDeConfiguracao
        titulo="Eventos de agendamento"
        rodape={
          d && !d.podeEditar
            ? "Só quem configura as automações pode mudar estes avisos."
            : "Mensagens que o cliente recebe no WhatsApp a cada etapa do agendamento."
        }
      >
        <GrupoDeLinhas>
          {EVENTOS.map((e) => (
            <LinhaDeConfiguracao
              key={e.id}
              icone={e.icone}
              titulo={e.rotulo}
              suporte={d ? resumo(e, d) : "Carregando…"}
              aoTocar={() => setAberto(e)}
              desabilitada={!d}
            />
          ))}
        </GrupoDeLinhas>
      </SecaoDeConfiguracao>

      <Sheet open={aberto !== null} onOpenChange={(v) => !v && setAberto(null)}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-[520px] rounded-t-[28px]">
          <SheetHeader className="text-left">
            <SheetTitle>{aberto?.rotulo}</SheetTitle>
            <SheetDescription>{aberto?.detalhe}</SheetDescription>
          </SheetHeader>
          {aberto && d ? (
            <div className="mt-4 space-y-5">
              <GrupoDeLinhas>
                <LinhaComInterruptor
                  titulo="WhatsApp"
                  suporte={
                    d.whatsappGeral
                      ? "Mensagem no WhatsApp do cliente."
                      : "O WhatsApp do negócio está desligado: nada sai até ser religado."
                  }
                  marcado={ligadoNoEvento(aberto)}
                  desabilitado={!editavel}
                  aoMudar={() => {
                    const ligar = !ligadoNoEvento(aberto);
                    // Lembrete ligado volta pela véspera; desligado apaga as duas antecedências.
                    salvar.mutate(
                      aberto.id === "lembrete"
                        ? ligar
                          ? [{ chave: "lembrete_24h", ativa: true }]
                          : aberto.chaves.map((chave) => ({ chave, ativa: false }))
                        : [{ chave: aberto.chaves[0], ativa: ligar }],
                    );
                  }}
                />
              </GrupoDeLinhas>
              {aberto.id === "lembrete" ? (
                <section aria-labelledby="antecedencia-titulo">
                  <h3 id="antecedencia-titulo" className="px-1 text-sm font-semibold text-paper">
                    Antecedência
                  </h3>
                  <p className="px-1 text-xs text-mute">Até 2 lembretes por agendamento.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ANTECEDENCIAS.map((a) => {
                      const marcado = d.ligados[a.chave];
                      return (
                        <Button
                          key={a.chave}
                          type="button"
                          variant="ghost"
                          aria-pressed={marcado}
                          disabled={!editavel}
                          onClick={() => salvar.mutate([{ chave: a.chave, ativa: !marcado }])}
                          className={`h-auto min-h-12 rounded-full px-4 text-sm font-medium ${
                            marcado
                              ? "bg-[var(--figaro-secondary-container,var(--ink3))] text-[var(--figaro-on-secondary-container,var(--paper))]"
                              : "border border-[var(--figaro-outline,var(--line))] text-paper"
                          }`}
                        >
                          {a.rotulo}
                          <span className="font-normal text-mute">· {a.detalhe}</span>
                        </Button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
