import { describe, expect, it } from "vitest";

import { conduzir, espalhar, type EstadoDaAgenda, type Livre, type Portas } from "./conduzir";

/** Sexta, 06/11/2026, 10:00 em São Paulo. */
const AGORA = new Date("2026-11-06T13:00:00Z");
const FUSO = "America/Sao_Paulo";

function iso(dia: string, hora: string) {
  return new Date(`${dia}T${hora}:00-03:00`).toISOString();
}

function portasFalsas(
  o: {
    servicos?: { id: string; nome: string; duracao_min: number; preco_centavos: number }[];
    equipe?: { id: string; nome: string }[];
    livres?: Record<string, Livre[]>;
    cliente?: { nome: string } | null;
    agendamentos?: Awaited<ReturnType<Portas["agendamentos"]>>;
    falharCriar?: Error;
  } = {},
) {
  const gravados: { tipo: string; dados: unknown }[] = [];
  const servicos = o.servicos ?? [
    { id: "s-corte", nome: "Corte", duracao_min: 30, preco_centavos: 4000 },
    { id: "s-barba", nome: "Barba", duracao_min: 20, preco_centavos: 3000 },
  ];
  const equipe = o.equipe ?? [
    { id: "p-ze", nome: "Zé" },
    { id: "p-ana", nome: "Ana" },
  ];
  let falhar = o.falharCriar;
  const portas: Portas = {
    fuso: FUSO,
    agora: AGORA,
    link: "https://previa.cortaiapp.pages.dev/agendar/demo",
    servicos: async () => servicos,
    profissionais: async () => equipe,
    livres: async (dia, _s, prof) =>
      (o.livres?.[dia] ?? []).filter((l) => !prof || l.profissionalId === prof),
    cliente: async () => (o.cliente === undefined ? { nome: "João Silva" } : o.cliente),
    agendamentos: async () => o.agendamentos ?? [],
    criar: async (d) => {
      if (falhar) {
        const e = falhar;
        falhar = undefined;
        throw e;
      }
      gravados.push({ tipo: "criar", dados: d });
    },
    remarcar: async (d) => void gravados.push({ tipo: "remarcar", dados: d }),
    cancelar: async (id) => void gravados.push({ tipo: "cancelar", dados: id }),
  };
  return { portas, gravados };
}

const LIVRES_SABADO: Livre[] = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"].map(
  (h) => ({
    inicio: iso("2026-11-07", h),
    profissionalId: "p-ze",
  }),
);

/** Conversa inteira: cada fala do cliente com o estado anterior. */
async function conversar(falas: string[], portas: Portas) {
  let estado: EstadoDaAgenda | null = null;
  const respostas: string[][] = [];
  for (const fala of falas) {
    const r = await conduzir(fala, estado, portas);
    respostas.push(r?.textos ?? ["<passou>"]);
    estado = r?.estado ?? null;
  }
  return { respostas, estado };
}

