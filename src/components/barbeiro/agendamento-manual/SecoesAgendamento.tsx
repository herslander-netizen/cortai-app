import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { opcoesAgendaDia } from "@/components/barbeiro/agenda/useAgendaDia";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CampoDeEscolha } from "@/components/ui/formulario/CampoDeEscolha";
import { SecaoDeFormulario } from "@/components/ui/formulario/SecaoDeFormulario";
import { brl } from "@/lib/format";
import { estadosDoDia, STATUS_QUE_OCUPAM, type HorarioComEstado } from "@/lib/disponibilidade";
import { hojeNoFuso, slotsDoDia, type IntervalosPorData } from "@/lib/horarios";
import { cn } from "@/lib/utils";

import type { EstadoAgendamentoManual, Forma } from "./useAgendamentoManual";

const FORMAS: [Forma, string][] = [
  ["balcao", "No balcão"],
  ["pix", "Pix"],
  ["fiado", "Fiado"],
  ["credito", "Crédito"],
];

export function SecaoServico({ s }: { s: EstadoAgendamentoManual }) {
  const profissionais = s.profissionaisDisponiveis;
  if (s.base && s.servicosDisponiveis.length === 0) {
    return (
      <SecaoDeFormulario rotulo="Serviço">
        <p className="text-sm text-mute" role="status">
          Nenhum serviço tem profissional disponível. Em Serviços, escolha quem faz cada um.
        </p>
      </SecaoDeFormulario>
    );
  }
  return (
    <SecaoDeFormulario rotulo="Serviço">
      <CampoDeEscolha
        rotulo="Serviço"
        valor={s.servicoId}
        onEscolher={s.setServicoId}
        opcoes={s.servicosDisponiveis.map((sv) => ({
          id: sv.id,
          rotulo: sv.nome,
          detalhe: `${sv.duracao_min} min · ${brl(sv.preco_centavos)}`,
        }))}
      />
      {profissionais.length > 1 ? (
        <CampoDeEscolha
          rotulo="Profissional"
          valor={s.profissionalId}
          onEscolher={s.setProfissionalId}
          opcoes={profissionais.map((p) => ({ id: p.id, rotulo: p.nome }))}
        />
      ) : null}
    </SecaoDeFormulario>
  );
}

type OcupadoDaEquipe = {
  profissional_id: string | null;
  inicio: string;
  fim: string;
  bloqueio?: boolean;
  cliente: string;
  servico: string;
  duracaoMin: number;
  id: string;
};

/** Ajuste de pausa aplicado só à data que está aberta na Agenda. */
function intervalosDaData(
  intervalo: { inicio: string; fim: string } | null | undefined,
  dia: string,
): IntervalosPorData {
  return intervalo
    ? { [dia]: { intervaloInicio: intervalo.inicio, intervaloFim: intervalo.fim } }
    : {};
}

/** Estados reais dos horários do dia para a equipe (mesmo motor da página pública). */
function useEstadosDaEquipe(s: EstadoAgendamentoManual) {
  const agenda = useQuery({ ...opcoesAgendaDia(s.data), enabled: Boolean(s.base && s.data) });
  const servico = s.base?.servicos.find((sv) => sv.id === s.servicoId);
  if (!s.base || !servico || !s.profissionalId || !agenda.data) return null;
  const intervalosPorData = intervalosDaData(agenda.data.intervaloPersonalizado, s.data);
  const ocupados: OcupadoDaEquipe[] = agenda.data.itens
    .filter((i) => (STATUS_QUE_OCUPAM as readonly string[]).includes(i.status))
    .map((i) => ({
      id: i.id,
      profissional_id: i.profissionalId ?? null,
      inicio: i.inicio,
      fim: i.fim,
      cliente: i.cliente,
      servico: i.servico,
      duracaoMin: i.duracaoMin,
    }));
  const bloqueios: OcupadoDaEquipe[] = (agenda.data.bloqueios ?? []).map((b, i) => ({
    id: `bloqueio-${i}`,
    profissional_id: b.profissional_id,
    inicio: b.inicio,
    fim: b.fim,
    bloqueio: true,
    cliente: "",
    servico: "",
    duracaoMin: 0,
  }));
  ocupados.push(...bloqueios);
  return estadosDoDia({
    dia: s.data,
    servico: { id: servico.id, duracao_min: servico.duracao_min },
    profissionais: s.base.profissionais,
    escolhido: s.profissionalId,
    horarios: s.base.horarios,
    fuso: s.base.fuso,
    ocupados,
    // A equipe agenda sem antecedência mínima; a validação final segue no servidor.
    regras: { antecedenciaMin: 0, intervaloEntreMin: 0 },
    passoMin: s.base.passoMin ?? 30,
    intervalosPorData,
  });
}

