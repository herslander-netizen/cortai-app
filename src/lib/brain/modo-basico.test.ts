import { describe, expect, it } from "vitest";
import { modoBasicoLigado, planejarModoBasico } from "./modo-basico";

type Item = Record<string, unknown>;

const SERVICOS = [
  { id: "s-corte", nome: "Corte", preco_centavos: 5000, duracao_min: 30 },
  { id: "s-barba", nome: "Barba", preco_centavos: 3000, duracao_min: 20 },
];
const EQUIPE = [
  { id: "p-ana", nome: "Ana Souza" },
  { id: "p-bia", nome: "Bia Lima" },
];
const INSTRUCOES = "hoje = 2026-10-12 (segunda). fuso America/Sao_Paulo.";
// 15:00 em São Paulo (UTC-3) = 18:00Z
const LIVRES = [
  { profissionalId: "p-ana", inicio: "2026-10-13T17:00:00.000Z" },
  { profissionalId: "p-ana", inicio: "2026-10-13T18:00:00.000Z" },
];

type Mundo = { clientes: { id: string; nome: string; telefoneFinal?: string }[] };

/** Faz o papel do cérebro: executa as chamadas do planejador contra um mundo falso. */
function rodar(
  mensagens: { role: "user" | "assistant"; text: string }[],
  mundo: Mundo,
  opcoes: { papel?: string; ferramentas?: string[]; profissionalId?: string } = {},
) {
  const ferramentas = (
    opcoes.ferramentas ?? [
      "listar_servicos",
      "listar_profissionais",
      "buscar_cliente_por_nome",
      "consultar_disponibilidade",
      "criar_agendamento",
      "consultar_horarios_funcionamento",
    ]
  ).map((name) => ({ name }));
  const entrada: Item[] = mensagens.map((m) => ({
    type: "message",
    role: m.role,
    content: m.role === "user" ? m.text : [{ type: "output_text", text: m.text }],
  }));
  const chamadas: { name: string; args: Record<string, unknown> }[] = [];
  for (let passo = 0; passo < 8; passo += 1) {
    const saida = planejarModoBasico({
      instrucoes: INSTRUCOES,
      entrada,
      ferramentas,
      papel: opcoes.papel ?? "dono",
      profissionalId: opcoes.profissionalId ?? null,
    });
    const fns = saida.filter((i) => i["type"] === "function_call");
    if (!fns.length) {
      const msg = saida[0] as { content: { text: string }[] };
      return { texto: msg.content[0]!.text, chamadas };
    }
    for (const f of fns) {
      const args = JSON.parse(String(f["arguments"])) as Record<string, unknown>;
      const name = String(f["name"]);
      chamadas.push({ name, args });
      entrada.push(f);
      let resultado: unknown;
      if (name === "listar_servicos") resultado = SERVICOS;
      else if (name === "listar_profissionais") resultado = EQUIPE;
      else if (name === "buscar_cliente_por_nome") {
        const n = String(args["nome"]).toLowerCase();
        const achados = mundo.clientes.filter((c) => c.nome.toLowerCase().includes(n));
        resultado = { encontrados: achados.length, clientes: achados };
      } else if (name === "consultar_disponibilidade") resultado = { livres: LIVRES };
      else if (name === "criar_agendamento")
        entrada.push({
          type: "function_call_output",
          call_id: f["call_id"],
          output: JSON.stringify({
            status: "aguardando_confirmacao",
            resumo: "Corte com Leandro.",
          }),
        });
      if (name !== "criar_agendamento")
        entrada.push({
          type: "function_call_output",
          call_id: f["call_id"],
          output: JSON.stringify({ ok: true, resultado }),
        });
    }
  }
  throw new Error("planejador não terminou");
}

const UM: Mundo = { clientes: [{ id: "c-1", nome: "Leandro Silva" }] };

