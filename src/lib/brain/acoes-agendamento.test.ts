/* eslint-disable @typescript-eslint/no-explicit-any -- banco e domínio simulados */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarBancoFalso } from "./banco-falso.apoio";

const estado = vi.hoisted(() => ({
  banco: null as any,
  domínio: vi.fn(),
  validar: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return estado.banco;
  },
}));
vi.mock("@/lib/ia/acoes.server", () => ({
  ACOES_DO_AGENTE: {
    criar_agendamento: (...a: unknown[]) => estado.domínio(...a),
    cadastrar_servicos: (...a: unknown[]) => estado.domínio(...a),
    definir_horarios: (...a: unknown[]) => estado.domínio(...a),
    cadastrarServicos: (...a: unknown[]) => estado.domínio(...a),
    definirHorarios: (...a: unknown[]) => estado.domínio(...a),
  },
  cadastrarServicos: (...a: unknown[]) => estado.domínio(...a),
  definirHorarios: (...a: unknown[]) => estado.domínio(...a),
}));
vi.mock("@/lib/agenda-regras.server", () => ({
  STATUS_QUE_OCUPAM: ["agendado", "chegou"],
  validarAgendamento: (...a: unknown[]) => estado.validar(...a),
}));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));

import {
  acaoPermitida,
  ACOES,
  agendamentoIdentico,
  agendarComSeguranca,
  conferirAgendamento,
  ferramentasDoContexto,
  verificarGravacao,
  type ContextoDoCerebro,
} from "./acoes.server";

const INICIO = "2026-10-12T15:00:00-03:00";
const ctx: ContextoDoCerebro = {
  tenantId: "t1",
  canal: "painel",
  ator: "u1",
  papel: "dono",
  permissoes: ["agendamento_manual", "visualizar_clientes", "alterar_dados_barbearia"],
};
const alvo = { clienteId: "cli-1", servicoId: "srv-1", profissionalId: "pro-1", inicio: INICIO };
const linha = (extra: Record<string, unknown> = {}) => ({
  id: "ag-1",
  tenant_id: "t1",
  cliente_id: "cli-1",
  servico_id: "srv-1",
  profissional_id: "pro-1",
  inicio: new Date(INICIO).toISOString(),
  status: "agendado",
  ...extra,
});

beforeEach(() => {
  estado.banco = criarBancoFalso({ agendamentos: [], clientes: [] });
  estado.domínio.mockReset();
  estado.validar.mockReset();
  estado.validar.mockResolvedValue(null);
});

