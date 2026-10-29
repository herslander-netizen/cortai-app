import type { AgendaPublica } from "@/lib/agendamento-publico.functions";
import type { Intencao } from "@/lib/conversa/entender";
import { contatoDaEquipe, OPCOES_NAO_ENTENDI, TEXTOS_CONVERSA } from "@/lib/conversa/respostas";
import { brl } from "@/lib/format";
import { statusDeFuncionamento } from "@/lib/status-funcionamento";
import type { Chip } from "./tipos";

export function linkDaEquipe(data: AgendaPublica) {
  return contatoDaEquipe(data.tenant.whatsapp);
}

/** Chip "Falar com a equipe": WhatsApp do negócio quando houver; senão, nada a inventar. */
export function chipEquipe(data: AgendaPublica): Chip | null {
  const href = linkDaEquipe(data);
  return href ? { rotulo: "Falar com a equipe", href } : null;
}

/**
 * Perguntas rápidas respondidas só com os dados públicos já carregados.
 * Sem dado cadastrado: avisa que vai confirmar com a equipe.
 */
export function respostaRapida(
  intencao: Intencao,
  data: AgendaPublica,
  agendar: Chip,
): { texto: string; chips: Chip[] } | null {
  const equipe = chipEquipe(data);
  const comEquipe = (chips: Chip[]) => (equipe ? [...chips, equipe] : chips);
  if (intencao === "servicos") {
    const lista = data.servicos
      .slice(0, 6)
      .map((s) => `${s.nome} · ${brl(s.preco_centavos)}`)
      .join("\n");
    return { texto: `${lista}\n${TEXTOS_CONVERSA.querAgendar}`, chips: [agendar] };
  }
  if (intencao === "funcionamento") {
    const status = statusDeFuncionamento(data.horarios, data.tenant.fuso, undefined, data.excecoesIntervalo);
    if (!status) return { texto: TEXTOS_CONVERSA.equipe, chips: comEquipe([agendar]) };
    return { texto: `${status.texto}. ${TEXTOS_CONVERSA.querAgendar}`, chips: [agendar] };
  }
  if (intencao === "endereco") {
    const endereco = data.tenant.endereco?.trim();
    if (!endereco) return { texto: TEXTOS_CONVERSA.semEndereco, chips: comEquipe([agendar]) };
    return {
      texto: `${endereco}\n${TEXTOS_CONVERSA.querAgendar}`,
      chips: [
        {
          rotulo: "Abrir no mapa",
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`,
        },
        agendar,
      ],
    };
  }
  if (intencao === "pagamento") {
    return { texto: TEXTOS_CONVERSA.semPagamento, chips: comEquipe([agendar]) };
  }
  if (intencao === "profissionais") {
    const nomes = data.profissionais.map((p) => p.nome).join(", ");
    return { texto: `Quem atende: ${nomes}. ${TEXTOS_CONVERSA.querAgendar}`, chips: [agendar] };
  }
  if (intencao === "agradecimento") return { texto: TEXTOS_CONVERSA.agradecimento, chips: [] };
  if (intencao === "atendente") {
    if (equipe) return { texto: "Claro! É só chamar a equipe por aqui:", chips: [equipe] };
    return { texto: TEXTOS_CONVERSA.equipe, chips: [] };
  }
  return null;
}

/** Sem dado reconhecido: menu curto; na segunda vez seguida, a equipe. */
export function respostaNaoEntendi(
  data: AgendaPublica,
  falhas: number,
  agendar: Chip,
  verServicos: () => void,
): { texto: string; chips: Chip[] } {
  const equipe = chipEquipe(data);
  if (falhas >= 1) {
    return equipe
      ? { texto: TEXTOS_CONVERSA.naoEntendiDeNovo, chips: [equipe] }
      : { texto: `${TEXTOS_CONVERSA.equipe} ${data.tenant.whatsapp ?? ""}`.trim(), chips: [] };
  }
  const [agendarRotulo, servicosRotulo, equipeRotulo] = OPCOES_NAO_ENTENDI;
  const chips: Chip[] = [
    { ...agendar, rotulo: agendarRotulo },
    { rotulo: servicosRotulo, acao: verServicos },
  ];
  if (equipe) chips.push({ ...equipe, rotulo: equipeRotulo });
  return { texto: TEXTOS_CONVERSA.naoEntendi, chips };
}
