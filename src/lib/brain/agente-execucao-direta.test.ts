/* eslint-disable @typescript-eslint/no-explicit-any -- simulações de banco e IA nos testes */
import { beforeEach, describe, expect, it, vi } from "vitest";

const INICIO = "2026-10-12T15:00:00-03:00";

const estado = vi.hoisted(() => ({
  roteiro: [] as any[][],
  chamadasIa: 0,
  executadas: [] as string[],
  estados: [] as string[],
  buscaDevolve: {
    clientes: [{ id: "cli-1", nome: "Leandro Silva", telefoneFinal: "4321" }],
  } as any,
  agendarFalha: null as string | null,
  itensConferir: [] as any[],
  conferirFalha: false,
  conferirChamadas: 0,
  agendarDevolve: { agendamento_id: "ag-1", jaExistia: false, verificado: true } as any,
}));

vi.mock("./uso.server", () => ({
  bloqueioDeUso: async () => null,
  pausarIa: async () => undefined,
  registrarAcao: async () => undefined,
  registrarTurno: async () => undefined,
  retomarIa: async () => undefined,
}));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));
vi.mock("./observabilidade.server", () => ({
  iniciarTurno: () => ({
    runId: "t",
    aoChamarModelo: () => undefined,
    registrarFerramenta: () => undefined,
    definirEstado: (e: string) => estado.estados.push(e),
    finalizar: async () => undefined,
  }),
}));
vi.mock("./gateway.server", () => ({
  ErroDoGateway: class extends Error {},
  textoDaSaida: (s: any[]) => s.find((i) => i.type === "message")?.content ?? "",
  criarSessaoDoGateway: () => ({
    responder: async () => {
      estado.chamadasIa += 1;
      const proxima = estado.roteiro.shift();
      if (!proxima) throw new Error("roteiro do modelo acabou");
      return proxima;
    },
  }),
}));
vi.mock("./acoes.server", () => ({
  ACOES: {
    buscar_cliente_por_nome: { risco: "leitura", executar: async () => estado.buscaDevolve },
    listar_servicos: { risco: "leitura", executar: async () => [{ id: "srv-1", nome: "Corte" }] },
    consultar_disponibilidade: {
      risco: "leitura",
      executar: async () => ({ livres: [{ profissionalId: "pro-1", inicio: INICIO }] }),
    },
    criar_agendamento: {
      risco: "escrita",
      resumir: async () => "Agendar Corte com Rafa em segunda, 12/10, 15:00 para Leandro Silva.",
      conferir: async () => {
        estado.conferirChamadas += 1;
        if (estado.conferirFalha) throw new Error("banco fora");
        return estado.itensConferir;
      },
      executar: async () => {
        if (estado.agendarFalha) throw new Error(estado.agendarFalha);
        estado.executadas.push("criar_agendamento");
        return estado.agendarDevolve;
      },
    },
    cancelar_agendamento: {
      risco: "escrita",
      resumir: async () => "Cancelar o corte de terça.",
      executar: async () => {
        estado.executadas.push("cancelar_agendamento");
        return { ok: true };
      },
    },
  },
  acaoPermitida: () => true,
  ehEquipeNoWhatsapp: (c: any) => c.canal === "whatsapp" && c.papel !== "cliente" && !!c.papel,
  ferramentasDoContexto: () => [],
}));

const painel = {
  tenantId: "t1",
  canal: "painel",
  ator: "u1",
  papel: "dono",
  permissoes: [],
} as any;
const persona = { nome: "Flow IA", negocio: "Aurora" };

const chamada = (name: string, args: object, id = name) => ({
  type: "function_call",
  name,
  arguments: JSON.stringify(args),
  call_id: id,
});
const texto = (content: string) => ({ type: "message", content });
const dadosDoAgendamento = {
  clienteId: "cli-1",
  servicoId: "srv-1",
  profissionalId: "pro-1",
  inicio: INICIO,
};

/** Roteiro completo de um pedido bem feito: busca, serviço, disponibilidade, agendar. */
function roteiroCompleto(agendar: object = dadosDoAgendamento) {
  return [
    [chamada("buscar_cliente_por_nome", { nome: "Leandro" })],
    [chamada("listar_servicos", {})],
    [
      chamada("consultar_disponibilidade", {
        dia: "2026-10-12",
        servicoId: "srv-1",
        profissionalId: null,
      }),
    ],
    [chamada("criar_agendamento", agendar)],
  ];
}