describe("agendamento idempotente e verificado", () => {
  it("o mesmo agendamento já existe → não chama o domínio e não cria outro", async () => {
    estado.banco.tabelas.agendamentos.push(linha());
    const r: any = await agendarComSeguranca(ctx, alvo, estado.domínio);
    expect(r).toMatchObject({ agendamento_id: "ag-1", jaExistia: true, verificado: true });
    expect(estado.domínio).not.toHaveBeenCalled();
  });

  it("reenvio do mesmo pedido depois de um timeout: continua sendo um único agendamento", async () => {
    estado.domínio.mockImplementation(async () => {
      estado.banco.tabelas.agendamentos.push(linha());
      return { agendamento_id: "ag-1" };
    });
    const primeira: any = await agendarComSeguranca(ctx, alvo, estado.domínio);
    const segunda: any = await agendarComSeguranca(ctx, alvo, estado.domínio);
    expect(primeira.jaExistia).toBe(false);
    expect(segunda.jaExistia).toBe(true);
    expect(estado.domínio).toHaveBeenCalledTimes(1);
    expect(estado.banco.tabelas.agendamentos).toHaveLength(1);
  });

  it("duas chamadas simultâneas: uma grava, a outra reconhece o registro idêntico (sem erro)", async () => {
    estado.domínio.mockImplementation(async () => {
      await Promise.resolve();
      if (estado.banco.tabelas.agendamentos.length)
        throw new Error("Esse horário acabou de ser reservado, escolha outro");
      estado.banco.tabelas.agendamentos.push(linha());
      return { agendamento_id: "ag-1" };
    });
    const [a, b]: any[] = await Promise.all([
      agendarComSeguranca(ctx, alvo, estado.domínio),
      agendarComSeguranca(ctx, alvo, estado.domínio),
    ]);
    expect(estado.banco.tabelas.agendamentos).toHaveLength(1);
    expect([a.jaExistia, b.jaExistia].sort()).toEqual([false, true]);
  });

  it("conflito real (horário ocupado por OUTRO cliente) continua sendo erro", async () => {
    estado.banco.tabelas.agendamentos.push(linha({ id: "ag-9", cliente_id: "cli-2" }));
    estado.domínio.mockRejectedValue(
      new Error("Esse horário acabou de ser reservado, escolha outro"),
    );
    await expect(agendarComSeguranca(ctx, alvo, estado.domínio)).rejects.toThrow(/reservado/);
  });

  it("agendamento cancelado não conta como o mesmo: pode agendar de novo", async () => {
    estado.banco.tabelas.agendamentos.push(linha({ status: "cancelado" }));
    expect(await agendamentoIdentico(ctx, alvo)).toBeNull();
  });

  it("só enxerga agendamentos do próprio negócio", async () => {
    estado.banco.tabelas.agendamentos.push(linha({ tenant_id: "outro-negocio" }));
    expect(await agendamentoIdentico(ctx, alvo)).toBeNull();
  });

  it("sucesso só depois de reler o registro gravado", async () => {
    estado.domínio.mockResolvedValue({ agendamento_id: "ag-1" }); // domínio disse que gravou, mas não há registro
    await expect(agendarComSeguranca(ctx, alvo, estado.domínio)).rejects.toThrow(
      /confirmar que o horário foi gravado/,
    );
  });

  it("registro gravado com dados diferentes do pedido é erro, não sucesso", async () => {
    estado.banco.tabelas.agendamentos.push(linha({ profissional_id: "pro-2" }));
    await expect(verificarGravacao(ctx, "ag-1", alvo)).rejects.toThrow(/confirmar/);
    await expect(verificarGravacao(ctx, undefined, alvo)).rejects.toThrow(/confirmar/);
    await expect(
      verificarGravacao(ctx, "ag-1", { ...alvo, inicio: "2026-10-12T16:00:00-03:00" }),
    ).rejects.toThrow();
  });

  it("registro de outro negócio com o mesmo id não verifica a gravação", async () => {
    estado.banco.tabelas.agendamentos.push(linha({ tenant_id: "outro-negocio" }));
    await expect(verificarGravacao(ctx, "ag-1", alvo)).rejects.toThrow(/confirmar/);
  });
});

describe("criar_agendamento pelo catálogo (reaproveita o domínio)", () => {
  it("executar usa a ação de domínio existente, com o profissional forçado para si", async () => {
    estado.banco.tabelas.clientes.push({ id: "cli-1", tenant_id: "t1", nome: "Leandro Silva" });
    estado.domínio.mockImplementation(async () => {
      estado.banco.tabelas.agendamentos.push(linha());
      return { agendamento_id: "ag-1" };
    });
    const prof: ContextoDoCerebro = { ...ctx, papel: "profissional", profissionalId: "pro-1" };
    const r: any = await ACOES["criar_agendamento"]!.executar(prof, {
      clienteId: "cli-1",
      servicoId: "srv-1",
      profissionalId: "pro-OUTRO",
      inicio: INICIO,
    });
    expect(r.verificado).toBe(true);
    expect(estado.domínio.mock.calls[0]![1]).toMatchObject({
      profissionalId: "pro-1",
      formaPagamento: "balcao",
    });
  });

  it("cliente de outro negócio é recusado antes de qualquer gravação", async () => {
    estado.banco.tabelas.clientes.push({
      id: "cli-1",
      tenant_id: "outro-negocio",
      nome: "Leandro",
    });
    await expect(
      ACOES["criar_agendamento"]!.executar(ctx, {
        clienteId: "cli-1",
        servicoId: "srv-1",
        profissionalId: "pro-1",
        inicio: INICIO,
      }),
    ).rejects.toThrow(/Cliente não encontrado/);
    expect(estado.domínio).not.toHaveBeenCalled();
  });
});

