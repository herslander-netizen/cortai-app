export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function diaCurto(iso: string): { dia: string; num: string; mes: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    dia: DIAS[d.getDay()] ?? "",
    num: String(d.getDate()).padStart(2, "0"),
    mes: MESES[d.getMonth()] ?? "",
  };
}

/**
 * Fuso usado nas telas. Nunca o do aparelho: o painel define o fuso da
 * barbearia assim que a sessão carrega (padrão America/Sao_Paulo).
 */
let fusoDasTelas = "America/Sao_Paulo";

export function definirFusoDasTelas(fuso: string | null | undefined) {
  if (fuso) fusoDasTelas = fuso;
}

function partes(iso: string, fuso: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday"));
  return { semana, dia: v("day"), mes: v("month"), hora: `${v("hour")}:${v("minute")}` };
}

export function hora(iso: string, fuso: string = fusoDasTelas): string {
  return partes(iso, fuso).hora;
}

export function dataHoraLonga(iso: string, fuso: string = fusoDasTelas): string {
  const d = partes(iso, fuso);
  return `${DIAS[d.semana]} ${d.dia}/${d.mes} às ${d.hora}`;
}

export function dataCurta(iso: string, fuso: string = fusoDasTelas): string {
  const d = partes(iso, fuso);
  return `${d.dia}/${d.mes}`;
}