async function comandar(
  mensagem = "Flow IA, marque um horário para Leandro amanhã às 15h para corte.",
  ctx: any = painel,
  extra: any = {},
) {
  const { pensarCortai } = await import("./agente.server");
  return pensarCortai({ ctx, persona, historico: [], mensagem, pendente: null, ...extra });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  estado.roteiro = [];
  estado.chamadasIa = 0;
  estado.executadas.length = 0;
  estado.estados.length = 0;
  estado.buscaDevolve = {
    clientes: [{ id: "cli-1", nome: "Leandro Silva", telefoneFinal: "4321" }],
  };
  estado.agendarFalha = null;
  estado.itensConferir = [];
  estado.conferirFalha = false;
  estado.conferirChamadas = 0;
  estado.agendarDevolve = { agendamento_id: "ag-1", jaExistia: false, verificado: true };
});

describe("pedido pendente", () => {
  it("não prepara outra escrita quando a mensagem é outro assunto", async () => {
    const anterior = {
      id: "p-antiga",
      acao: "criar_agendamento",
      dados: dadosDoAgendamento,
      resumo: "Agendar Corte amanhã às 10:00.",
      criadaEm: new Date().toISOString(),
    };
    estado.roteiro = [
      [chamada("criar_agendamento", dadosDoAgendamento)],
      [texto("Posso ajudar com a outra dúvida.")],
    ];
    const r = await comandar("Quanto custa?", painel, { pendente: anterior });
    expect(estado.executadas).toEqual([]);
    expect(r.pendente?.id).toBe("p-antiga");
  });

  it("esgotar os passos respondendo uma pergunta paralela preserva a ação pendente", async () => {
    const anterior = {
      id: "p-antiga",
      acao: "criar_agendamento",
      dados: dadosDoAgendamento,
      resumo: "Agendar Corte amanhã às 10:00.",
      criadaEm: new Date().toISOString(),
    };
    estado.roteiro = Array.from({ length: 6 }, () => [chamada("listar_servicos", {})]);
    const r = await comandar("Quanto custa?", painel, { pendente: anterior });
    expect(estado.executadas).toEqual([]);
    expect(r.pendente?.id).toBe("p-antiga");
    expect(r.texto).toContain("continua aguardando confirmação");
  });

  it("uma correção prepara nova proposta, mas nunca executa diretamente", async () => {
    const anterior = {
      id: "p-antiga",
      acao: "criar_agendamento",
      dados: dadosDoAgendamento,
      resumo: "Agendar Corte amanhã às 10:00.",
      criadaEm: new Date().toISOString(),
    };
    estado.roteiro = [
      [chamada("criar_agendamento", { ...dadosDoAgendamento, inicio: "2026-10-12T16:00:00-03:00" })],
      [texto("A nova proposta ficou pronta.")],
    ];
    const r = await comandar("Sim, na verdade, muda para as 16h", painel, { pendente: anterior });
    expect(estado.executadas).toEqual([]);
    expect(r.pendente).not.toBeNull();
    expect(r.pendente?.id).not.toBe("p-antiga");
  });
});

describe("execução direta no painel", () => {
  it("dados claros e autorizados: executa na hora, sem pedir confirmação redundante", async () => {
    estado.roteiro = roteiroCompleto();
    const r = await comandar();
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.pendente).toBeNull();
    expect(r.texto).toMatch(/^Pronto ✅ Concluído: Agendar Corte .* para Leandro Silva\./);
    expect(r.texto).not.toMatch(/confirmar\?/);
    expect(estado.estados).toContain("acao_executada_direta");
    expect(r.acoes.at(-1)).toEqual({ nome: "criar_agendamento", sucesso: true });
    // O resultado vem do sistema: o modelo não é chamado de novo depois de gravar.
    expect(estado.chamadasIa).toBe(4);
  });

  it("o texto de sucesso nunca vem do modelo (ele pode mentir, o sistema não)", async () => {
    estado.roteiro = [
      ...roteiroCompleto(),
      [texto("Agendei tudo certinho, pode ficar tranquilo!")],
    ];
    const r = await comandar();
    expect(r.texto).not.toMatch(/tranquilo/);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });

  it("registro idêntico já existente: informa que NÃO criou outro", async () => {
    estado.agendarDevolve = { agendamento_id: "ag-1", jaExistia: true, verificado: true };
    estado.roteiro = roteiroCompleto();
    const r = await comandar();
    expect(r.texto).toMatch(/já estava registrado, não criei outro/);
  });

  it("profissional logado agenda sem informar profissional", async () => {
    estado.roteiro = roteiroCompleto({ ...dadosDoAgendamento, profissionalId: "qualquer" });
    const r = await comandar(undefined, {
      ...painel,
      papel: "profissional",
      profissionalId: "pro-1",
    });
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });
});

