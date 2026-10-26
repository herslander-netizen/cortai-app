import { isoNoFusoDaBarbearia, somarDias } from "@/lib/horarios";

export type PeriodicidadeAgendamento = "semanal" | "quinzenal" | "mensal";

type PartesLocais = { dia: string; hora: string; ano: number; mes: number; diaMes: number };

function partesLocais(instante: Date, fuso: string): PartesLocais {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const parte of fmt.formatToParts(instante)) {
    if (parte.type !== "literal") parts[parte.type] = parte.value;
  }
  const ano = Number(parts.year);
  const mes = Number(parts.month);
  const diaMes = Number(parts.day);
  return {
    ano,
    mes,
    diaMes,
    dia: `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(diaMes).padStart(2, "0")}`,
    hora: `${parts.hour ?? "00"}:${parts.minute ?? "00"}`,
  };
}

function diaDoMesNoAlvo(ano: number, mes: number, dia: number): string {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

/**
 * Gera ocorrências futuras mantendo a hora de parede do negócio.
 * No mensal, cada data parte do dia original (31 → último dia de fevereiro → 31 de março),
 * evitando que um fevereiro curto desloque permanentemente a série.
 */
export function proximasOcorrencias(
  inicioIso: string,
  periodicidade: PeriodicidadeAgendamento,
  quantidade: number,
  fuso: string,
  agora: Date = new Date(),
): string[] {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 51) {
    throw new Error("Escolha de 1 a 51 novas ocorrências.");
  }
  const base = new Date(inicioIso);
  if (!Number.isFinite(base.getTime())) throw new Error("O horário original é inválido.");
  if (!Number.isFinite(agora.getTime())) throw new Error("O relógio de referência é inválido.");

  const local = partesLocais(base, fuso);
  const resultados: string[] = [];
  const agoraMs = agora.getTime();

  for (let indice = 1; indice <= 2400 && resultados.length < quantidade; indice += 1) {
    let dia: string;
    if (periodicidade === "semanal" || periodicidade === "quinzenal") {
      dia = somarDias(local.dia, indice * (periodicidade === "semanal" ? 7 : 14));
    } else {
      const mesIndex = local.ano * 12 + (local.mes - 1) + indice;
      const ano = Math.floor(mesIndex / 12);
      const mes = (mesIndex % 12) + 1;
      dia = diaDoMesNoAlvo(ano, mes, local.diaMes);
    }

    const proxima = isoNoFusoDaBarbearia(dia, local.hora, fuso);
    const instante = Date.parse(proxima);
    if (instante <= base.getTime() || instante <= agoraMs) continue;
    resultados.push(proxima);
  }

  if (resultados.length !== quantidade) {
    throw new Error("Não foi possível calcular todas as datas futuras desta série.");
  }
  return resultados;
}
