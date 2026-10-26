import { describe, expect, it } from "vitest";
import {
  montarMensagem,
  type DadosDaMensagem,
  type TipoDeNotificacao,
} from "./notificacoes.server";

const dados: DadosDaMensagem = {
  cliente: "Ana Silva",
  barbearia: "Studio Aurora",
  servico: "Atendimento essencial",
  profissional: "Bia",
  inicio: "2026-10-01T13:00:00.000Z",
  valorCentavos: 7500,
  endereco: "Rua Central, 10",
  linkAgendamento: "https://cortai.app/agendar/studio-aurora",
  linkPagamento: "https://pagamentos.example/p/1",
  linkAvaliacao: "https://cortai.app/avaliar/token-seguro",
  fuso: "America/Sao_Paulo",
  segmento: "salao_beleza",
  textoRetorno: null,
};
const matriz: TipoDeNotificacao[] = [
  "confirmacao_agendamento",
  "lembrete_24h",
  "aviso_proximo",
  "alteracao_agendamento",
  "cancelamento_agendamento",
  "mudanca_operacional",
  "vaga_lista_espera",
  "pagamento_confirmado",
  "pos_atendimento",
  "convite_avaliacao",
  "recuperacao_experiencia",
  "retorno",
  "fallback_informativo_whatsapp",
];

describe("matriz transacional da Secretária Cortaí", () => {
  it.each(matriz)("gera conteúdo válido para %s", (tipo) => {
    const texto = montarMensagem(tipo, dados);
    expect(texto.length).toBeGreaterThan(15);
    expect(texto).not.toContain("undefined");
    expect(texto).not.toContain("[object Object]");
  });
  it("não assume barbearia em outro segmento de Beleza", () => {
    const textos = matriz
      .map((tipo) => montarMensagem(tipo, dados))
      .join("\n")
      .toLowerCase();
    expect(textos).not.toContain("barbearia");
    expect(textos).not.toContain("barbeiro");
    expect(montarMensagem("retorno", dados)).toContain("próximo atendimento");
  });
  it("inclui créditos de atendimento reais nas confirmações e lembretes", () => {
    const comCreditos = { ...dados, creditosDisponiveis: 3 };
    expect(montarMensagem("confirmacao_agendamento", comCreditos)).toContain(
      "Créditos de atendimento disponíveis: 3",
    );
    expect(montarMensagem("lembrete_24h", comCreditos)).toContain(
      "Créditos de atendimento disponíveis: 3",
    );
    expect(montarMensagem("lembrete_2h", comCreditos)).toContain(
      "Créditos de atendimento disponíveis: 3",
    );
    expect(
      montarMensagem("lembrete_24h", { ...dados, creditosDisponiveis: 0 }),
    ).not.toContain("Créditos de atendimento");
  });

  it("mantém o fallback curto, neutro e convidando a conversar", () => {
    const texto = montarMensagem("fallback_informativo_whatsapp", dados);
    expect(texto).toContain("por aqui mesmo");
    expect(texto).toContain(dados.linkAgendamento);
    expect(texto).not.toContain("menu");
  });
});
