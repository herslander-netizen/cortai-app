import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { CampoDeEscolha } from "@/components/ui/formulario/CampoDeEscolha";
import { SecaoDeFormulario } from "@/components/ui/formulario/SecaoDeFormulario";
import { brl } from "@/lib/format";
import { hojeNoFuso, slotsDoDia } from "@/lib/horarios";
import { cn } from "@/lib/utils";

import type { EstadoAgendamentoManual, Forma } from "./useAgendamentoManual";

const FORMAS: [Forma, string][] = [
  ["balcao", "No balcão"],
  ["pix", "Pix"],
  ["fiado", "Fiado"],
  ["credito", "Crédito"],
];

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 text-sm",
        ativo ? "border-gold bg-gold-soft text-gold" : "border-line2 text-mute",
      )}
    >
      {children}
    </Button>
  );
}

export function SecaoServico({ s }: { s: EstadoAgendamentoManual }) {
  const profissionais = s.base?.profissionais ?? [];
  return (
    <SecaoDeFormulario rotulo="Serviço">
      <CampoDeEscolha
        rotulo="Serviço"
        valor={s.servicoId}
        onEscolher={s.setServicoId}
        opcoes={(s.base?.servicos ?? []).map((sv) => ({
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

export function SecaoHorario({ s }: { s: EstadoAgendamentoManual }) {
  const slots = s.base
    ? slotsDoDia(s.data, s.base.horarios, s.base.passoMin ?? 30, s.base.fuso).slots.map(
        (slot) => slot.label,
      )
    : [];
  const livre = s.proximo.data?.label;
  return (
    <SecaoDeFormulario rotulo="Horário">
      {livre ? (
        <Button
          variant="ghost"
          type="button"
          aria-pressed={s.horaMin === livre}
          onClick={() => {
            s.setData(hojeNoFuso(s.base?.fuso ?? "America/Sao_Paulo"));
            s.setHoraMin(livre);
          }}
          className={cn(
            "w-full rounded-full border text-base",
            s.horaMin === livre ? "border-gold bg-gold-soft text-gold" : "border-gold/60 text-gold",
          )}
        >
          Atender agora · livre às {livre}
        </Button>
      ) : null}
      <input
        type="date"
        className="field-control"
        value={s.data}
        onChange={(e) => s.setData(e.target.value)}
        aria-label="Data"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Horários">
        {slots.map((h) => (
          <Chip key={h} ativo={s.horaMin === h} onClick={() => s.setHoraMin(h)}>
            {h}
          </Chip>
        ))}
        {s.base && slots.length === 0 ? (
          <p className="px-4 text-sm text-mute">Sem horários neste dia. Escolha outra data.</p>
        ) : null}
      </div>
    </SecaoDeFormulario>
  );
}

export function SecaoPagamento({ s }: { s: EstadoAgendamentoManual }) {
  return (
    <SecaoDeFormulario rotulo="Pagamento">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Forma de pagamento">
        {FORMAS.map(([v, rotulo]) => (
          <Chip key={v} ativo={s.forma === v} onClick={() => s.setForma(v)}>
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
                  key={sg.iso}
                  ativo={false}
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