describe("agendar na conversa", () => {
  it("pede serviço, profissional e horário, confirma e só grava depois do sim", async () => {
    const { portas, gravados } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const { respostas, estado } = await conversar(["quero marcar", "1", "1", "2", "sim"], portas);
    expect(respostas[0]![0]).toContain("Qual serviço");
    expect(respostas[0]![0]).toContain("1. Corte — R$ 40,00");
    expect(respostas[1]![0]).toContain("Com quem");
    expect(respostas[1]![0]).toContain("3. Tanto faz");
    expect(respostas[2]![0]).toMatch(/Tenho estes horários livres:\n\n\*Sábado, 07\/11\*/);
    expect(respostas[2]![0]).toContain("1. 09:00");
    expect(respostas[3]![0]).toMatch(
      /Confira seu agendamento:\n\n\*Serviço:\* Corte\n\*Profissional:\* Zé\n\*Quando:\* Sábado, 07\/11, às \d\d:00\n\*Valor:\* R\$ 40,00/,
    );
    expect(respostas[4]![0]).toMatch(/^Pronto, João! Marquei \*Corte\*/);
    expect(gravados).toEqual([
      {
        tipo: "criar",
        dados: expect.objectContaining({ servicoId: "s-corte", profissionalId: "p-ze" }),
      },
    ]);
    expect(estado).toBeNull();
  });

  it("aproveita o que o cliente já disse e vai direto para a confirmação do horário exato", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const r = await conduzir("quero marcar corte amanhã às 15h com o Zé", null, portas);
    expect(r?.textos[0]).toMatch(
      /\*Serviço:\* Corte\n\*Profissional:\* Zé\n\*Quando:\* Sábado, 07\/11, às 15:00/,
    );
    expect(r?.estado?.etapa).toBe("confirmar");
  });

  it("dia sem vaga avisa e oferece o próximo dia com horário", async () => {
    const { portas } = portasFalsas({
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: { "2026-11-09": [{ inicio: iso("2026-11-09", "10:00"), profissionalId: "p-ze" }] },
    });
    const r = await conduzir("quero marcar corte amanhã", null, portas);
    expect(r?.textos[0]).toBe("Não tenho horário livre sábado, 07/11.");
    expect(r?.textos[1]).toMatch(/\*Segunda-feira, 09\/11\*/);
  });

  it("cliente sem cadastro: pede o nome antes de confirmar", async () => {
    const { portas, gravados } = portasFalsas({
      cliente: null,
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: { "2026-11-07": LIVRES_SABADO },
    });
    const { respostas } = await conversar(
      ["agendar corte amanhã às 10h", "Maria Souza", "sim"],
      portas,
    );
    expect(respostas[0]![0]).toBe("Para concluir, qual é o seu nome?");
    expect(respostas[1]![0]).toContain("Confira seu agendamento");
    expect(respostas[2]![0]).toMatch(/^Pronto, Maria!/);
    expect(gravados[0]?.dados).toMatchObject({ nomeCliente: "Maria Souza" });
  });

  it("horário tomado entre a oferta e o sim: avisa e mostra os livres", async () => {
    const { portas } = portasFalsas({
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: { "2026-11-07": LIVRES_SABADO },
      falharCriar: new Error("Horário indisponível."),
    });
    const { respostas, estado } = await conversar(["agendar corte amanhã às 10h", "sim"], portas);
    expect(respostas[1]![0]).toBe(
      "Esse horário acabou de ser ocupado. Veja os que ainda estão livres:",
    );
    expect(respostas[1]![1]).toContain("Tenho estes horários");
    expect(estado?.etapa).toBe("horario");
  });

  it('"não" na confirmação não grava e pergunta outro horário; "menu" sai do fluxo', async () => {
    const { portas, gravados } = portasFalsas({
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: { "2026-11-07": LIVRES_SABADO },
    });
    const { respostas, estado } = await conversar(
      ["agendar corte amanhã às 10h", "não", "menu"],
      portas,
    );
    expect(respostas[1]![0]).toContain("não marquei");
    expect(respostas[2]![0]).toBe("Tudo bem, não marquei nada. Se precisar, é só chamar.");
    expect(gravados).toHaveLength(0);
    expect(estado).toBeNull();
  });

  it("duas respostas sem sentido devolvem a conversa ao bot e à Flow IA", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const { respostas, estado } = await conversar(["quero marcar", "banana", "abacaxi"], portas);
    expect(respostas[1]![0]).toContain("Não entendi");
    expect(respostas[2]).toEqual([]);
    expect(estado).toBeNull();
  });

  it("pedido de atendente no meio do fluxo sai sem responder (o bot chama a equipe)", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const { respostas, estado } = await conversar(
      ["quero marcar", "quero falar com atendente"],
      portas,
    );
    expect(respostas[1]).toEqual([]);
    expect(estado).toBeNull();
  });

  it("assunto que não é de agenda passa adiante", async () => {
    const { portas } = portasFalsas();
    expect(await conduzir("qual o endereço?", null, portas)).toBeNull();
    expect(await conduzir("obrigado", null, portas)).toBeNull();
  });
});