describe("modo básico — agendar", () => {
  it("agenda pelo catálogo: serviço, equipe, cliente e horário vêm do backend", () => {
    const r = rodar(
      [{ role: "user", text: "agendar Leandro Silva amanhã às 15h corte com Ana" }],
      UM,
    );
    const criar = r.chamadas.find((c) => c.name === "criar_agendamento");
    expect(criar?.args).toMatchObject({
      clienteId: "c-1",
      servicoId: "s-corte",
      profissionalId: "p-ana",
      inicio: "2026-10-13T18:00:00.000Z",
    });
    expect(r.texto).toContain("Posso confirmar?");
  });

  it("aceita 'marque' e nunca inventa horário fora da lista livre", () => {
    const r = rodar(
      [{ role: "user", text: "marque o Leandro Silva amanhã às 9h corte com Ana" }],
      UM,
    );
    expect(r.chamadas.some((c) => c.name === "criar_agendamento")).toBe(false);
    expect(r.texto).toContain("Esse horário não está livre");
    expect(r.texto).toContain("14:00");
  });

  it("pergunta o cliente quando falta", () => {
    const r = rodar([{ role: "user", text: "agendar amanhã às 15h corte com Ana" }], UM);
    expect(r.texto).toBe("Para qual cliente?");
    expect(r.chamadas.some((c) => c.name === "criar_agendamento")).toBe(false);
  });

  it("pergunta o serviço quando não reconhece nenhum", () => {
    const r = rodar([{ role: "user", text: "agendar Leandro Silva amanhã às 15h com Ana" }], UM);
    expect(r.texto).toContain("Qual serviço");
  });

  it("continua o pedido a partir da resposta curta", () => {
    const r = rodar(
      [
        { role: "user", text: "agendar amanhã às 15h corte com Ana" },
        { role: "assistant", text: "Para qual cliente?" },
        { role: "user", text: "Leandro Silva" },
      ],
      UM,
    );
    expect(r.chamadas.find((c) => c.name === "criar_agendamento")?.args["clienteId"]).toBe("c-1");
  });

  it("homônimos: lista e não agenda sozinho", () => {
    const r = rodar([{ role: "user", text: "agendar Leandro amanhã às 15h corte com Ana" }], {
      clientes: [
        { id: "c-1", nome: "Leandro Silva", telefoneFinal: "1111" },
        { id: "c-2", nome: "Leandro Souza", telefoneFinal: "2222" },
      ],
    });
    expect(r.texto).toContain("Encontrei mais de um");
    expect(r.chamadas.some((c) => c.name === "criar_agendamento")).toBe(false);
  });

  it("cliente inexistente: avisa e não cria", () => {
    const r = rodar([{ role: "user", text: "agendar Zé Ninguém amanhã às 15h corte com Ana" }], {
      clientes: [],
    });
    expect(r.texto).toContain("Não encontrei");
    expect(r.chamadas.some((c) => c.name === "criar_agendamento")).toBe(false);
  });

  it("sem permissão de agendar, não tenta", () => {
    const r = rodar([{ role: "user", text: "agendar Leandro Silva amanhã às 15h corte" }], UM, {
      ferramentas: ["listar_servicos"],
    });
    expect(r.texto).toContain("permissão");
    expect(r.chamadas).toHaveLength(0);
  });

  it("profissional agenda para si mesmo", () => {
    const r = rodar([{ role: "user", text: "agendar Leandro Silva amanhã às 15h corte" }], UM, {
      papel: "profissional",
      profissionalId: "p-ana",
    });
    expect(r.chamadas.find((c) => c.name === "criar_agendamento")?.args["profissionalId"]).toBe(
      "p-ana",
    );
  });
});

describe("modo básico — consultas e ajuda", () => {
  it("lista serviços com preço", () => {
    const r = rodar([{ role: "user", text: "quais serviços vocês têm?" }], UM);
    expect(r.texto).toContain("Corte");
    expect(r.texto).toMatch(/50,00/);
  });

  it("frase solta cai na ajuda, sem chamar nada", () => {
    const r = rodar([{ role: "user", text: "me conta uma piada" }], UM);
    expect(r.texto).toContain("modo básico");
    expect(r.chamadas).toHaveLength(0);
  });
});

describe("modoBasicoLigado", () => {
  it("liga por padrão e desliga por interruptor", () => {
    expect(modoBasicoLigado({})).toBe(true);
    expect(modoBasicoLigado({ CORTAI_MODO_BASICO: "false" })).toBe(false);
    expect(modoBasicoLigado({ CORTAI_MODO_BASICO: "off" })).toBe(false);
  });
});
