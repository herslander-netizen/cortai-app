import { EtapasAnimadas } from "@/components/ui/EtapasAnimadas";
import { CalendarDays, Check, Clock3, FileText, Scissors, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { ConteudoDoTicket } from "@/components/comanda/FolhaDoTicket";
import { ConfirmacaoRapida } from "@/components/ui/VistoAnimado";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SecaoDeFormulario } from "@/components/ui/formulario/SecaoDeFormulario";
import { brl } from "@/lib/format";
import { ESPERA_MS } from "@/lib/movimento-figaro";
import { TelaDeFormulario } from "@/components/ui/formulario/TelaDeFormulario";

import { SecaoCliente } from "./agendamento-manual/SecaoCliente";
import {
  AvisosAgendamento,
  SecaoHorario,
  SecaoPagamento,
  SecaoServico,
} from "./agendamento-manual/SecoesAgendamento";
import { useAgendamentoManual } from "./agendamento-manual/useAgendamentoManual";

/**
 * Agendamento de balcão em poucos toques: cliente (existente ou novo),
 * serviço, profissional, horário. Mesmas regras de disponibilidade do app.
 */
export function AgendamentoManual({
  dia,
  horaInicial,
  profissionalInicial,
  onCriado,
  gatilho = "primario",
  rotulo,
  autoAbrir = false,
  iniciarNovoCliente = false,
  onFechar,
}: {
  onFechar?: () => void;
  dia: string;
  horaInicial?: string;
  profissionalInicial?: string | null;
  onCriado?: (agendamentoId: string) => void;
  gatilho?: "primario" | "discreto";
  rotulo?: string;
  autoAbrir?: boolean;
  iniciarNovoCliente?: boolean;
}) {
  const [aberto, setAberto] = useState(autoAbrir);

  return (
    <>
      <Button
        variant={gatilho === "primario" ? "primary" : "ghost"}
        type="button"
        onClick={() => setAberto(true)}
        className={gatilho === "primario" ? "w-full text-sm" : "text-xs"}
      >
        {rotulo ?? (gatilho === "primario" ? "+ Novo agendamento" : "Marcar cliente aqui")}
      </Button>
      {aberto ? (
        <Formulario
          dia={dia}
          {...(horaInicial ? { horaInicial } : {})}
          profissionalInicial={profissionalInicial ?? null}
          iniciarNovoCliente={iniciarNovoCliente}
          onFechar={() => {
            setAberto(false);
            onFechar?.();
          }}
          onCriado={(agendamentoId) => {
            setAberto(false);
            onCriado?.(agendamentoId);
          }}
        />
      ) : null}
    </>
  );
}

