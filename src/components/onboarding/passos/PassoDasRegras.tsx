/**
 * Passo "Regras" do Onboarding: atalho para o padrão recomendado, cada regra como título de seção + chips (o
 * seletor de escolha do padrão Figaro) e "Aceitar encaixes" numa linha com interruptor.
 */
import { Check } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import type { RegrasDeAgendamento } from "@/lib/onboarding.functions";
import { AtalhoDoPasso } from "./MolduraDoPasso";

type Opcao = { valor: number; rotulo: string };

const ANTECEDENCIAS: Opcao[] = [
  { valor: 0, rotulo: "Sem mínimo" },
  { valor: 30, rotulo: "30 min" },
  { valor: 60, rotulo: "1 h" },
  { valor: 120, rotulo: "2 h" },
  { valor: 1440, rotulo: "1 dia" },
];
const CANCELAMENTOS: Opcao[] = [
  { valor: 0, rotulo: "A qualquer hora" },
  { valor: 1, rotulo: "1 h antes" },
  { valor: 2, rotulo: "2 h antes" },
  { valor: 24, rotulo: "1 dia antes" },
];
const JANELAS: Opcao[] = [
  { valor: 7, rotulo: "7 dias" },
  { valor: 15, rotulo: "15 dias" },
  { valor: 30, rotulo: "30 dias" },
  { valor: 60, rotulo: "60 dias" },
  { valor: 90, rotulo: "90 dias" },
];
const PASSOS: Opcao[] = [
  { valor: 15, rotulo: "15 min" },
  { valor: 20, rotulo: "20 min" },
  { valor: 30, rotulo: "30 min" },
  { valor: 40, rotulo: "40 min" },
];
const INTERVALOS: Opcao[] = [
  { valor: 0, rotulo: "Nenhum" },
  { valor: 5, rotulo: "5 min" },
  { valor: 10, rotulo: "10 min" },
  { valor: 15, rotulo: "15 min" },
];

function Escolha({
  titulo,
  opcoes,
  valor,
  onChange,
}: {
  titulo: string;
  opcoes: Opcao[];
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 px-1 text-sm font-semibold text-mute">{titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Chip key={o.valor} selecionado={valor === o.valor} onClick={() => onChange(o.valor)}>
            {o.rotulo}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function PassoDasRegras({
  regras,
  onRegras,
  salvando,
  onPadrao,
}: {
  regras: RegrasDeAgendamento;
  onRegras: (r: RegrasDeAgendamento) => void;
  salvando: boolean;
  onPadrao: () => void;
}) {
  const passos = PASSOS.some((o) => o.valor === regras.passoMin)
    ? PASSOS
    : [...PASSOS, { valor: regras.passoMin, rotulo: `${regras.passoMin} min` }];
  return (
    <div>
      <AtalhoDoPasso
        icone={<Check aria-hidden />}
        titulo="Usar padrão recomendado"
        detalhe="1 h de antecedência, cancelar até 2 h antes, aceita encaixe."
        onClick={onPadrao}
        desabilitado={salvando}
      />
      <Escolha
        titulo="Antecedência mínima para agendar"
        opcoes={ANTECEDENCIAS}
        valor={regras.antecedenciaMinMinutos}
        onChange={(v) => onRegras({ ...regras, antecedenciaMinMinutos: v })}
      />
      <Escolha
        titulo="Cliente pode cancelar até"
        opcoes={CANCELAMENTOS}
        valor={regras.cancelamentoMinHoras}
        onChange={(v) => onRegras({ ...regras, cancelamentoMinHoras: v })}
      />
      <Escolha
        titulo="Intervalo entre atendimentos"
        opcoes={INTERVALOS}
        valor={regras.intervaloEntreMin}
        onChange={(v) => onRegras({ ...regras, intervaloEntreMin: v })}
      />
      <Escolha
        titulo="Período máximo para agendar"
        opcoes={JANELAS}
        valor={regras.janelaDias}
        onChange={(v) => onRegras({ ...regras, janelaDias: v })}
      />
      <Escolha
        titulo="Horários oferecidos a cada"
        opcoes={passos}
        valor={regras.passoMin}
        onChange={(v) => onRegras({ ...regras, passoMin: v })}
      />
      <label className="mt-6 flex min-h-16 items-center justify-between gap-4 rounded-[28px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] px-5 py-3">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-paper">Aceitar encaixes</span>
          <span className="block text-[13px] text-mute">
            Cliente sem horário pode entrar na fila.
          </span>
        </span>
        <Switch
          checked={regras.aceitaEncaixe}
          aria-label="Aceitar encaixes"
          onCheckedChange={(v) => onRegras({ ...regras, aceitaEncaixe: v })}
        />
      </label>
    </div>
  );
}