describe("quando NÃO pode dispensar a confirmação", () => {
  const prepara = async (r: Awaited<ReturnType<typeof comandar>>) => {
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente?.acao).toBe("criar_agendamento");
    expect(r.texto).not.toMatch(/^Pronto ✅/);
  };

  it("mais de um Leandro: não chuta, prepara a confirmação com o nome no resumo", async () => {
    estado.buscaDevolve = {
      clientes: [
        { id: "cli-1", nome: "Leandro Silva", telefoneFinal: "4321" },
        { id: "cli-2", nome: "Leandro Costa", telefoneFinal: "0001" },
      ],
    };
    estado.roteiro = [...roteiroCompleto(), [texto("Agendei para o Leandro Silva!")]];
    const r = await comandar();
    await prepara(r);
    // O modelo afirmou "Agendei": a barreira troca pelo resumo e pede a confirmação.
    expect(r.texto).toMatch(/Posso confirmar\?/);
  });

  it("horário que não veio da disponibilidade", async () => {
    estado.roteiro = [
      ...roteiroCompleto({ ...dadosDoAgendamento, inicio: "2026-10-12T15:30:00-03:00" }),
      [texto("ok")],
    ];
    await prepara(await comandar());
  });

  it("cliente não resolvido por busca (id inventado)", async () => {
    estado.roteiro = [
      ...roteiroCompleto({ ...dadosDoAgendamento, clienteId: "cli-99" }),
      [texto("ok")],
    ];
    await prepara(await comandar());
  });

  it("serviço que não está no catálogo consultado", async () => {
    estado.roteiro = [
      ...roteiroCompleto({ ...dadosDoAgendamento, servicoId: "srv-99" }),
      [texto("ok")],
    ];
    await prepara(await comandar());
  });

  it("sem nenhuma consulta no turno (só a chamada de agendar)", async () => {
    estado.roteiro = [[chamada("criar_agendamento", dadosDoAgendamento)], [texto("ok")]];
    await prepara(await comandar());
  });

  it("WhatsApp (mesmo dono) e interruptor desligado continuam exigindo o SIM", async () => {
    estado.roteiro = [...roteiroCompleto(), [texto("ok")]];
    await prepara(await comandar(undefined, { ...painel, canal: "whatsapp" }));
    vi.stubEnv("CORTAI_EXECUCAO_DIRETA", "false");
    estado.executadas.length = 0;
    estado.roteiro = [...roteiroCompleto(), [texto("ok")]];
    await prepara(await comandar());
  });

  it("ação sensível (cancelar) nunca é direta, mesmo no painel", async () => {
    estado.roteiro = [[chamada("cancelar_agendamento", { agendamentoId: "ag-1" })], [texto("ok")]];
    const r = await comandar("cancela o agendamento do Leandro");
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente?.acao).toBe("cancelar_agendamento");
  });

  it("depois de preparar, o SIM executa uma única vez e o segundo SIM não repete", async () => {
    estado.roteiro = [
      ...roteiroCompleto({ ...dadosDoAgendamento, clienteId: "cli-99" }),
      [texto("ok")],
    ];
    const preparado = await comandar();
    let consumida = false;
    const consumirPendente = async () => (consumida ? false : (consumida = true));
    const a = await comandar("sim", painel, { pendente: preparado.pendente, consumirPendente });
    const b = await comandar("sim", painel, { pendente: preparado.pendente, consumirPendente });
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(a.texto).toMatch(/^Pronto ✅/);
    expect(b.texto).toMatch(/já foi tratada/);
  });
});

