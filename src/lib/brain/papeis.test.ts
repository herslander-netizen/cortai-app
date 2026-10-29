import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ia/acoes.server", () => ({ ACOES_DO_AGENTE: {} }));
import {
  ACOES,
  acaoPermitida,
  atendimentoDeOutroProfissional,
  ferramentasDoContexto,
  type ContextoDoCerebro,
} from "./acoes.server";
import { papelDoPainel } from "./papel-do-painel";

const base = { tenantId: "t1", ator: "5511999999999" };
const cliente: ContextoDoCerebro = { ...base, canal: "whatsapp", telefoneCliente: base.ator };
const prof: ContextoDoCerebro = {
  ...base,
  canal: "whatsapp",
  papel: "profissional",
  profissionalId: "p1",
  permissoes: [
    "agendamento_manual",
    "cancelar_agendamento",
    "editar_clientes",
    "visualizar_clientes",
  ],
};
const dono: ContextoDoCerebro = { ...base, canal: "whatsapp", papel: "dono" };
const painel: ContextoDoCerebro = { ...base, canal: "painel" };
const site: ContextoDoCerebro = { ...base, canal: "site" };

describe("catálogo de ferramentas oferecidas à Flow IA", () => {
  it.each([cliente, prof, dono, painel, site])("só oferece ações existentes e autorizadas para o contexto", (ctx) => {
    const ferramentas = ferramentasDoContexto(ctx);
    expect(ferramentas.every((f) => Boolean(ACOES[f.name]))).toBe(true);
    expect(ferramentas.every((f) => acaoPermitida(f.name, ctx))).toBe(true);
    if (ctx.canal === "site") {
      expect(ferramentas.every((f) => ACOES[f.name]?.risco !== "escrita")).toBe(true);
    }
    if (ctx.canal === "whatsapp") {
      for (const f of ferramentas) {
        if (ACOES[f.name]?.risco === "escrita") {
          expect(f.description).toContain("só executa depois que a pessoa confirmar");
        }
      }
    }
  });
});

describe("permissões por papel no WhatsApp", () => {
  it("cliente agenda, remarca e cancela, mas não vê agenda da equipe nem indicadores", () => {
    for (const a of ["criar_agendamento", "reagendar_agendamento", "cancelar_agendamento", "consultar_disponibilidade", "encaminhar_humano"])
      expect(acaoPermitida(a, cliente)).toBe(true);
    for (const a of ["minha_agenda", "consultar_fila", "avisar_atraso", "consultar_movimento", "consultar_caixa_hoje", "registrar_nota"])
      expect(acaoPermitida(a, cliente)).toBe(false);
  });
  it("profissional vê a própria agenda e avisa atraso, sem indicadores do negócio", () => {
    for (const a of ["minha_agenda", "consultar_fila", "avisar_atraso", "criar_agendamento"])
      expect(acaoPermitida(a, prof)).toBe(true);
    expect(acaoPermitida("consultar_movimento", prof)).toBe(false);
    expect(acaoPermitida("consultar_caixa_hoje", prof)).toBe(false);
    expect(acaoPermitida("encaminhar_humano", prof)).toBe(false);
  });
  it("dono vê indicadores, caixa e agenda do negócio, não avisa atraso como profissional", () => {
    expect(acaoPermitida("consultar_movimento", dono)).toBe(true);
    expect(acaoPermitida("consultar_caixa_hoje", dono)).toBe(true);
    expect(acaoPermitida("minha_agenda", dono)).toBe(true);
    expect(acaoPermitida("avisar_atraso", dono)).toBe(false);
  });
  it("equipe no WhatsApp respeita as permissões efetivas de cada ação", () => {
    const semPermissoes: ContextoDoCerebro = { ...prof, permissoes: [] };
    const agendaSemCancelar: ContextoDoCerebro = {
      ...prof,
      permissoes: ["agendamento_manual"],
    };
    const completa: ContextoDoCerebro = {
      ...prof,
      permissoes: ["agendamento_manual", "cancelar_agendamento", "editar_clientes"],
    };

    expect(acaoPermitida("criar_agendamento", semPermissoes)).toBe(false);
    expect(acaoPermitida("cancelar_agendamento", semPermissoes)).toBe(false);
    expect(acaoPermitida("criar_agendamento", agendaSemCancelar)).toBe(true);
    expect(acaoPermitida("cancelar_agendamento", agendaSemCancelar)).toBe(false);
    expect(acaoPermitida("reagendar_agendamento", agendaSemCancelar)).toBe(false);
    expect(acaoPermitida("criar_cliente", completa)).toBe(true);
    // Ações limitadas pelo papel continuam com a regra própria.
    expect(acaoPermitida("minha_agenda", semPermissoes)).toBe(true);
    expect(acaoPermitida("avisar_atraso", semPermissoes)).toBe(true);
    // Dono tem todas as permissões efetivas pela regra do banco.
    expect(acaoPermitida("criar_agendamento", { ...dono, permissoes: [] })).toBe(true);
  });
  it("ações da equipe no WhatsApp não vazam para painel nem site", () => {
    for (const a of ["minha_agenda", "consultar_fila", "avisar_atraso"]) {
      expect(acaoPermitida(a, painel)).toBe(false);
      expect(acaoPermitida(a, site)).toBe(false);
    }
    expect(acaoPermitida("criar_agendamento", site)).toBe(false);
    expect(acaoPermitida("consultar_caixa_hoje", site)).toBe(false);
  });
  it("não existe ação de pagamento em nenhum papel", () => {
    for (const ctx of [cliente, prof, dono, painel, site])
      expect(acaoPermitida("confirmar_pagamento", ctx)).toBe(false);
  });
});