describe("remarcar, cancelar e consultar", () => {
  const MARCADO = {
    id: "a-1",
    inicio: iso("2026-11-07", "15:00"),
    servicoId: "s-corte",
    servicoNome: "Corte",
    profissionalId: "p-ze",
    profissionalNome: "Zé",
  };

  it("cancelar: confirma antes e cancela o horário do próprio cliente", async () => {
    const { portas, gravados } = portasFalsas({ agendamentos: [MARCADO] });
    const { respostas } = await conversar(["quero cancelar", "sim"], portas);
    expect(respostas[0]![0]).toMatch(/Cancelar \*Corte\* de sábado, 07\/11, às 15:00\?/);
    expect(respostas[1]![0]).toMatch(/^Pronto, cancelei \*Corte\*/);
    expect(gravados).toEqual([{ tipo: "cancelar", dados: "a-1" }]);
  });

  it("cancelar e responder não mantém o horário", async () => {
    const { portas, gravados } = portasFalsas({ agendamentos: [MARCADO] });
    const { respostas } = await conversar(["desmarcar", "não"], portas);
    expect(respostas[1]![0]).toBe("Tudo bem, mantive seu horário.");
    expect(gravados).toHaveLength(0);
  });

  it("prazo de cancelamento vencido: repassa o texto da regra", async () => {
    const { portas } = portasFalsas({ agendamentos: [MARCADO] });
    portas.cancelar = async () => {
      throw new Error("Cancelamentos só com 2 horas de antecedência. Fale com a equipe.");
    };
    const { respostas } = await conversar(["cancelar", "sim"], portas);
    expect(respostas[1]![0]).toBe(
      "Cancelamentos só com 2 horas de antecedência. Fale com a equipe.",
    );
  });

  it("remarcar: mantém serviço e profissional e oferece novos horários", async () => {
    const { portas, gravados } = portasFalsas({
      agendamentos: [MARCADO],
      livres: { "2026-11-07": LIVRES_SABADO },
    });
    const { respostas } = await conversar(["preciso remarcar", "1", "sim"], portas);
    expect(respostas[0]![0]).toMatch(/Vamos remarcar \*Corte\*/);
    expect(respostas[0]![1]).toContain("Tenho estes horários");
    expect(respostas[1]![0]).toMatch(
      /Confira a remarcação:\n\n\*Serviço:\* Corte\n\*Profissional:\* Zé\n\*Quando:\* Sábado, 07\/11, às 09:00\n\nPosso remarcar\?/,
    );
    expect(respostas[2]![0]).toMatch(/^Pronto, remarquei/);
    expect(gravados[0]).toMatchObject({
      tipo: "remarcar",
      dados: { agendamentoId: "a-1", profissionalId: "p-ze" },
    });
  });

  it("vários horários: pergunta qual", async () => {
    const outro = {
      ...MARCADO,
      id: "a-2",
      inicio: iso("2026-11-10", "09:00"),
      servicoNome: "Barba",
    };
    const { portas } = portasFalsas({ agendamentos: [MARCADO, outro] });
    const r = await conduzir("quero cancelar", null, portas);
    expect(r?.textos[0]).toContain("Qual horário você quer cancelar?");
    expect(r?.textos[0]).toContain("2. Barba — terça-feira, 10/11, às 09:00");
  });

  it("sem horário marcado: diz a verdade", async () => {
    const { portas } = portasFalsas();
    const r = await conduzir("quero remarcar", null, portas);
    expect(r?.textos[0]).toContain("Não encontrei horário marcado");
    expect(r?.estado).toBeNull();
  });

  it("meus horários lista os próximos", async () => {
    const { portas } = portasFalsas({ agendamentos: [MARCADO] });
    const r = await conduzir("qual é meu horário?", null, portas);
    expect(r?.textos[0]).toContain("• Corte com Zé — sábado, 07/11, às 15:00");
  });

  it("estado com mais de 2 horas é esquecido", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const r = await conduzir("quero marcar", null, portas);
    const velho = {
      ...r!.estado!,
      atualizadoEm: new Date(AGORA.getTime() - 3 * 3600_000).toISOString(),
    };
    const { estadoValido } = await import("./conduzir");
    expect(estadoValido(velho, AGORA)).toBeNull();
  });
});

describe("espalhar", () => {
  it("pega início, meio e fim do dia", () => {
    expect(espalhar([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([1, 4, 7]);
    expect(espalhar([1, 2], 3)).toEqual([1, 2]);
  });
});