describe("cadastro de serviços e horários pelo cérebro único", () => {
  it("oferece as duas escritas somente no painel com a permissão de configuração", () => {
    const nomes = ferramentasDoContexto(ctx).map((f) => f.name);
    expect(nomes).toContain("cadastrar_servicos");
    expect(nomes).toContain("definir_horarios");
    expect(
      ferramentasDoContexto({ ...ctx, permissoes: ["agendamento_manual"] }).map((f) => f.name),
    ).not.toContain("cadastrar_servicos");
  });

  it("prepara o cadastro sem executar até a confirmação do agente", async () => {
    estado.domínio.mockResolvedValue({ total: 1 });
    const r = await ACOES["cadastrar_servicos"]!.executar(ctx, {
      servicos: [{ nome: "Corte", duracaoMin: 30, precoCentavos: 4500 }],
    });
    expect(r).toEqual({ total: 1 });
    expect(estado.domínio).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1" }),
      { servicos: [{ nome: "Corte", duracaoMin: 30, precoCentavos: 4500 }] },
    );
  });

  it("mantém as validações de horário na ação de domínio", async () => {
    estado.domínio.mockResolvedValue({ total: 7 });
    await ACOES["definir_horarios"]!.executar(ctx, {
      horarios: [{ diaSemana: 1, fechado: false, abre: "09:00", fecha: "19:00" }],
    });
    expect(estado.domínio).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1" }),
      { horarios: [{ diaSemana: 1, fechado: false, abre: "09:00", fecha: "19:00" }] },
    );
  });
});

describe("buscar_cliente_por_nome", () => {
  const clientes = [
    {
      id: "c1",
      tenant_id: "t1",
      nome: "Leandro Silva",
      telefone: "5511988884321",
      arquivado_em: null,
    },
    {
      id: "c2",
      tenant_id: "t1",
      nome: "Leandro Costa",
      telefone: "5511977770001",
      arquivado_em: null,
    },
    {
      id: "c3",
      tenant_id: "t1",
      nome: "João Pereira",
      telefone: "5511966660002",
      arquivado_em: null,
    },
    {
      id: "c4",
      tenant_id: "t1",
      nome: "Leandro Antigo",
      telefone: "5511955550003",
      arquivado_em: "2026-01-01",
    },
    {
      id: "c5",
      tenant_id: "outro-negocio",
      nome: "Leandro Alheio",
      telefone: "5511944440004",
      arquivado_em: null,
    },
  ];
  const buscar = (nome: string, c: ContextoDoCerebro = ctx): Promise<any> =>
    ACOES["buscar_cliente_por_nome"]!.executar(c, { nome });

  beforeEach(() => {
    estado.banco.tabelas.clientes.push(...clientes.map((c) => ({ ...c })));
  });

  it("devolve só clientes ativos do PRÓPRIO negócio, com o final do telefone", async () => {
    const r = await buscar("Leandro");
    expect(r.encontrados).toBe(2);
    expect(r.clientes.map((c: any) => c.nome).sort()).toEqual(["Leandro Costa", "Leandro Silva"]);
    expect(r.clientes.find((c: any) => c.nome === "Leandro Silva").telefoneFinal).toBe("4321");
    expect(JSON.stringify(r)).not.toMatch(/5511988884321|Alheio|Antigo/);
  });

  it("a consulta ao banco sempre filtra por negócio e ignora arquivados", async () => {
    await buscar("Leandro");
    const f = estado.banco.consultas.find((c: any) => c.tabela === "clientes").filtros;
    expect(f).toContainEqual(["eq", "tenant_id", "t1"]);
    expect(f).toContainEqual(["is", "arquivado_em", null]);
  });

  it("não diferencia acento nem caixa, e refina com sobrenome", async () => {
    expect((await buscar("joao")).clientes[0].nome).toBe("João Pereira");
    expect((await buscar("LEANDRO silva")).encontrados).toBe(1);
  });

  it("nome vazio ou sem resultado devolve lista vazia, sem erro", async () => {
    expect(await buscar("  ")).toEqual({ encontrados: 0, clientes: [] });
    expect((await buscar("Zacarias")).encontrados).toBe(0);
  });

  it("não procura em outro negócio mesmo que o nome exista lá", async () => {
    expect((await buscar("Alheio")).encontrados).toBe(0);
  });

  it("padrão com % ou _ digitado pela pessoa não vira curinga", async () => {
    expect((await buscar("%")).encontrados).toBe(0);
    expect((await buscar("_")).encontrados).toBe(0);
  });
});

