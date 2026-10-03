import { useState } from "react";

import { ConfirmacaoRapida } from "@/components/ui/VistoAnimado";
import { Button } from "@/components/ui/button";
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
        variant="ghost"
        type="button"
        onClick={() => setAberto(true)}
        className={gatilho === "primario" ? "btn-primary w-full text-sm" : "btn-tertiary text-xs"}
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

  return (
    <TelaDeFormulario
      titulo={iniciarNovoCliente && s.novo ? "Novo cliente" : "Novo agendamento"}
      subtitulo={
        iniciarNovoCliente && s.novo
          ? "Para facilitar o contato e agilizar os próximos agendamentos."
          : "Cliente, serviço e horário em poucos toques."
      }
      sujo={s.sujo && !s.confirmado}
      onFechar={onFechar}
      {...(s.confirmado
        ? {}
        : {
            acao: {
              rotulo: "Confirmar agendamento",
              onClick: () => void s.salvar(),
              desabilitada: !s.pronto,
              carregando: s.salvando,
            },
          })}
    >
      {s.confirmado ? (
        <ConfirmacaoRapida texto="Pronto. Agendamento criado." />
      ) : (
        <>
          <SecaoCliente s={s} />
          <SecaoServico s={s} />
          <SecaoHorario s={s} />
          <SecaoPagamento s={s} />
          <AvisosAgendamento s={s} />
        </>
      )}
    </TelaDeFormulario>
  );
}
