/**
 * Sugestões de horário quando o horário pedido no painel já está ocupado.
 * Usa o motor único de disponibilidade: expediente, pausa, fuso, antecedência,
 * intervalo entre atendimentos e passo da agenda do negócio.
 */
import {
  diaEMinutoNoFuso,
  horariosDisponiveis,
  type Ocupado,
  type RegrasDaAgenda,
  type ServicoDoMotor,
} from "@/lib/disponibilidade";
import type { HorarioDeFuncionamento, IntervalosPorData } from "@/lib/horarios";

export type SugestaoDeHorario = { iso: string; label: string };

export function sugestoesDeHorario(p: {
  /** Instante pedido; as sugestões são do mesmo dia, no fuso do negócio. */
  pedido: Date;
  servico: ServicoDoMotor;
  profissionalId: string;
  horarios: HorarioDeFuncionamento[];
  fuso: string;
  ocupados: Ocupado[];
  regras: RegrasDaAgenda;
  passoMin: number;
  intervalosPorData?: IntervalosPorData;
  agora?: number;
  limite?: number;
}): SugestaoDeHorario[] {
  const { dia } = diaEMinutoNoFuso(p.pedido.getTime(), p.fuso);
  const { opcoes } = horariosDisponiveis({
    dia,
    servico: { ...p.servico, profissional_ids: null },
    profissionais: [{ id: p.profissionalId }],
    escolhido: p.profissionalId,
    horarios: p.horarios,
    fuso: p.fuso,
    ocupados: p.ocupados,
    regras: p.regras,
    agora: p.agora ?? Date.now(),
    passoMin: p.passoMin,
    ...(p.intervalosPorData ? { intervalosPorData: p.intervalosPorData } : {}),
  });
  return opcoes.slice(0, p.limite ?? 4).map(({ iso, label }) => ({ iso, label }));
}