describe("falhas: nunca alegar sucesso", () => {
  it("conflito de horário: nada é gravado, o modelo recebe o motivo e a resposta não afirma agendamento", async () => {
    estado.agendarFalha = "Esse horário acabou de ser reservado, escolha outro";
    estado.roteiro = [...roteiroCompleto(), [texto("Prontinho, agendei o seu horário!")]];
    const r = await comandar();
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente).toBeNull();
    expect(r.texto).not.toMatch(/agendei|Pronto ✅/);
    expect(r.acoes.at(-1)).toMatchObject({ nome: "criar_agendamento", sucesso: false });
    expect(estado.estados).not.toContain("acao_executada_direta");
  });

  it("falha na verificação da gravação também é falha", async () => {
    estado.agendarFalha = "Não consegui confirmar que o horário foi gravado.";
    estado.roteiro = [...roteiroCompleto(), [texto("Horário confirmado!")]];
    const r = await comandar();
    expect(r.texto).not.toMatch(/^Pronto ✅/);
    expect(r.texto).not.toMatch(/confirmado!/i);
  });
});

describe("mensagem repetida no mesmo turno", () => {
  it("duas chamadas de agendar no mesmo turno executam só a primeira", async () => {
    estado.roteiro = [
      ...roteiroCompleto().slice(0, 3),
      [chamada("criar_agendamento", dadosDoAgendamento, "a")],
    ];
    const r = await comandar();
    expect(r.texto).toMatch(/^Pronto ✅/);
    expect(estado.executadas).toHaveLength(1);
  });
});

describe("homônimos: pop-up de opções e escolha na tela", () => {
  const doisLeandros = {
    encontrados: 2,
    clientes: [
      { id: "cli-1", nome: "Leandro Silva", telefoneFinal: "4321" },
      { id: "cli-2", nome: "Leandro Silva", telefoneFinal: "0001" },
    ],
  };

  it("busca ambígua + pergunta ao usuário: a resposta traz as opções para tocar", async () => {
    estado.buscaDevolve = doisLeandros;
    estado.roteiro = [
      [chamada("buscar_cliente_por_nome", { nome: "Leandro" })],
      [texto("Encontrei dois Leandro Silva. Qual deles?")],
    ];
    const r = await comandar();
    expect(estado.executadas).toHaveLength(0);
    expect(r.opcoes).toEqual([
      { tipo: "cliente", id: "cli-1", rotulo: "Leandro Silva", detalhe: "final 4321" },
      { tipo: "cliente", id: "cli-2", rotulo: "Leandro Silva", detalhe: "final 0001" },
    ]);
  });

  it("busca com resultado único ou sem resultado: nenhum pop-up", async () => {
    estado.roteiro = [
      [chamada("buscar_cliente_por_nome", { nome: "Leandro Silva" })],
      [texto("Ok, qual serviço?")],
    ];
    expect((await comandar()).opcoes).toBeUndefined();
    estado.buscaDevolve = { encontrados: 0, clientes: [] };
    estado.roteiro = [
      [chamada("buscar_cliente_por_nome", { nome: "Zacarias" })],
      [texto("Não achei. Cadastro?")],
    ];
    expect((await comandar()).opcoes).toBeUndefined();
  });

  it("uma busca nova e única depois da ambígua desfaz o pop-up", async () => {
    estado.buscaDevolve = doisLeandros;
    estado.roteiro = [
      [chamada("buscar_cliente_por_nome", { nome: "Leandro" }, "a")],
      [
        {
          ...chamada("buscar_cliente_por_nome", { nome: "Leandro Silva final 4321" }, "b"),
        },
      ],
      [texto("Certo.")],
    ];
    // O segundo resultado volta a ser ambíguo no mock; simula o refinamento trocando a resposta.
    let n = 0;
    const original = estado.buscaDevolve;
    Object.defineProperty(estado, "buscaDevolve", {
      configurable: true,
      get: () => (n++ === 0 ? original : { encontrados: 1, clientes: [original.clientes[0]] }),
      set: () => undefined,
    });
    const r = await comandar();
    expect(r.opcoes).toBeUndefined();
    Object.defineProperty(estado, "buscaDevolve", {
      configurable: true,
      writable: true,
      value: original,
    });
  });

  it("depois que a pessoa TOCA no cliente, o agendamento executa direto, sem repetir a busca", async () => {
    estado.roteiro = [
      [chamada("listar_servicos", {})],
      [
        chamada("consultar_disponibilidade", {
          dia: "2026-10-12",
          servicoId: "srv-1",
          profissionalId: null,
        }),
      ],
      [chamada("criar_agendamento", dadosDoAgendamento)],
    ];
    const r = await comandar("Leandro Silva (final 4321)", painel, { clienteEscolhidoId: "cli-1" });
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });

  it("a escolha vale só para AQUELE cliente: outro id continua pedindo confirmação", async () => {
    estado.roteiro = [
      [chamada("listar_servicos", {})],
      [
        chamada("consultar_disponibilidade", {
          dia: "2026-10-12",
          servicoId: "srv-1",
          profissionalId: null,
        }),
      ],
      [chamada("criar_agendamento", { ...dadosDoAgendamento, clienteId: "cli-2" })],
      [texto("ok")],
    ];
    const r = await comandar("Leandro Silva (final 4321)", painel, { clienteEscolhidoId: "cli-1" });
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente?.acao).toBe("criar_agendamento");
  });

  it("sem a escolha, o mesmo roteiro (ids vindos de lugar nenhum) não executa", async () => {
    estado.roteiro = [
      [chamada("listar_servicos", {})],
      [
        chamada("consultar_disponibilidade", {
          dia: "2026-10-12",
          servicoId: "srv-1",
          profissionalId: null,
        }),
      ],
      [chamada("criar_agendamento", dadosDoAgendamento)],
      [texto("ok")],
    ];
    const r = await comandar("Leandro Silva (final 4321)");
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente).not.toBeNull();
  });
});

