import { describe, expect, it } from "vitest";

import { conduzir, type EstadoDaAgenda, type Livre, type Portas } from "./conduzir";

/**
 * Simulação do atendimento por ÁUDIO (dono, 07/11/2026: "análises de fluxos de áudio e simulações"): falas como o
 * Whisper escreve (maiúscula, ponto final, números por extenso, "segunda-feira", "pode marcar") em cada etapa do
 * agendamento. Cada caso diz o que a fala precisa produzir; falha = o cliente receberia "não entendi" sem motivo.
 */
const AGORA = new Date("2026-11-06T13:00:00Z"); // sexta, 10:00 em São Paulo
const FUSO = "America/Sao_Paulo";
const iso = (dia: string, h: string) => new Date(`${dia}T${h}:00-03:00`).toISOString();
const horas = (dia: string) =>
  ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"].map((h): Livre => ({
    inicio: iso(dia, h),
    profissionalId: "p-ze",
  }));

function portas(viaAudio = true) {
  const gravados: { tipo: string; dados: unknown }[] = [];
  const p: Portas = {
    viaAudio,
    fuso: FUSO,
    agora: AGORA,
    servicos: async () => [
      { id: "s-corte", nome: "Corte de cabelo", duracao_min: 30, preco_centavos: 4000 },
      { id: "s-barba", nome: "Barba", duracao_min: 20, preco_centavos: 3000 },
      { id: "s-pele", nome: "Limpeza de pele", duracao_min: 60, preco_centavos: 12000 },
    ],
    profissionais: async () => [
      { id: "p-ze", nome: "Zé" },
      { id: "p-ana", nome: "Ana" },
    ],
    livres: async (dia) =>
      ["2026-11-07", "2026-11-09", "2026-11-10"].includes(dia) ? horas(dia) : [],
    cliente: async () => null,
    agendamentos: async () => [],
    criar: async (d) => void gravados.push({ tipo: "criar", dados: d }),
    remarcar: async (d) => void gravados.push({ tipo: "remarcar", dados: d }),
    cancelar: async (id) => void gravados.push({ tipo: "cancelar", dados: id }),
    avisarAtraso: async (d) => void gravados.push({ tipo: "atraso", dados: d }),
  };
  return { p, gravados };
}

async function ate(falas: string[]) {
  const { p, gravados } = portas();
  let estado: EstadoDaAgenda | null = null;
  let ultimo: Awaited<ReturnType<typeof conduzir>> = null;
  for (const f of falas) {
    ultimo = await conduzir(f, estado, p);
    estado = ultimo?.estado ?? null;
  }
  return { p, estado, ultimo, gravados };
}

const textoDe = (r: { textos: string[] } | null | undefined) => (r?.textos ?? []).join("\n");

type Caso = [
  fala: string,
  ok: (r: Awaited<ReturnType<typeof conduzir>>, e: EstadoDaAgenda | null) => boolean,
];

const avancou = (etapa: string) => (_: unknown, e: EstadoDaAgenda | null) => e?.etapa === etapa;

