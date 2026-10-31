/**
 * Retrato do negócio no perfil `flow/v1` (src/lib/flow-bot/modelos/perfil.json), montado só com dados oficiais.
 * Parte pura: aberto agora, horário de hoje e próxima abertura a partir do horário do dia (que já inclui horário
 * especial e intervalo da data). Fato sem dado fica de fora: o modelo trata a ausência ("vou confirmar com a equipe").
 */
import type { Realidade } from "./nucleo/contratos";
import { diaPorExtenso } from "@/lib/conversa/respostas";
import {
  fimEmMinutos,
  horarioDoDia,
  somarDias,
  type HorarioDeFuncionamento,
  type IntervalosPorData,
} from "@/lib/horarios";

function emMinutos(hhmm: string) {
  const [h = 0, m = 0] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

type Agenda = { horarios: HorarioDeFuncionamento[]; intervalosPorData?: IntervalosPorData };

/** Aberto no minuto `minuto` do dia `dia` (fuso do negócio), contando a virada da noite anterior e o intervalo. */
export function abertoAgora(dia: string, minuto: number, agenda: Agenda): boolean {
  const hoje = horarioDoDia(dia, agenda.horarios, agenda.intervalosPorData);
  if (!hoje.fechado) {
    const abre = emMinutos(hoje.abre);
    const fecha = fimEmMinutos(hoje.abre, hoje.fecha);
    const noIntervalo =
      hoje.intervaloInicio !== null &&
      hoje.intervaloFim !== null &&
      minuto >= emMinutos(hoje.intervaloInicio) &&
      minuto < emMinutos(hoje.intervaloFim);
    if (minuto >= abre && minuto < fecha && !noIntervalo) return true;
  }
  const ontem = horarioDoDia(somarDias(dia, -1), agenda.horarios, agenda.intervalosPorData);
  if (ontem.fechado) return false;
  const fimDeOntem = fimEmMinutos(ontem.abre, ontem.fecha);
  return fimDeOntem > 1440 && minuto + 1440 < fimDeOntem;
}

export function horarioDeHojeEmTexto(dia: string, agenda: Agenda): string {
  const h = horarioDoDia(dia, agenda.horarios, agenda.intervalosPorData);
  if (h.fechado) return "fechado hoje";
  const pausa =
    h.intervaloInicio && h.intervaloFim
      ? `, com pausa das ${h.intervaloInicio} às ${h.intervaloFim}`
      : "";
  return `das ${h.abre} às ${h.fecha}${pausa}`;
}

/** Frase da próxima abertura (até 14 dias à frente), ou "" se não houver horário cadastrado. */
export function proximaAbertura(dia: string, minuto: number, agenda: Agenda): string {
  const hoje = horarioDoDia(dia, agenda.horarios, agenda.intervalosPorData);
  if (!hoje.fechado) {
    if (minuto < emMinutos(hoje.abre)) return `Abrimos hoje às ${hoje.abre}.`;
    if (
      hoje.intervaloInicio &&
      hoje.intervaloFim &&
      minuto >= emMinutos(hoje.intervaloInicio) &&
      minuto < emMinutos(hoje.intervaloFim)
    ) {
      return `Voltamos hoje às ${hoje.intervaloFim}.`;
    }
  }
  for (let n = 1; n <= 14; n++) {
    const outro = somarDias(dia, n);
    const h = horarioDoDia(outro, agenda.horarios, agenda.intervalosPorData);
    if (h.fechado) continue;
    return n === 1
      ? `Abrimos amanhã às ${h.abre}.`
      : `Abrimos ${diaPorExtenso(outro)}, às ${h.abre}.`;
  }
  return "";
}

/** "Corte — R$ 45,00" (preço do catálogo, em centavos). */
export function servicoEmTexto(s: { nome: string; preco_centavos: number }): string {
  const reais = (s.preco_centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${s.nome} — R$ ${reais}`;
}

export function montarRealidade(p: {
  nome: string;
  endereco: string | null;
  linkDeAgendar: string;
  servicos: readonly { nome: string; preco_centavos: number }[];
  dia: string;
  minuto: number;
  agenda: Agenda;
}): Realidade {
  const aberto = abertoAgora(p.dia, p.minuto, p.agenda);
  const realidade: Realidade = {
    "reality.businessName": p.nome,
    "reality.isOpen": aberto,
    "reality.todayHours": horarioDeHojeEmTexto(p.dia, p.agenda),
    "reality.nextOpening": aberto ? "" : proximaAbertura(p.dia, p.minuto, p.agenda),
    "reality.services": p.servicos.slice(0, 30).map(servicoEmTexto),
    "reality.address": p.endereco?.trim() ?? "",
    "reality.bookingLink": p.linkDeAgendar,
    // Aberto = há equipe para assumir a conversa agora.
    "reality.teamAvailable": aberto,
    // O Flow ainda não guarda formas de pagamento nem calcula aqui o próximo horário livre: vazio faz o modelo
    // prometer a confirmação da equipe ou mandar só o link, sem inventar.
    "reality.paymentMethods": "",
    "reality.nextAvailableSlot": "",
  };
  return realidade;
}
