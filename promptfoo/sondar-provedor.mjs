/**
 * Sonda um provedor Chat Completions com o MESMO adaptador que a Flow IA usa em produção
 * e diz, item a item, o que ele suporta. Não imprime chaves nem texto de conversa.
 *
 *   CORTAI_AI_BASE_URL=... CORTAI_AI_MODEL=... CORTAI_AI_API_KEY=... \
 *   CORTAI_AI_PROVIDER=openai_compatible npm run sondar:provedor
 *
 * Faz 3 chamadas pequenas (custam centavos). Código de saída 0 só se tudo que a Flow IA exige passar.
 */
const RAIZ = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const { lerConfigDoProvedor, chamarCompativel } = await import(
  `${RAIZ}/src/lib/brain/gateway-compativel.server.ts`
);

const leitura = lerConfigDoProvedor();
if (!leitura.ok || leitura.config.tipo !== "compativel") {
  console.error(
    `Configuração ausente/inválida: ${leitura.ok ? "defina CORTAI_AI_PROVIDER=openai_compatible" : leitura.motivo}`,
  );
  process.exit(2);
}
const config = leitura.config;
console.log(
  `Provedor: ${config.nome} | modelo: ${config.modelo} | canais: ${config.canais.join(",")}`,
);

const ferramentas = [
  {
    type: "function",
    name: "consultar_disponibilidade",
    description: "Horários livres de um serviço em um dia.",
    parameters: {
      type: "object",
      properties: {
        servicoId: { type: "string" },
        dia: { type: "string", description: "AAAA-MM-DD" },
      },
      required: ["servicoId", "dia"],
      additionalProperties: false,
    },
    strict: false,
  },
];
const resultados = [];
const registrar = (nome, ok, detalhe) => {
  resultados.push({ nome, ok });
  console.log(`${ok ? "✓" : "✗"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};
const marcas = /<\|[^|>]{1,40}\|>|<think>/i;

try {
  // 1) Conversa simples em português.
  let t0 = Date.now();
  const simples = await chamarCompativel(config, {
    instrucoes:
      "Você é a recepção de uma barbearia. Responda em português do Brasil, em uma frase.",
    entrada: [{ role: "user", content: "Oi, tudo bem?" }],
    ferramentas: [],
  });
  const texto1 = simples.itens.find((i) => i.type === "message")?.content?.[0]?.text ?? "";
  registrar("Responde texto simples", texto1.length > 0, `${Date.now() - t0} ms`);
  registrar("Sem marcas internas/raciocínio no texto", !marcas.test(texto1));
  registrar(
    "Informa uso de tokens",
    simples.uso.total !== undefined || simples.uso.entrada !== undefined,
    JSON.stringify(simples.uso),
  );

  // 2) Chamada de ferramenta com argumentos estruturados.
  t0 = Date.now();
  const pedido = [
    {
      role: "user",
      content:
        "Quais horários livres tem para o serviço srv-corte no dia 2026-10-12? Use a ferramenta.",
    },
  ];
  const passo1 = await chamarCompativel(config, {
    instrucoes: "Você consulta a agenda SOMENTE pelas ferramentas. Nunca invente horários.",
    entrada: pedido,
    ferramentas,
  });
  const chamada = passo1.itens.find((i) => i.type === "function_call");
  let args = null;
  try {
    args = chamada ? JSON.parse(chamada.arguments) : null;
  } catch {
    args = null;
  }
  registrar(
    "Pede a ferramenta certa",
    chamada?.name === "consultar_disponibilidade",
    `${Date.now() - t0} ms`,
  );
  registrar("Argumentos são JSON válido", args !== null);
  registrar(
    "Argumentos corretos (servicoId e dia)",
    args?.servicoId === "srv-corte" && args?.dia === "2026-10-12",
    JSON.stringify(args),
  );
  registrar("Devolve um call_id", Boolean(chamada?.call_id));

  // 3) Segundo passo: resultado da ferramenta volta e vira resposta fiel.
  if (chamada) {
    const passo2 = await chamarCompativel(config, {
      instrucoes:
        "Você consulta a agenda SOMENTE pelas ferramentas. Nunca invente horários. Responda em português, texto puro.",
      entrada: [
        ...pedido,
        ...passo1.itens,
        {
          type: "function_call_output",
          call_id: chamada.call_id,
          output: JSON.stringify({
            ok: true,
            resultado: { horarios: ["10:00", "10:30", "14:00"] },
          }),
        },
      ],
      ferramentas,
    });
    const texto2 = passo2.itens.find((i) => i.type === "message")?.content?.[0]?.text ?? "";
    registrar(
      "Usa o resultado da ferramenta na resposta",
      /10:00/.test(texto2) && /14:00/.test(texto2),
      `${texto2.length} caracteres`,
    );
    registrar(
      "Não inventa horários fora do resultado",
      !(texto2.match(/\b\d{1,2}:\d{2}\b/g) ?? []).some(
        (h) => !["10:00", "10:30", "14:00"].includes(h),
      ),
    );
    registrar("Sem marcas internas no 2º passo", !marcas.test(texto2));
  } else {
    registrar("Fluxo de 2 passos com ferramenta", false, "sem chamada de ferramenta no passo 1");
  }
} catch (erro) {
  registrar(
    "Chamada ao provedor",
    false,
    `HTTP ${erro?.status ?? "?"} (${erro?.message ?? "erro"})`,
  );
}

const falhas = resultados.filter((r) => !r.ok).length;
console.log(
  falhas
    ? `\n${falhas} verificação(ões) falharam: NÃO usar este provedor/modelo na Flow IA até resolver.`
    : "\nTudo que a Flow IA exige passou neste provedor/modelo.",
);
process.exit(falhas ? 1 : 0);