const PASSOS: Record<string, { antes: string[]; casos: Caso[] }> = {
  serviço: {
    antes: ["quero marcar"],
    casos: [
      ["Número um.", (_, e) => e?.servicoId === "s-corte"],
      ["Opção 1", (_, e) => e?.servicoId === "s-corte"],
      ["O primeiro.", (_, e) => e?.servicoId === "s-corte"],
      ["Quero a primeira opção.", (_, e) => e?.servicoId === "s-corte"],
      ["Dois.", (_, e) => e?.servicoId === "s-barba"],
      ["Eu quero o número 3.", (_, e) => e?.servicoId === "s-pele"],
      ["Quero o corte.", (_, e) => e?.servicoId === "s-corte"],
      ["Um corte de cabelo, por favor.", (_, e) => e?.servicoId === "s-corte"],
      ["Quero fazer a barba.", (_, e) => e?.servicoId === "s-barba"],
      ["Limpeza de pele.", (_, e) => e?.servicoId === "s-pele"],
      ["Pode ser a limpeza de pele mesmo.", (_, e) => e?.servicoId === "s-pele"],
      ["Pode ser o três.", (_, e) => e?.servicoId === "s-pele"],
      ["A segunda.", (_, e) => e?.servicoId === "s-barba"],
      ["O último.", (_, e) => e?.servicoId === "s-pele"],
    ],
  },
  profissional: {
    antes: ["quero marcar", "1"],
    casos: [
      ["Tanto faz.", (_, e) => e?.profissionalDefinido === true && e.profissionalId === null],
      ["Qualquer um.", (_, e) => e?.profissionalDefinido === true],
      ["Não tenho preferência.", (_, e) => e?.profissionalDefinido === true],
      ["Pode ser qualquer pessoa.", (_, e) => e?.profissionalDefinido === true],
      ["Número um.", (_, e) => e?.profissionalId === "p-ze"],
      ["Com a Ana.", (_, e) => e?.profissionalId === "p-ana"],
      ["Pode ser o Zé.", (_, e) => e?.profissionalId === "p-ze"],
      ["A segunda opção.", (_, e) => e?.profissionalId === "p-ana"],
    ],
  },
  horário: {
    antes: ["quero marcar", "1", "tanto faz"],
    casos: [
      ["O primeiro.", (_, e) => e?.etapa === "nome"],
      ["Número dois.", (_, e) => e?.etapa === "nome"],
      ["Às nove horas.", (_, e) => e?.etapa === "nome"],
      ["Nove horas da manhã.", (_, e) => e?.etapa === "nome"],
      ["Pode ser às dez.", (_, e) => e?.etapa === "nome"],
      ["Às três da tarde.", (_, e) => e?.etapa === "nome"],
      ["Quinze horas.", (_, e) => e?.etapa === "nome"],
      ["Quatorze horas.", (_, e) => e?.etapa === "nome"],
      ["Às 14h.", (_, e) => e?.etapa === "nome"],
      ["Segunda-feira de manhã.", (r) => /Segunda-feira, 09\/11/.test(textoDe(r))],
      ["Para segunda-feira.", (r) => /Segunda-feira, 09\/11/.test(textoDe(r))],
      ["Tem como na terça-feira?", (r) => /Terça-feira, 10\/11/.test(textoDe(r))],
      ["Depois de amanhã.", (r) => /09\/11|10\/11/.test(textoDe(r)) || /Tenho/.test(textoDe(r))],
      ["Amanhã à tarde.", (r) => /Tenho estes/.test(textoDe(r))],
    ],
  },
  nome: {
    antes: ["quero marcar", "1", "tanto faz", "1"],
    casos: [
      ["Carla.", (r, e) => e?.etapa === "nome" && textoDe(r).includes("nome e sobrenome")],
      ["Carla Souza.", (_, e) => e?.nome === "Carla Souza"],
      ["Meu nome é Carla.", (r, e) => e?.etapa === "nome" && textoDe(r).includes("nome e sobrenome")],
      ["Me chamo Carla Souza.", (_, e) => e?.nome === "Carla Souza"],
      ["É a Carla.", (r, e) => e?.etapa === "nome" && textoDe(r).includes("nome e sobrenome")],
      ["Aqui é o João Pedro.", (_, e) => e?.nome === "João Pedro"],
    ],
  },
  confirmação: {
    antes: ["quero marcar", "1", "tanto faz", "1", "Carla Souza"],
    casos: [
      ["Sim.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Sim, pode marcar.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Pode ser.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Isso mesmo.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Confirmo.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Claro!", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Fechado.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Pode confirmar.", (r, e) => e === null && /Agendamento confirmado/.test(textoDe(r))],
      ["Não.", (r) => /não marquei/i.test(textoDe(r))],
      ["Não, quero mudar o horário.", (r) => /não marquei|Tenho estes|outro dia/i.test(textoDe(r))],
    ],
  },
};

describe("simulação: atendimento por áudio, etapa a etapa", () => {
  for (const [nome, { antes, casos }] of Object.entries(PASSOS)) {
    describe(nome, () => {
      for (const [fala, ok] of casos) {
        it(`"${fala}"`, async () => {
          const { p, estado } = await ate(antes);
          const r = await conduzir(fala, estado, p);
          expect(
            ok(r, r?.estado ?? null),
            JSON.stringify({ textos: r?.textos, estado: r?.estado }),
          ).toBe(true);
        });
      }
    });
  }
});

describe("simulação: respostas de erro de áudio (curtas, organizadas, sem paredão)", () => {
  const etapas: [string, string[]][] = [
    ["servico", ["quero marcar"]],
    ["profissional", ["quero marcar", "1"]],
    ["horario", ["quero marcar", "1", "tanto faz"]],
    ["nome", ["quero marcar", "1", "tanto faz", "1"]],
    ["confirmar", ["quero marcar", "1", "tanto faz", "1", "Carla Souza"]],
  ];
  for (const [etapa, antes] of etapas) {
    it(`etapa ${etapa}: 1º erro com eco e dica; 2º convida a seguir por escrito; texto retoma`, async () => {
      const { p, estado } = await ate(antes);
      const r1 = await conduzir("Blá blá bla, o gato comeu.", estado, p);
      const m1 = textoDe(r1);
      expect(r1!.textos).toHaveLength(1);
      expect(m1.split("\n").length).toBeLessThanOrEqual(5);
      expect(Math.max(...m1.split("\n").map((l) => l.length))).toBeLessThanOrEqual(75);
      expect(m1).toContain("Não entendi esse áudio.");
      expect(m1).toContain("Ouvi: “Blá blá bla, o gato comeu.”");
      const r2 = await conduzir("Hum, eh, não sei.", r1!.estado, p);
      const m2 = textoDe(r2);
      expect(r2!.textos).toHaveLength(1);
      expect(m2.split("\n").length).toBeLessThanOrEqual(5);
      expect(Math.max(...m2.split("\n").map((l) => l.length))).toBeLessThanOrEqual(75);
      expect(m2).toContain("Vamos por escrito?");
      expect(r2!.estado).not.toBeNull();
    });
  }
});