describe("quem pode usar o quê (permissões)", () => {
  const base = { tenantId: "t1", ator: "u1" };
  it("painel: exige as permissões das telas", () => {
    const sem: ContextoDoCerebro = { ...base, canal: "painel", papel: "dono", permissoes: [] };
    expect(acaoPermitida("criar_agendamento", sem)).toBe(false);
    expect(acaoPermitida("buscar_cliente_por_nome", sem)).toBe(false);
    expect(acaoPermitida("criar_agendamento", ctx)).toBe(true);
    expect(acaoPermitida("buscar_cliente_por_nome", ctx)).toBe(true);
    expect(
      acaoPermitida("buscar_cliente_por_nome", { ...ctx, permissoes: ["agendamento_manual"] }),
    ).toBe(false);
  });
  it("cliente no WhatsApp e site NUNCA buscam clientes por nome", () => {
    const cliente: ContextoDoCerebro = {
      ...base,
      canal: "whatsapp",
      telefoneCliente: "5511999999999",
    };
    const site: ContextoDoCerebro = { ...base, canal: "site" };
    expect(acaoPermitida("buscar_cliente_por_nome", cliente)).toBe(false);
    expect(acaoPermitida("buscar_cliente_por_nome", site)).toBe(false);
    expect(ferramentasDoContexto(cliente).map((f) => f.name)).not.toContain(
      "buscar_cliente_por_nome",
    );
  });
  it("equipe no WhatsApp pode buscar por nome", () => {
    expect(
      acaoPermitida("buscar_cliente_por_nome", { ...base, canal: "whatsapp", papel: "dono" }),
    ).toBe(true);
    expect(
      acaoPermitida("buscar_cliente_por_nome", {
        ...base,
        canal: "whatsapp",
        papel: "profissional",
        profissionalId: "p1",
        permissoes: ["visualizar_clientes"],
      }),
    ).toBe(true);
  });
  it("a descrição da ferramenta de agendar muda conforme a política (painel × WhatsApp)", () => {
    const noPainel = ferramentasDoContexto(ctx).find((f) => f.name === "criar_agendamento")!;
    expect(noPainel.description).toMatch(/executa na hora/);
    const noZap = ferramentasDoContexto({ ...base, canal: "whatsapp", papel: "dono" }).find(
      (f) => f.name === "criar_agendamento",
    )!;
    expect(noZap.description).toMatch(/só executa depois que a pessoa confirmar/);
    expect(noZap.description).not.toMatch(/executa na hora/);
  });
});

