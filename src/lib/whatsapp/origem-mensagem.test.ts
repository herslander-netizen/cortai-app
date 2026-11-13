import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DEPLOY_CORRECAO_AUTORIA_WHATSAPP, origemDaMensagem } from "./origem-mensagem";

const agora = "2026-11-13T10:00:00.000Z";
const anterior = "2026-11-12T12:00:00.000Z";
const registro = (dados: Partial<Parameters<typeof origemDaMensagem>[0]> = {}) => ({
  direcao: "saida",
  gerada_por_ia: false,
  gerada_por_humano: false,
  autor_user_id: null,
  criado_em: agora,
  ...dados,
});

describe("Origem confiável da mensagem de WhatsApp", () => {
  it("mensagem recebida nunca vira saída humana pelo conteúdo", () => {
    expect(origemDaMensagem(registro({
      direcao: "entrada", gerada_por_humano: true,
    }))).toBe("cliente");
  });

  it("resposta automática depois do PR #72 é automação do Flow", () => {
    expect(origemDaMensagem(registro())).toBe("automacao");
  });

  it("resposta da IA tem autoria da IA, independentemente do outro marcador", () => {
    expect(origemDaMensagem(registro({ gerada_por_ia: true, gerada_por_humano: true })))
      .toBe("flow_ia");
  });

  it("mensagem histórica com marcação indevida de pessoa não é atribuída à equipe", () => {
    expect(origemDaMensagem(registro({
      gerada_por_humano: true, criado_em: anterior,
    }))).toBe("nao_confirmada");
  });

  it("sem timestamp confiável nunca presume autoria humana", () => {
    expect(origemDaMensagem(registro({
      gerada_por_humano: true, criado_em: null,
    }))).toBe("nao_confirmada");
  });

  it("autor autenticado no painel é confiável mesmo no histórico", () => {
    expect(origemDaMensagem(registro({
      gerada_por_humano: true, autor_user_id: "usuario-autenticado", criado_em: anterior,
    }))).toBe("equipe");
  });

  it("fromMe real após deploy pode ser identificado como equipe", () => {
    expect(origemDaMensagem(registro({
      gerada_por_humano: true, criado_em: agora,
    }))).toBe("equipe");
    expect(Date.parse(DEPLOY_CORRECAO_AUTORIA_WHATSAPP)).toBeLessThan(Date.parse(agora));
  });
});

describe("Inbox — última mensagem POR conversa, sem amostra global", () => {
  it("backend limita ambas relações embutidas por conversa", () => {
    const texto = readFileSync("src/lib/central-atendimento.functions.ts", "utf8");
    const bloco = texto.slice(
      texto.indexOf("export const listarConversasDaCentral"),
      texto.indexOf("const conversaSchema"),
    );
    expect(bloco).toContain("ultima:mensagens_whatsapp!mensagens_whatsapp_conversa_id_fkey");
    expect(bloco).toContain("saidas:mensagens_whatsapp!mensagens_whatsapp_conversa_id_fkey");
    expect(bloco).toContain('.order("criado_em", { referencedTable: "ultima", ascending: false })');
    expect(bloco).toContain('.limit(1, { referencedTable: "ultima" })');
    expect(bloco).toContain('.limit(1, { referencedTable: "saidas" })');
    expect(bloco).not.toContain(".limit(300)");
    expect(bloco).toContain('origemDaMensagem(m)');
  });
});
