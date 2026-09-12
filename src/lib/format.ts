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

export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function dataHoraLonga(iso: string): string {
  const d = new Date(iso);
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${hora(iso)}`;
}