function Formulario({
  dia,
  horaInicial = "09:00",
  profissionalInicial = null,
  onFechar,
  onCriado,
  iniciarNovoCliente = false,
}: {
  dia: string;
  horaInicial?: string;
  profissionalInicial?: string | null;
  onFechar: () => void;
  onCriado: (agendamentoId: string) => void;
  iniciarNovoCliente?: boolean;
}) {
  const s = useAgendamentoManual({
    dia,
    horaInicial,
    profissionalInicial,
    iniciarNovoCliente,
    onCriado,
  });
  const [verTicket, setVerTicket] = useState(false);
  const [etapa, setEtapa] = useState(0);
  // Figaro (`CreateReservationFlowScreen`): o botão fica em sucesso (✓ + rótulo) por 1200 ms; só depois
  // a tela troca para o que vem a seguir (aqui, a comanda).
  const [mostrarPainel, setMostrarPainel] = useState(false);
  useEffect(() => {
    if (!s.confirmado) return;
    const id = window.setTimeout(() => setMostrarPainel(true), ESPERA_MS.reservaCriada);
    return () => window.clearTimeout(id);
  }, [s.confirmado]);
  const painel = s.confirmado && mostrarPainel;

  const servico = s.base?.servicos.find((item) => item.id === s.servicoId);
  const profissional = s.base?.profissionais.find((item) => item.id === s.profissionalId);
  const nomeCliente = s.semCliente ? "" : s.clienteId ? s.clienteNome : s.novoNome.trim();
  const dataResumo = s.data
    ? new Date(s.data + "T12:00:00Z").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : s.data;
  const pagamento = {
    balcao: "No balcão",
    pix: "Pix",
    fiado: "Fiado",
    credito: "Crédito",
  }[s.forma];
  const etapas = [
    { titulo: "Cliente", detalhe: "Escolha alguém ou continue sem cliente" },
    { titulo: "Serviço", detalhe: "O que será feito" },
    { titulo: "Horário", detalhe: "Dia e hora do atendimento" },
    { titulo: "Resumo", detalhe: "Confira antes de confirmar" },
  ];
  const podeAvancar =
    [
      Boolean(s.semCliente || s.clienteId || (s.novo && s.nomeValido && s.telefoneValido)),
      Boolean(s.servicoId && s.profissionalId),
      Boolean(s.data && s.horaMin),
      s.pronto,
    ][etapa] ?? false;

  return (
    <TelaDeFormulario
      titulo="Novo agendamento"
      subtitulo={etapas[etapa]?.detalhe ?? "Agendamento em etapas."}
      sujo={s.sujo && !s.confirmado}
      onFechar={onFechar}
      {...(painel || etapa === 0
        ? {}
        : { onVoltar: () => setEtapa((atual) => Math.max(0, atual - 1)) })}
      {...(painel ? {} : { compacto: { passo: etapas[etapa]?.titulo ?? "", indice: etapa } })}
      {...(painel
        ? {}
        : s.confirmado
          ? {
              acao: {
                rotulo: "Confirmar agendamento",
                onClick: () => {},
                sucesso: true,
                morfo: true,
                flutuante: { icone: "visto" },
              },
            }
          : {
              acao: {
                rotulo: etapa < etapas.length - 1 ? "Continuar" : "Confirmar agendamento",
                onClick: () => {
                  if (etapa < etapas.length - 1) setEtapa((atual) => Math.min(atual + 1, 3));
                  else void s.salvar();
                },
                desabilitada: !podeAvancar,
                carregando: s.salvando,
                flutuante: { icone: etapa < etapas.length - 1 ? "seta" : "visto" },
              },
            })}
    >
      {painel ? (
        <>
          <ConfirmacaoRapida texto="Pronto. Agendamento criado." />
          {s.criado?.comandaId && verTicket ? (
            <div className="mt-6">
              <ConteudoDoTicket comandaId={s.criado.comandaId} />
              <Button
                variant="ghost"
                className="mx-auto mt-3 flex h-12 w-full max-w-[360px] rounded-full"
                onClick={() => setVerTicket(false)}
              >
                Voltar
              </Button>
            </div>
          ) : null}
          {s.criado?.comandaId && !verTicket ? (
            <div className="mx-auto mt-6 grid w-full max-w-[360px] gap-2">
              <Button size="lg" className="h-14 rounded-full" onClick={() => setVerTicket(true)}>
                <FileText aria-hidden /> Ver comanda
              </Button>
              <Button variant="secondary" className="h-12 rounded-full" onClick={s.concluir}>
                Concluir
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <EtapasAnimadas etapa={etapa} fluxo>
            {etapa === 0 ? <SecaoCliente s={s} /> : null}
            {etapa === 1 ? <SecaoServico s={s} /> : null}
            {etapa === 2 ? <SecaoHorario s={s} /> : null}
            {etapa === 3 ? (
              <>
                <SecaoDeFormulario rotulo="Confira o atendimento">
                  <Card density="none" className="overflow-hidden">
                    <div className="flex items-start gap-3 border-b border-line p-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink3 text-gold">
                        <Scissors size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-paper">
                          {servico?.nome ?? "Serviço"}
                        </p>
                        <p className="mt-1 text-sm text-mute">
                          {servico?.duracao_min ?? "—"} min ·{" "}
                          {servico ? brl(servico.preco_centavos) : "Preço a confirmar"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 p-4 text-sm">
                      <p className="flex items-center gap-2 text-paper">
                        <UserRound size={16} className="text-mute" aria-hidden />
                        <span>{profissional?.nome ?? "Profissional"}</span>
                      </p>
                      <p className="flex items-center gap-2 text-paper">
                        <CalendarDays size={16} className="text-mute" aria-hidden />
                        <span className="capitalize">{dataResumo}</span>
                      </p>
                      <p className="flex items-center gap-2 text-paper">
                        <Clock3 size={16} className="text-mute" aria-hidden />
                        <span>{s.horaMin}</span>
                      </p>
                      <p className="flex items-center gap-2 text-paper">
                        <Check size={16} className="text-mute" aria-hidden />
                        <span>
                          {s.semCliente
                            ? "Sem cliente vinculado"
                            : nomeCliente || "Cliente não selecionado"}
                        </span>
                      </p>
                      <p className="border-t border-line pt-3 text-mute">
                        Forma de pagamento:{" "}
                        <span className="font-semibold text-paper">
                          {s.semCliente ? "A definir após vincular cliente" : pagamento}
                        </span>
                      </p>
                    </div>
                  </Card>
                </SecaoDeFormulario>
                {!s.semCliente ? <SecaoPagamento s={s} /> : null}
                {!s.semCliente ? <AvisosAgendamento s={s} /> : null}
              </>
            ) : null}
          </EtapasAnimadas>
        </>
      )}
    </TelaDeFormulario>
  );
}