export function SecaoHorario({ s }: { s: EstadoAgendamentoManual }) {
  const agendaDoDia = useQuery({ ...opcoesAgendaDia(s.data), enabled: Boolean(s.base && s.data) });
  const intervalosPorData = intervalosDaData(agendaDoDia.data?.intervaloPersonalizado, s.data);
  const estados = useEstadosDaEquipe(s);
  const [detalhe, setDetalhe] = useState<HorarioComEstado<OcupadoDaEquipe> | null>(null);
  const [confirmarEncaixe, setConfirmarEncaixe] = useState(false);
  const duracaoMin = s.base?.servicos.find((sv) => sv.id === s.servicoId)?.duracao_min;
  const slots =
    s.base && duracaoMin
      ? slotsDoDia(
          s.data,
          s.base.horarios,
          s.base.passoMin ?? 30,
          s.base.fuso,
          duracaoMin,
          intervalosPorData,
        ).slots.map((slot) => slot.label)
      : [];
  const porLabel = new Map((estados?.horarios ?? []).map((h) => [h.label, h]));
  const livre = s.proximo.data?.label;
  return (
    <SecaoDeFormulario rotulo="Horário">
      {livre ? (
        <Button
          variant="outline"
          type="button"
          aria-pressed={s.horaMin === livre}
          onClick={() => {
            s.setData(hojeNoFuso(s.base?.fuso ?? "America/Sao_Paulo"));
            s.setHoraMin(livre);
          }}
          className={cn("w-full", s.horaMin === livre && "bg-gold-soft")}
        >
          Atender agora · livre às {livre}
        </Button>
      ) : null}
      <input
        type="date"
        className="field-control"
        value={s.data}
        onChange={(e) => {
          setDetalhe(null);
          s.setData(e.target.value);
        }}
        aria-label="Data"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Horários">
        {slots.map((h) => {
          const info = porLabel.get(h);
          if (info?.estado === "ocupado") {
            const quem = info.ocupantes[0];
            return (
              <Chip
                key={h}
                tracejado
                selecionado={detalhe?.label === h}
                aria-label={`${h}, ocupado${quem ? ` por ${quem.cliente}, ${quem.servico}` : ""}`}
                onClick={() => {
                  setConfirmarEncaixe(false);
                  setDetalhe(info);
                }}
                className="h-auto min-h-9 flex-col gap-0 rounded-lg py-1"
              >
                <span className="font-semibold">{h}</span>
                <span className="text-xs text-brick">Ocupado</span>
              </Chip>
            );
          }
          if (info?.estado === "bloqueado") {
            return (
              <span
                key={h}
                aria-label={`${h}, bloqueado`}
                className="inline-flex h-9 items-center rounded-lg border border-dashed border-line px-4 text-sm text-mute2 line-through opacity-60"
              >
                {h}
              </span>
            );
          }
          return (
            <Chip
              className="rounded-lg"
              key={h}
              selecionado={s.horaMin === h}
              onClick={() => {
                setDetalhe(null);
                s.setHoraMin(h);
              }}
            >
              {h}
            </Chip>
          );
        })}
        {s.base && slots.length === 0 ? (
          <p className="px-4 text-sm text-mute">Sem horários neste dia. Escolha outra data.</p>
        ) : null}
      </div>
      {detalhe ? (
        <Aviso tom="acao" titulo={`${detalhe.label} · Ocupado`}>
          {detalhe.ocupantes.map((o) => (
            <p key={o.id}>
              {o.cliente} · {o.servico} · {o.duracaoMin} min
            </p>
          ))}
          {confirmarEncaixe ? (
            <>
              <p className="mt-2">
                Este horário já possui um atendimento. Deseja realmente criar um encaixe?
              </p>
              {!s.pronto ? (
                <p className="mt-1 text-sm text-mute">
                  Escolha o cliente e o serviço antes de encaixar.
                </p>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setConfirmarEncaixe(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  disabled={!s.pronto || s.salvando}
                  onClick={() => {
                    s.setHoraMin(detalhe.label);
                    void s.salvar(detalhe.iso, true);
                  }}
                >
                  Confirmar encaixe
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setDetalhe(null)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => setConfirmarEncaixe(true)}
              >
                Encaixar
              </Button>
            </div>
          )}
        </Aviso>
      ) : null}
    </SecaoDeFormulario>
  );
}

export function SecaoPagamento({ s }: { s: EstadoAgendamentoManual }) {
  return (
    <SecaoDeFormulario rotulo="Pagamento">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Forma de pagamento">
        {FORMAS.map(([v, rotulo]) => (
          <Chip
            className="rounded-lg"
            key={v}
            selecionado={s.forma === v}
            onClick={() => s.setForma(v)}
          >
            {rotulo}
          </Chip>
        ))}
      </div>
    </SecaoDeFormulario>
  );
}

export function AvisosAgendamento({ s }: { s: EstadoAgendamentoManual }) {
  return (
    <>
      {s.conflito ? (
        <Aviso tom="acao" titulo="Horário ocupado">
          <p>{s.conflito.mensagem}</p>
          {s.conflito.podeEncaixar ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-2 w-full rounded-full"
              disabled={s.salvando}
              onClick={() => void s.salvar(undefined, true)}
            >
              Encaixar mesmo assim
            </Button>
          ) : null}
          {s.conflito.sugestoes.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {s.conflito.sugestoes.map((sg) => (
                <Chip
                  className="rounded-lg"
                  key={sg.iso}
                  selecionado={false}
                  onClick={() => {
                    s.setHoraMin(sg.label);
                    void s.salvar(sg.iso);
                  }}
                >
                  {sg.label}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-mute">Ou escolha outro horário.</p>
          )}
        </Aviso>
      ) : null}
      {s.erro ? <Aviso tom="acao">{s.erro}</Aviso> : null}
    </>
  );
}
