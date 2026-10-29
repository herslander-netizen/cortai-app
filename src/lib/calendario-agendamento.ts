import { gerarIcs } from "@/lib/previa";
import type { ConfirmacaoPublica } from "@/lib/agendamento-publico.functions";

function calendario(confirmacao: ConfirmacaoPublica) {
  return gerarIcs({
    id: confirmacao.agendamentoId,
    inicio: confirmacao.inicio,
    fim: confirmacao.fim,
    titulo: `${confirmacao.servico} — ${confirmacao.barbearia}`,
    local: confirmacao.endereco ?? confirmacao.barbearia,
    descricao: `Com ${confirmacao.profissional}. Agendado pelo Flow.`,
  });
}

function carimboGoogle(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function linkGoogleAgenda(confirmacao: ConfirmacaoPublica) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${confirmacao.servico} — ${confirmacao.barbearia}`,
    dates: `${carimboGoogle(confirmacao.inicio)}/${carimboGoogle(confirmacao.fim)}`,
    location: confirmacao.endereco ?? confirmacao.barbearia,
    details: `Atendimento com ${confirmacao.profissional}. Agendado pelo Flow.`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function baixarArquivoIcs(confirmacao: ConfirmacaoPublica) {
  const url = URL.createObjectURL(
    new Blob([calendario(confirmacao)], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "agendamento.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