describe("comando por voz: o que entendeu + confirmação", () => {
  it("voz com tudo resolvido NÃO grava: mostra 'Entendi assim' (texto do sistema) e espera o toque", async () => {
    // O modelo tenta enganar com uma paráfrase errada; o texto da conferência é do sistema.
    estado.roteiro = [...roteiroCompleto(), [texto("Prontinho, marquei para as 5 da tarde!")]];
    const r = await comandar(undefined, painel, { origemDoComando: "voz" });
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente?.acao).toBe("criar_agendamento");
    expect(r.texto).toBe(
      "Entendi assim: Agendar Corte com Rafa em segunda, 12/10, 15:00 para Leandro Silva. Posso confirmar?",
    );
    expect(estado.estados).not.toContain("acao_executada_direta");
  });

  it("o toque em Confirmar (um 'sim') grava uma vez, com o texto de resultado do sistema", async () => {
    estado.roteiro = [...roteiroCompleto(), [texto("ok")]];
    const preparado = await comandar(undefined, painel, { origemDoComando: "voz" });
    let consumida = false;
    const consumirPendente = async () => (consumida ? false : (consumida = true));
    const r = await comandar("sim", painel, {
      pendente: preparado.pendente,
      consumirPendente,
      origemDoComando: "texto",
    });
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });

  it("o mesmo comando digitado continua executando direto", async () => {
    estado.roteiro = roteiroCompleto();
    const r = await comandar(undefined, painel, { origemDoComando: "texto" });
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });

  it("com CORTAI_EXECUCAO_DIRETA_VOZ=true a voz também executa direto", async () => {
    vi.stubEnv("CORTAI_EXECUCAO_DIRETA_VOZ", "true");
    estado.roteiro = roteiroCompleto();
    const r = await comandar(undefined, painel, { origemDoComando: "voz" });
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });

  it("a conferência fixa vale também para escrita que sempre confirma (ex.: cancelar)", async () => {
    estado.roteiro = [
      [chamada("cancelar_agendamento", { agendamentoId: "ag-1" })],
      [texto("Cancelei!")],
    ];
    const r = await comandar("cancela o do Leandro", painel, { origemDoComando: "voz" });
    expect(r.texto).toBe("Entendi assim: Cancelar o corte de terça. Posso confirmar?");
    expect(estado.executadas).toHaveLength(0);
  });

  it("fora do painel (WhatsApp) o texto do modelo segue como antes", async () => {
    estado.roteiro = [
      [chamada("cancelar_agendamento", { agendamentoId: "ag-1" })],
      [texto("Quer cancelar o corte de terça? Posso confirmar?")],
    ];
    const r = await comandar(
      "cancela",
      { ...painel, canal: "whatsapp", papel: "cliente" },
      { origemDoComando: "texto" },
    );
    expect(r.texto).toBe("Quer cancelar o corte de terça? Posso confirmar?");
  });
});

