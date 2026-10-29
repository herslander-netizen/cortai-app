import { describe, expect, it } from "vitest";

import { APRESENTACAO_PADRAO, SEO_APRESENTACAO_PADRAO } from "@/lib/apresentacao-conteudo";
import { HOME_PADRAO } from "@/lib/home-publica";

describe("posicionamento multi-serviços do Flow", () => {
  it("mantém a apresentação padrão neutra sem apagar que Beleza é um segmento", () => {
    expect(APRESENTACAO_PADRAO.hero.texto.toLowerCase()).not.toContain("barbearia");
    expect(APRESENTACAO_PADRAO.hero.texto.toLowerCase()).not.toContain("barbeiro");
    expect(APRESENTACAO_PADRAO.foco.texto.toLowerCase()).not.toContain("cadeira");
    expect(APRESENTACAO_PADRAO.segmentos.etiqueta.toLowerCase()).toContain("negócios de serviços");
    const perguntaDeSegmentos = APRESENTACAO_PADRAO.perguntas.find(
      (p) => p.pergunta === "Quais tipos de negócio podem usar o Flow?",
    );
    expect(perguntaDeSegmentos).toBeDefined();
    expect(perguntaDeSegmentos?.resposta).toMatch(/^O Flow é uma plataforma de gestão e agendamento para negócios de serviços\./);
    expect(perguntaDeSegmentos?.resposta).toContain("Beleza, barbearia e outras áreas");
    expect(perguntaDeSegmentos?.resposta).not.toMatch(/^Não\./);
    expect(SEO_APRESENTACAO_PADRAO.descricao.toLowerCase()).not.toContain("barbearia");
  });

  it("usa posicionamento de serviços no conteúdo padrão da Home", () => {
    expect(HOME_PADRAO.hero.etiqueta.toLowerCase()).toContain("negócios de serviços");
    expect(HOME_PADRAO.hero.texto.toLowerCase()).not.toContain("beleza");
    expect(HOME_PADRAO.seo.titulo.toLowerCase()).toContain("negócios de serviços");
    expect(HOME_PADRAO.seo.descricao.toLowerCase()).not.toContain("beleza");
  });
});