/** Permissões que o preset de cada papel entrega (as mesmas que as telas exigem). */
const PERMISSOES_DO_BARBEIRO = [
  "criar_agendamento",
  "agendamento_manual",
  "cancelar_agendamento",
  "visualizar_clientes",
  "editar_clientes",
];

describe("painel: a Flow IA não pode mais do que a pessoa", () => {
  const barbeiro: ContextoDoCerebro = {
    ...base,
    canal: "painel",
    papel: "profissional",
    profissionalId: "p1",
    permissoes: PERMISSOES_DO_BARBEIRO,
  };
  const gerente: ContextoDoCerebro = {
    ...base,
    canal: "painel",
    papel: "dono",
    permissoes: [...PERMISSOES_DO_BARBEIRO, "visualizar_financeiro"],
  };

  it("barbeiro não vê indicadores do negócio, mas agenda e cancela os próprios", () => {
    expect(acaoPermitida("consultar_movimento", barbeiro)).toBe(false);
    expect(acaoPermitida("consultar_caixa_hoje", barbeiro)).toBe(false);
    for (const a of ["criar_agendamento", "cancelar_agendamento", "reagendar_agendamento"])
      expect(acaoPermitida(a, barbeiro)).toBe(true);
  });
  it("gerente e dono veem indicadores; caixa exige visualizar_financeiro", () => {
    expect(acaoPermitida("consultar_movimento", gerente)).toBe(true);
    expect(acaoPermitida("consultar_caixa_hoje", gerente)).toBe(true);
    expect(acaoPermitida("consultar_caixa_hoje", { ...gerente, permissoes: [] })).toBe(false);
  });
  it("sem a permissão, a ação nem é oferecida (cancelar, agendar, editar cliente)", () => {
    const semCancelar = { ...gerente, permissoes: ["agendamento_manual", "editar_clientes"] };
    expect(acaoPermitida("cancelar_agendamento", semCancelar)).toBe(false);
    expect(acaoPermitida("reagendar_agendamento", semCancelar)).toBe(false); // exige as duas
    expect(acaoPermitida("criar_agendamento", semCancelar)).toBe(true);
    const semEditar = { ...gerente, permissoes: ["agendamento_manual"] };
    for (const a of ["criar_cliente", "atualizar_dados_cliente", "registrar_nota"])
      expect(acaoPermitida(a, semEditar)).toBe(false);
  });
  it("sem permissões resolvidas, falha fechada: nenhuma escrita, só consultas", () => {
    const semNada: ContextoDoCerebro = { ...base, canal: "painel", papel: "dono" };
    for (const a of [
      "criar_agendamento",
      "cancelar_agendamento",
      "reagendar_agendamento",
      "criar_cliente",
      "buscar_cliente",
      "consultar_caixa_hoje",
    ])
      expect(acaoPermitida(a, semNada)).toBe(false);
    for (const a of ["listar_servicos", "consultar_disponibilidade", "consultar_agendamento"])
      expect(acaoPermitida(a, semNada)).toBe(true);
  });
  it("a permissão do painel não muda o WhatsApp nem o site", () => {
    expect(acaoPermitida("cancelar_agendamento", cliente)).toBe(true);
    expect(acaoPermitida("criar_agendamento", prof)).toBe(true);
    expect(acaoPermitida("buscar_cliente", prof)).toBe(true);
  });
  it("nunca há ação de pagamento no painel", () => {
    expect(acaoPermitida("confirmar_pagamento", gerente)).toBe(false);
    expect(acaoPermitida("confirmar_pagamento", barbeiro)).toBe(false);
  });
});

describe("profissional só mexe nos atendimentos dele", () => {
  const meu = { canal: "painel", papel: "profissional", profissionalId: "p1" } as const;
  it("atendimento do colega é recusado; o próprio passa", () => {
    expect(atendimentoDeOutroProfissional(meu, "p2")).toBe(true);
    expect(atendimentoDeOutroProfissional(meu, "p1")).toBe(false);
  });
  it("usuário sem profissional ligado não mexe em nenhum", () => {
    expect(atendimentoDeOutroProfissional({ ...meu, profissionalId: null }, "p1")).toBe(true);
    expect(atendimentoDeOutroProfissional({ ...meu, profissionalId: null }, null)).toBe(true);
  });
  it("vale também no WhatsApp; dono, cliente e site não são limitados por esta regra", () => {
    expect(atendimentoDeOutroProfissional({ ...meu, canal: "whatsapp" }, "p2")).toBe(true);
    expect(atendimentoDeOutroProfissional({ canal: "painel", papel: "dono" }, "p2")).toBe(false);
    expect(atendimentoDeOutroProfissional({ canal: "whatsapp", papel: "cliente" }, "p2")).toBe(
      false,
    );
    expect(atendimentoDeOutroProfissional({ canal: "site", papel: "profissional" }, "p2")).toBe(
      false,
    );
  });
});

describe("papel do painel", () => {
  it("barbeiro é profissional; dono, gerente e recepção operam o negócio", () => {
    expect(papelDoPainel("barbeiro")).toBe("profissional");
    for (const p of ["dono", "gerente", "recepcao"]) expect(papelDoPainel(p)).toBe("dono");
  });
  it("papel desconhecido ou vazio não ganha visão de dono por engano de profissional", () => {
    expect(papelDoPainel(null)).toBe("dono");
    expect(papelDoPainel("")).toBe("dono");
  });
});
