export type PeriodoDoDia = "manha" | "tarde" | "noite";

const FRASES: Record<PeriodoDoDia, readonly string[]> = {
  manha: [
    "Que hoje o movimento não pare.",
    "Bora fazer o dia render.",
    "Capricho no primeiro atendimento, o dia inteiro acompanha.",
    "Começo tranquilo, trabalho bem-feito.",
    "Cada cliente bem cuidado abre um bom dia.",
  ],
  tarde: [
    "Agenda cheia, mão firme.",
    "Cada atendimento, um cliente que volta.",
    "Respira, a agenda está sob controle.",
    "O dia segue no ritmo certo.",
    "Boa tarde para cuidar de cada detalhe.",
  ],
  noite: [
    "Dia bem trabalhado. Descansa.",
    "Fechando o dia com tudo em ordem.",
    "Bom trabalho hoje. Amanhã tem mais.",
    "Últimos cuidados antes de encerrar.",
    "O dia rendeu. Hora de desacelerar.",
  ],
};

export function periodoDoDia(hora: number): PeriodoDoDia {
  if (hora < 12) return "manha";
  if (hora < 18) return "tarde";
  return "noite";
}

function indiceEstavel(chave: string, tamanho: number) {
  let valor = 0;
  for (const caractere of chave) valor = (valor * 31 + caractere.charCodeAt(0)) >>> 0;
  return valor % tamanho;
}

export function saudacaoDoMenu({
  dia,
  hora,
  nome,
}: {
  dia: string;
  hora: number;
  nome?: string | null;
}) {
  const periodo = periodoDoDia(hora);
  const primeiroNome = nome?.trim().split(/\s+/)[0];
  const cumprimento = periodo === "manha" ? "Bom dia" : periodo === "tarde" ? "Boa tarde" : "Boa noite";
  const frases = FRASES[periodo];
  return {
    periodo,
    titulo: primeiroNome ? `${cumprimento}, ${primeiroNome}` : cumprimento,
    frase: frases[indiceEstavel(`${dia}:${periodo}`, frases.length)],
  };
}

export function horaNoFuso(fuso: string, agora = new Date()) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).formatToParts(agora);
  return Number(partes.find((parte) => parte.type === "hour")?.value ?? "0");
}