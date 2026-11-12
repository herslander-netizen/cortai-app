import { describe, expect, it } from "vitest";

import {
  FUNCIONALIDADES,
  dependentesLigados,
  dependenciaPendente,
  decisaoBloqueioFiado,
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
  it("mostra aviso de pré-requisito sem apagar a configuração da automação", () => {
    const leitura = base({
      valores: { fila_chegada: false, lista_automatica: true },
    });
    const item = funcionalidade("lista_automatica");
    expect(estadoDe(item, leitura)).toBe("ativo");
    expect(dependenciaPendente(item, leitura)).toEqual({
      chave: "fila_chegada",
      rotulo: "Lista de espera",
      motivo: "desativada",
    });
    expect(resumo(leitura).pendentes).toBeGreaterThanOrEqual(1);
  });

  it("fila básica não exige WhatsApp, campanhas, comanda nem recursos opcionais", () => {
    const leitura = base({
      valores: {
        fila_chegada: true, lista_automatica: true,
        secretaria: false, fiado: false, comanda: false, loja: false,
      },
    });
    expect(funcionalidade("fila_chegada").depende).toBeUndefined();
    expect(dependenciaPendente(funcionalidade("fila_chegada"), leitura)).toBeNull();
    expect(dependenciaPendente(funcionalidade("lista_automatica"), leitura)).toBeNull();
  });

  it("só exige plano quando o pré-requisito está fora do plano", () => {
    const leitura = base({
      liberados: { fila_espera: false },
      valores: { fila_chegada: true, lista_automatica: true },
    });
    // O plano também bloqueia a própria automação: não duplicar aviso.
    expect(dependenciaPendente(funcionalidade("lista_automatica"), leitura)).toBeNull();
  });

  it("dependência ligada não vira bloqueio de outras funções independentes", () => {
    const leitura = base({ valores: { produtos: false, loja: true, modo_foco: true } });
    expect(dependenciaPendente(funcionalidade("loja"), leitura)?.rotulo).toBe(
      "Produtos e estoque",
    );
    expect(dependenciaPendente(funcionalidade("modo_foco"), leitura)).toBeNull();
  });

  it("não ativa fiado ao desligar um bloqueio inexistente", () => {
    expect(decisaoBloqueioFiado(false, null)).toBe("ignorar");
    expect(decisaoBloqueioFiado(false, { ativo: false })).toBe("salvar");
    expect(decisaoBloqueioFiado(false, { ativo: true })).toBe("salvar");
  });

  it("não deixa ativar bloqueio sem fiado já habilitado", () => {
    expect(() => decisaoBloqueioFiado(true, null)).toThrow('Ative "Fiado"');
    expect(() => decisaoBloqueioFiado(true, { ativo: false })).toThrow('Ative "Fiado"');
    expect(decisaoBloqueioFiado(true, { ativo: true })).toBe("salvar");
  });

  it("resumo conta só interruptores reais", () => {
    const r = resumo(base());
    expect(r.total).toBe(FUNCIONALIDADES.filter((x) => x.fonte.tipo !== "sem_interruptor").length);
  });
});