describe("conferência do agendamento (o que a pessoa vê antes de gravar)", () => {
  const dados = { clienteId: "cli-1", servicoId: "srv-1", profissionalId: "pro-1", inicio: INICIO };
  const popular = () => {
    estado.banco.tabelas.clientes.push({
      id: "cli-1",
      tenant_id: "t1",
      nome: "Leandro Silva",
      telefone: "5511988884321",
    });
    estado.banco.tabelas.servicos = [
      {
        id: "srv-1",
        tenant_id: "t1",
        nome: "Corte",
        preco_centavos: 4500,
        duracao_min: 30,
        ativo: true,
        profissional_ids: null,
      },
    ];
    estado.banco.tabelas.profissionais = [
      { id: "pro-1", tenant_id: "t1", nome: "Rafa", ativo: true },
    ];
  };
  const por = (itens: any[], id: string) => itens.find((i) => i.id === id);

  it("tudo certo: mostra cliente, serviço, profissional, dia/hora e as regras da agenda como ok", async () => {
    popular();
    const itens = await conferirAgendamento(ctx, dados);
    expect(por(itens, "cliente")).toMatchObject({
      estado: "ok",
      valor: "Leandro Silva (final 4321)",
    });
    expect(por(itens, "servico")).toMatchObject({ estado: "ok" });
    expect(por(itens, "servico").valor).toMatch(/^Corte · 30 min · R\$/);
    expect(por(itens, "profissional")).toMatchObject({ estado: "ok", valor: "Rafa" });
    expect(por(itens, "quando").estado).toBe("ok");
    expect(por(itens, "regras")).toMatchObject({ estado: "ok" });
    expect(por(itens, "permissao")).toMatchObject({ estado: "ok" });
    expect(estado.validar).toHaveBeenCalledTimes(1);
    expect(estado.validar.mock.calls[0]![1]).toMatchObject({
      tenantId: "t1",
      profissionalId: "pro-1",
      clienteId: "cli-1",
    });
  });

  it("a regra OFICIAL da agenda que recusa vira item de erro com o motivo dela", async () => {
    popular();
    estado.validar.mockRejectedValue(new Error("Esse horário está fora do expediente."));
    const itens = await conferirAgendamento(ctx, dados);
    expect(por(itens, "regras")).toMatchObject({
      estado: "erro",
      detalhe: "Esse horário está fora do expediente.",
    });
  });

  it("outro horário do mesmo cliente no dia bloqueia (o domínio também recusaria)", async () => {
    popular();
    estado.validar.mockResolvedValue({ hora: "11:00" });
    const itens = await conferirAgendamento(ctx, dados);
    expect(por(itens, "regras")).toMatchObject({ estado: "erro" });
    expect(por(itens, "regras").valor).toMatch(/11:00/);
  });

  it("o mesmo agendamento já existe: atenção (confirmar não cria outro) e a regra de conflito nem roda", async () => {
    popular();
    estado.banco.tabelas.agendamentos.push(linha());
    const itens = await conferirAgendamento(ctx, dados);
    expect(por(itens, "regras")).toMatchObject({ estado: "atencao" });
    expect(estado.validar).not.toHaveBeenCalled();
  });

  it("cliente, serviço e profissional inexistentes viram erro e as regras nem são consultadas", async () => {
    const itens = await conferirAgendamento(ctx, dados);
    expect(por(itens, "cliente").estado).toBe("erro");
    expect(por(itens, "servico").estado).toBe("erro");
    expect(por(itens, "profissional").estado).toBe("erro");
    expect(por(itens, "regras")).toBeUndefined();
    expect(estado.validar).not.toHaveBeenCalled();
  });

  it("cliente de OUTRO negócio é tratado como inexistente", async () => {
    popular();
    estado.banco.tabelas.clientes[0]!.tenant_id = "outro-negocio";
    expect(por(await conferirAgendamento(ctx, dados), "cliente").estado).toBe("erro");
  });

  it("horário ilegível e falta de permissão aparecem como erro", async () => {
    popular();
    expect(
      por(await conferirAgendamento(ctx, { ...dados, inicio: "amanhã às 15h" }), "quando").estado,
    ).toBe("erro");
    const semPermissao = { ...ctx, permissoes: [] };
    expect(por(await conferirAgendamento(semPermissao, dados), "permissao").estado).toBe("erro");
  });

  it("só lê: nunca grava nem chama o domínio", async () => {
    popular();
    const antes = JSON.stringify(estado.banco.tabelas);
    await conferirAgendamento(ctx, dados);
    expect(JSON.stringify(estado.banco.tabelas)).toBe(antes);
    expect(estado.domínio).not.toHaveBeenCalled();
  });
});
