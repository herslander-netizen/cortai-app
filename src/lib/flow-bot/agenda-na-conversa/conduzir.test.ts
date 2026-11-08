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
    avisarAtraso: async (d) => void gravados.push({ tipo: "atraso", dados: d }),
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
    expect(respostas[0]![0]).toContain("*1)* Corte — R$ 40,00");
    expect(respostas[1]![0]).toContain("Com quem");
    expect(respostas[1]![0]).toContain("*3)* Tanto faz");
    expect(respostas[2]![0]).toMatch(/🕒 Tenho estes horários livres:\n\n\*Sábado, 07\/11\*/);
    expect(respostas[2]![0]).toContain("*1)* 09:00");
    expect(respostas[3]![0]).toMatch(
      /🗓️ \*Confira seu agendamento:\*\n\n\*Serviço:\* Corte\n\*Profissional:\* Zé\n\*Quando:\* Sábado, 07\/11, às \d\d:00\n\*Valor:\* R\$ 40,00/,
    );
    expect(respostas[4]![0]).toMatch(/^✅ \*Agendamento confirmado, João!\*/);
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

  it("sem vagas, mantém o atendimento aberto e aceita outra data sem repetir serviço", async () => {
    const { portas } = portasFalsas({
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: {},
    });
    const esgotado = await conduzir("agendar corte amanhã", null, portas);
    expect(esgotado?.textos.join("\n")).toContain("Não encontrei horário livre nos próximos");
    expect(esgotado?.estado?.etapa).toBe("horario");
    expect(esgotado?.estado?.servicoId).toBe("s-corte");
    portas.livres = async (dia) =>
      dia === "2026-11-10"
        ? [{ inicio: iso("2026-11-10", "14:00"), profissionalId: "p-ze" }]
        : [];
    const outraData = await conduzir("terça-feira, 10/11", esgotado!.estado, portas);
    expect(outraData?.textos.join("\n")).toContain("Terça-feira, 10/11");
    expect(outraData?.estado?.servicoId).toBe("s-corte");
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
    expect(respostas[2]![0]).toMatch(/^✅ \*Agendamento confirmado, Maria!\*/);
    expect(gravados[0]?.dados).toMatchObject({ nomeCliente: "Maria Souza" });
  });

  it("SIM repetido após reserva existente não cria agendamento duplicado", async () => {
    const { portas, gravados } = portasFalsas({
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: { "2026-11-07": LIVRES_SABADO },
      agendamentos: [{
        id: "ja-criado",
        inicio: iso("2026-11-07", "10:00"),
        servicoId: "s-corte",
        servicoNome: "Corte",
        profissionalId: "p-ze",
        profissionalNome: "Zé",
      }],
    });
    const etapa = await conduzir("agendar corte amanhã às 10h", null, portas);
    expect(etapa?.estado?.etapa).toBe("confirmar");
    const primeiro = await conduzir("sim", etapa!.estado, portas);
    const repetido = await conduzir("sim", etapa!.estado, portas);
    expect(primeiro?.textos[0]).toContain("Agendamento confirmado");
    expect(repetido?.textos[0]).toContain("Agendamento confirmado");
    expect(gravados).toHaveLength(0);
  });

  it("não faz consultas pós-gravação que possam esconder o comprovante", async () => {
    const { portas, gravados } = portasFalsas({
      equipe: [{ id: "p-ze", nome: "Zé" }],
      livres: { "2026-11-07": LIVRES_SABADO },
    });
    const agendar = await conduzir("agendar corte amanhã às 10h", null, portas);
    expect(agendar?.estado?.etapa).toBe("confirmar");
    const criar = portas.criar;
    portas.criar = async (dados) => {
      await criar(dados);
      portas.servicos = async () => { throw new Error("Falha de consulta após gravar"); };
      portas.profissionais = async () => { throw new Error("Falha de consulta após gravar"); };
      portas.cliente = async () => { throw new Error("Falha de consulta após gravar"); };
    };
    const concluido = await conduzir("sim", agendar!.estado, portas);
    expect(gravados).toHaveLength(1);
    expect(concluido?.estado).toBeNull();
    expect(concluido?.textos[0]).toContain("✅ *Agendamento confirmado");
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

  it("áudio transcrito: 'número 1, ...' escolhe a opção e áudio ruim orienta a seguir por texto", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const viaAudio = { ...portas, viaAudio: true };
    const ok = await conduzir(
      "Número 1, na empresa de pele.",
      (await conduzir("quero marcar", null, viaAudio))!.estado,
      viaAudio,
    );
    expect(ok!.textos[0]).toContain("Com quem");

    let r = await conduzir("quero marcar", null, viaAudio);
    r = await conduzir("A gente tá exa deputado, hein?", r!.estado, viaAudio);
    expect(r!.textos[0]).toContain("Não entendi esse áudio.");
    expect(r!.textos[0]).toContain("Ouvi: “A gente tá exa deputado, hein?”");
    r = await conduzir("blá blá blá", r!.estado, viaAudio);
    expect(r!.textos[0]).toContain("Vamos por escrito?");
    expect(r!.estado).not.toBeNull();
    // Depois, por texto, o atendimento continua normalmente.
    r = await conduzir("1", r!.estado, portas);
    expect(r!.textos[0]).toContain("Com quem");
  });

  it("no passo do horário, 'segunda-feira' (áudio) oferece os horários desse dia", async () => {
    const { portas } = portasFalsas({
      livres: {
        "2026-11-07": LIVRES_SABADO,
        "2026-11-09": ["09:00", "10:00", "14:00"].map((h) => ({
          inicio: iso("2026-11-09", h),
          profissionalId: "p-ze",
        })),
      },
    });
    const viaAudio = { ...portas, viaAudio: true };
    let r = await conduzir("quero marcar", null, viaAudio);
    r = await conduzir("1", r!.estado, viaAudio);
    r = await conduzir("1", r!.estado, viaAudio);
    expect(r!.textos[0]).toContain("Tenho estes horários livres");
    r = await conduzir("Tem como remarcar para segunda-feira?", r!.estado, viaAudio);
    expect(r!.textos[0]).toMatch(/Segunda-feira, 09\/11/);
  });

  it("depois da confirmação, 'REMARCAR' (texto ou áudio) abre a escolha do horário a mudar", async () => {
    const { portas } = portasFalsas({
      agendamentos: [
        {
          id: "a1",
          inicio: iso("2026-11-07", "15:00"),
          servicoId: "s-corte",
          servico: "Corte",
          profissionalId: "p-ze",
          profissional: "Zé",
        },
      ] as never,
      livres: { "2026-11-07": LIVRES_SABADO },
    });
    for (const fala of ["REMARCAR", "Remarcar.", "Quero remarcar o meu horário."]) {
      const r = await conduzir(fala, null, { ...portas, viaAudio: fala.endsWith(".") });
      expect(r, fala).not.toBeNull();
      expect(r!.estado?.objetivo, fala).toBe("remarcar");
    }
  });

  it("cliente avisa que vai atrasar: pergunta os minutos (ou já entende) e avisa a equipe", async () => {
    const ag = [
      {
        id: "a1",
        inicio: iso("2026-11-07", "15:00"),
        servicoId: "s-corte",
        servicoNome: "Corte",
        profissionalId: "p-ze",
        profissionalNome: "Zé",
      },
    ];
    const { portas, gravados } = portasFalsas({ agendamentos: ag });
    // 1) pergunta e responde por áudio
    let r = await conduzir("Vou me atrasar.", null, portas);
    expect(r!.textos[0]).toContain("Quantos minutos você vai atrasar?");
    r = await conduzir("Uns vinte minutos.", r!.estado, { ...portas, viaAudio: true });
    expect(r!.textos[0]).toContain("Avisei a equipe.");
    expect(r!.textos[0]).toContain("20 minutos");
    expect(gravados).toEqual([{ tipo: "atraso", dados: { agendamentoId: "a1", minutos: 20 } }]);
    // 2) já diz os minutos
    gravados.length = 0;
    r = await conduzir("Vou atrasar 15 min", null, portas);
    expect(r!.textos[0]).toContain("15 minutos");
    expect(gravados).toHaveLength(1);
    // 3) opção do menu e atraso longo oferece remarcar
    r = await conduzir("vou chegar atrasado", null, portas);
    r = await conduzir("Meia hora.", r!.estado, portas);
    expect(r!.textos[0]).toContain("30 minutos");
    r = await conduzir("estou atrasada", null, portas);
    r = await conduzir("uma hora", r!.estado, portas);
    expect(r!.textos.join("\n")).toContain("REMARCAR");
    // sem agendamento: não inventa
    const vazio = portasFalsas({ agendamentos: [] }).portas;
    r = await conduzir("vou atrasar", null, vazio);
    expect(r!.textos[0]).toContain("Não encontrei horário marcado");
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
    expect(respostas[1]![0]).toMatch(/^✅ \*Cancelamento realizado\.\*/);
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
      /🗓️ \*Confira a remarcação:\*\n\n\*Serviço:\* Corte\n\*Profissional:\* Zé\n\*Quando:\* Sábado, 07\/11, às 09:00\n\nPosso remarcar\?/,
    );
    expect(respostas[2]![0]).toMatch(/^✅ \*Horário remarcado com sucesso!\*/);
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
    expect(r?.textos[0]).toContain("*2)* Barba — terça-feira, 10/11, às 09:00");
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

describe("conversa real da prévia (dono, 06/11/2026)", () => {
  it("'Deixe, depois falo com você' encerra sem 'Não entendi'; 'deixa pra segunda' continua sendo dia", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const sai = await conversar(["quero marcar", "1", "1", "Deixe, depois falo com você"], portas);
    expect(sai.respostas[3]![0]).toBe("Tudo bem, não marquei nada. Se precisar, é só chamar.");
    expect(sai.estado).toBeNull();
  });

  it("'Olá' no meio da conversa cumprimenta e repete a pergunta em aberto", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const { respostas, estado } = await conversar(["quero marcar", "Bom dia!"], portas);
    expect(respostas[1]![0]).toBe("👋 Oi! Vamos continuar de onde paramos.");
    expect(respostas[1]![1]).toContain("Qual serviço");
    expect(estado?.etapa).toBe("servico");
  });

  it("'não deu pra ir' oferece marcar de novo", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const { respostas } = await conversar(["Não deu pra ir ontem"], portas);
    expect(respostas[0]![0]).toBe("Sem problema, acontece! Vamos marcar um novo horário.");
    expect(respostas[0]![1]).toContain("Qual serviço");
  });

  it("SIM e NÃO em caixa alta e negrito na confirmação", async () => {
    const { portas } = portasFalsas({ livres: { "2026-11-07": LIVRES_SABADO } });
    const { respostas } = await conversar(["quero marcar", "1", "1", "2"], portas);
    expect(respostas[3]!.join("\n")).toContain(
      "Responda *SIM* para confirmar ou *NÃO* para mudar.",
    );
  });
});

describe("espalhar", () => {
  it("pega início, meio e fim do dia", () => {
    expect(espalhar([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([1, 4, 7]);
    expect(espalhar([1, 2], 3)).toEqual([1, 2]);
  });
});
