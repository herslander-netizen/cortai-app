import { describe, expect, it } from "vitest";

import {
  FUNCIONALIDADES,
  dependentesLigados,
  estadoDe,
  funcionalidade,
  podeAlterar,
  resumo,
  type LeituraDasFuncionalidades,
} from "@/lib/funcionalidades";

const base = (p: Partial<LeituraDasFuncionalidades> = {}): LeituraDasFuncionalidades => ({
  valores: {},
  liberados: {},
  planoMinimo: {},
  permissoes: ["alterar_dados_barbearia"],
  ...p,
});

describe("painel de funcionalidades", () => {
  it("estado ausente continua significando ativo", () => {
    expect(estadoDe(funcionalidade("modo_foco"), base())).toBe("ativo");
  });
  it("fora do plano não tem interruptor", () => {
    expect(estadoDe(funcionalidade("loja"), base({ liberados: { loja_online: false } }))).toBe(
      "fora_do_plano",
    );
  });
  it("itens sem interruptor real nunca viram toggle", () => {
    expect(estadoDe(funcionalidade("avaliacoes"), base())).toBe("sempre");
  });
  it("avisa dependentes ligados antes de desligar", () => {
    const l = base({ valores: { produtos: true, loja: true } });
    expect(dependentesLigados("produtos", l).map((x) => x.chave)).toEqual(["loja"]);
  });
  it("permissão extra é exigida para o Voltaí", () => {
    expect(podeAlterar(funcionalidade("voltai"), ["alterar_dados_barbearia"])).toBe(false);
    expect(
      podeAlterar(funcionalidade("voltai"), ["alterar_dados_barbearia", "gerenciar_voltai"]),
    ).toBe(true);
  });
  it("não inclui atualização do app, push, privacidade nem assinatura", () => {
    const rotulos = FUNCIONALIDADES.map((x) => x.rotulo.toLowerCase()).join(" ");
    for (const proibido of ["atualiza", "push", "privacidade", "assinatura", "instala"])
      expect(rotulos).not.toContain(proibido);
  });
  it("resumo conta só interruptores reais", () => {
    const r = resumo(base());
    expect(r.total).toBe(FUNCIONALIDADES.filter((x) => x.fonte.tipo !== "sem_interruptor").length);
  });
});