describe("conferência visível do pedido", () => {
  const item = (
    id: string,
    estadoDoItem: "ok" | "atencao" | "erro",
    detalhe: string | null = null,
  ) => ({
    id,
    rotulo: id,
    valor: `valor de ${id}`,
    estado: estadoDoItem,
    detalhe,
  });

  it("tudo certo: executa direto e devolve a conferência 'pronto' para a tela mostrar", async () => {
    estado.itensConferir = [item("cliente", "ok"), item("regras", "ok")];
    estado.roteiro = roteiroCompleto();
    const r = await comandar();
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.conferencia?.veredito).toBe("pronto");
    expect(r.conferencia?.itens.map((i) => i.id)).toEqual(
      expect.arrayContaining([
        "cliente",
        "regras",
        "prova-cliente",
        "prova-servico",
        "prova-horario",
      ]),
    );
  });

  it("regra da agenda recusa (erro): NADA é preparado nem gravado, e o modelo recebe o motivo", async () => {
    estado.itensConferir = [item("regras", "erro", "Esse horário está fora do expediente.")];
    estado.roteiro = [...roteiroCompleto(), [texto("Prontinho, agendei!")]];
    const r = await comandar();
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente).toBeNull();
    expect(r.conferencia?.veredito).toBe("bloqueado");
    expect(r.conferencia?.resumo).toMatch(/fora do expediente/);
    expect(r.texto).not.toMatch(/agendei|Pronto ✅/);
  });

  it("ponto de atenção: não executa direto, prepara a confirmação com a conferência junto", async () => {
    estado.itensConferir = [item("regras", "atencao", "Esse horário já está registrado.")];
    estado.roteiro = [...roteiroCompleto(), [texto("ok")]];
    const r = await comandar();
    expect(estado.executadas).toHaveLength(0);
    expect(r.pendente?.acao).toBe("criar_agendamento");
    expect(r.conferencia?.veredito).toBe("atencao");
  });

  it("sem as provas do turno (cliente não buscado), o veredito é atenção mesmo com o backend ok", async () => {
    estado.itensConferir = [item("cliente", "ok")];
    estado.roteiro = [[chamada("criar_agendamento", dadosDoAgendamento)], [texto("ok")]];
    const r = await comandar();
    expect(r.conferencia?.veredito).toBe("atencao");
    expect(r.pendente).not.toBeNull();
  });

  it("falha ao conferir não derruba o pedido: vira atenção e pede confirmação", async () => {
    estado.conferirFalha = true;
    estado.roteiro = [...roteiroCompleto(), [texto("ok")]];
    const r = await comandar();
    expect(estado.executadas).toHaveLength(0);
    expect(r.conferencia?.veredito).toBe("atencao");
    expect(r.conferencia?.itens.some((i) => /Não consegui conferir/.test(i.valor))).toBe(true);
  });

  it("fora do painel não há conferência nem consulta extra (WhatsApp segue como antes)", async () => {
    estado.roteiro = [...roteiroCompleto(), [texto("Quer confirmar?")]];
    const r = await comandar(undefined, { ...painel, canal: "whatsapp", papel: "cliente" });
    expect(r.conferencia).toBeUndefined();
    expect(estado.conferirChamadas).toBe(0);
  });

  it("o veredito não depende do que o modelo escreve", async () => {
    estado.itensConferir = [item("regras", "erro", "Horário ocupado.")];
    estado.roteiro = [...roteiroCompleto(), [texto("Tudo conferido, pode gravar!")]];
    const r = await comandar();
    expect(r.conferencia?.veredito).toBe("bloqueado");
    expect(estado.executadas).toHaveLength(0);
  });

  it("com CORTAI_CONFERENCIA=false volta ao fluxo anterior: sem conferência e sem bloqueio", async () => {
    vi.stubEnv("CORTAI_CONFERENCIA", "false");
    estado.itensConferir = [item("regras", "erro", "Horário ocupado.")];
    estado.roteiro = roteiroCompleto();
    const r = await comandar();
    expect(r.conferencia).toBeUndefined();
    expect(estado.conferirChamadas).toBe(0);
    expect(estado.executadas).toEqual(["criar_agendamento"]); // o domínio ainda valida na hora de gravar
  });
});
