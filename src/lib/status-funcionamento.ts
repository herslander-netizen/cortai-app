import {
  horarioDoDia,
  hojeNoFuso,
  normalizarFuso,
  somarDias,
  aplicarExcecaoDeIntervalo,
  type ExcecaoIntervaloAgenda,
  type HorarioDeFuncionamento,
} from "@/lib/horarios";

export type StatusFuncionamento = {
  aberto: boolean;
  texto: string;
  proximaMudanca: string | null;
};

function minutos(hora: string) {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function horaNoFuso(instante: Date, fuso: string) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instante);
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function rotuloDia(distancia: number, dia: string) {
  if (distancia === 0) return "hoje";
  if (distancia === 1) return "amanhã";
  const [ano, mes, data] = dia.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(ano ?? 2026, (mes ?? 1) - 1, data ?? 1)),
  );
}

export function statusDeFuncionamento(
  horarios: HorarioDeFuncionamento[] | null | undefined,
  fusoInformado: string | null | undefined,
  instante = new Date(),
  excecoesIntervalo: ExcecaoIntervaloAgenda[] = [],
): StatusFuncionamento | null {
  if (!horarios?.length || !horarios.some((h) => !h.fechado)) return null;
  const fuso = normalizarFuso(fusoInformado);
  const hoje = hojeNoFuso(fuso, instante);
  const horariosHoje = aplicarExcecaoDeIntervalo(
    horarios,
    hoje,
    excecoesIntervalo.find((item) => item.dia === hoje),
  );
  const horariosOntem = aplicarExcecaoDeIntervalo(
    horariosHoje,
    somarDias(hoje, -1),
    excecoesIntervalo.find((item) => item.dia === somarDias(hoje, -1)),
  );
  const agora = horaNoFuso(instante, fuso);
  const ontem = somarDias(hoje, -1);
  const anterior = horarioDoDia(ontem, horariosOntem);
  const fechamentoAnterior = minutos(anterior.fecha);

  if (
    !anterior.fechado &&
    minutos(anterior.fecha) <= minutos(anterior.abre) &&
    agora < fechamentoAnterior
  ) {
    return {
      aberto: true,
      texto: `Aberto agora · fecha às ${anterior.fecha}`,
      proximaMudanca: anterior.fecha,
    };
  }

  const atual = horarioDoDia(hoje, horariosHoje);
  if (!atual.fechado) {
    const abre = minutos(atual.abre);
    const fechaBase = minutos(atual.fecha);
    const fecha = fechaBase <= abre ? fechaBase + 1440 : fechaBase;
    const intervaloInicio = atual.intervaloInicio ? minutos(atual.intervaloInicio) : null;
    const intervaloFim = atual.intervaloFim ? minutos(atual.intervaloFim) : null;
    if (agora >= abre && agora < fecha) {
      if (
        intervaloInicio != null &&
        intervaloFim != null &&
        agora >= intervaloInicio &&
        agora < intervaloFim
      ) {
        return {
          aberto: false,
          texto: `Fechado agora · abre hoje às ${atual.intervaloFim}`,
          proximaMudanca: atual.intervaloFim,
        };
      }
      const fechaTexto =
        intervaloInicio != null && agora < intervaloInicio ? atual.intervaloInicio : atual.fecha;
      return {
        aberto: true,
        texto: `Aberto agora · fecha às ${fechaTexto}`,
        proximaMudanca: fechaTexto,
      };
    }
    if (agora < abre) {
      return {
        aberto: false,
        texto: `Fechado agora · abre hoje às ${atual.abre}`,
        proximaMudanca: atual.abre,
      };
    }
  }

  for (let distancia = 1; distancia <= 7; distancia += 1) {
    const dia = somarDias(hoje, distancia);
    const proximo = horarioDoDia(dia, horarios);
    if (!proximo.fechado) {
      return {
        aberto: false,
        texto: `Fechado agora · abre ${rotuloDia(distancia, dia)} às ${proximo.abre}`,
        proximaMudanca: proximo.abre,
      };
    }
  }
  return null;
}
