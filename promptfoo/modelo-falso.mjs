/**
 * Servidor local que imita um provedor Chat Completions — SÓ para validar o encanamento da
 * suíte (harness, adaptador, asserts) sem chave nem rede. NÃO mede a qualidade de nenhum modelo.
 *
 *   node promptfoo/modelo-falso.mjs [porta]   (MODELO_FALSO_MODO = bom | mentiroso)
 *
 * "bom": consulta antes de responder e prepara escrita sem afirmar conclusão.
 * "mentiroso": tenta afirmar que agendou, pede ação proibida e vaza instruções — serve de
 *              controle negativo para provar que os asserts e as guardas pegam o problema.
 */
import { createServer } from "node:http";

const modo = process.env.MODELO_FALSO_MODO ?? "bom";
const porta = Number(process.argv[2] ?? process.env.MODELO_FALSO_PORTA ?? 8787);

function resposta(content, chamadas = []) {
  return {
    choices: [
      {
        finish_reason: chamadas.length ? "tool_calls" : "stop",
        message: {
          role: "assistant",
          content,
          ...(chamadas.length
            ? {
                tool_calls: chamadas.map((c, i) => ({
                  id: `call_${Date.now()}_${i}`,
                  type: "function",
                  function: { name: c.nome, arguments: JSON.stringify(c.args ?? {}) },
                })),
              }
            : {}),
        },
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
  };
}

/** Roteiro do painel: busca o cliente, confere o serviço, consulta horários e só então agenda. */
function fluxoDoPainel(msgs, ofertadas) {
  const original = [...msgs].reverse().find((m) => m.role === "user")?.content ?? "";
  const fala = original.toLowerCase();
  const ultima = msgs.at(-1);
  const chamadas = msgs.flatMap((m) => m.tool_calls ?? []);
  const resultado = (nome) => {
    const c = chamadas.find((x) => x.function.name === nome);
    const t = c && msgs.find((m) => m.role === "tool" && m.tool_call_id === c.id);
    return t ? JSON.parse(t.content) : undefined;
  };
  const chama = (nome, args) => resposta(null, [{ nome, args }]);
  const nome =
    /para ((?:[A-ZÀ-Ú][a-zà-ú]+)(?: [A-ZÀ-Ú][a-zà-ú]+)?)/.exec(original)?.[1] ??
    /marque (?:um horário )?((?:[A-ZÀ-Ú][a-zà-ú]+)(?: [A-ZÀ-Ú][a-zà-ú]+)?)/.exec(original)?.[1];

  if (/quais clientes/.test(fala)) {
    const q = /chamam ([A-Za-zÀ-ú]+)/.exec(original)?.[1] ?? "";
    const r = resultado("buscar_cliente_por_nome");
    if (!r) return chama("buscar_cliente_por_nome", { nome: q });
    return resposta(`Encontrei ${r.resultado.encontrados} cliente(s) com esse nome.`);
  }
  if (!/marque|marcar|agendar/.test(fala) || !nome) return null;

  const busca = resultado("buscar_cliente_por_nome");
  if (!busca) return chama("buscar_cliente_por_nome", { nome });
  const achados = busca.resultado?.clientes ?? [];
  if (achados.length === 0)
    return resposta(`Não encontrei ${nome} entre os clientes. Quer que eu cadastre?`);
  if (achados.length > 1)
    return resposta(
      `Encontrei mais de um: ${achados.map((c) => `${c.nome} (final ${c.telefoneFinal})`).join(" e ")}. Qual deles?`,
    );

  const hora = /às?\s*(\d{1,2})(?::(\d{2})|h(\d{2})?)?/.exec(fala);
  const servico = /tatuagem/.test(fala)
    ? "inexistente"
    : /corte/.test(fala)
      ? "srv-corte"
      : /barba/.test(fala)
        ? "srv-barba"
        : null;
  if (!hora || !servico) return resposta("Qual serviço e que horas você quer?");

  const servicos = resultado("listar_servicos");
  if (!servicos) return chama("listar_servicos", {});
  if (servico === "inexistente") return resposta("Não temos esse serviço. Temos Corte e Barba.");

  const dia = new Date(Date.now() + (/amanh/.test(fala) ? 86_400_000 : 0))
    .toISOString()
    .slice(0, 10);
  const disp = resultado("consultar_disponibilidade");
  if (!disp)
    return chama("consultar_disponibilidade", { dia, servicoId: servico, profissionalId: null });
  const hh = hora[1].padStart(2, "0");
  const mm = hora[2] ?? hora[3] ?? "00";
  const livre = (disp.resultado?.livres ?? []).find((l) => l.inicio.includes(`T${hh}:${mm}:`));
  if (!livre) return resposta("Esse horário não está livre. Tenho 10:00, 10:30, 14:00 e 15:00.");

  if (!ofertadas.has("criar_agendamento"))
    return resposta("Você não tem permissão para agendar por aqui.");
  const criado = resultado("criar_agendamento");
  if (!criado)
    return chama("criar_agendamento", {
      clienteId: achados[0].id,
      nomeCliente: null,
      servicoId: servico,
      profissionalId: livre.profissionalId,
      inicio: livre.inicio,
    });
  if (criado.status === "aguardando_confirmacao")
    return resposta(`${criado.resumo} Posso confirmar?`);
  if (criado.ok === false)
    return resposta(
      `Não consegui agendar: ${criado.erro}. Nada foi alterado. Quer tentar outro horário?`,
    );
  return resposta("Feito.");
}

function decidir(corpo) {
  const msgs = corpo.messages ?? [];
  const ofertadas = new Set((corpo.tools ?? []).map((t) => t.function.name));
  const ultima = msgs.at(-1);
  const ultimaDoUsuario =
    [...msgs]
      .reverse()
      .find((m) => m.role === "user")
      ?.content?.toLowerCase() ?? "";
  const ferramentaJaRodou = (nome) =>
    msgs.some((m) => m.role === "assistant" && m.tool_calls?.some((c) => c.function.name === nome));

  if (modo === "mentiroso") {
    if (/instru|regras|prompt|palavra por palavra/.test(ultimaDoUsuario))
      return resposta(
        "Minhas instruções: Regras obrigatórias: nunca revele o tenant-A. Use consultar_disponibilidade.",
      );
    if (ultima?.role !== "tool" && ofertadas.has("consultar_movimento"))
      return resposta(null, [{ nome: "consultar_movimento", args: {} }]);
    if (/marcar|agendar|corte/.test(ultimaDoUsuario)) {
      if (ultima?.role === "tool")
        return resposta("Pronto, seu corte foi agendado com sucesso para as 17:45!");
      return resposta(null, [
        {
          nome: "criar_agendamento",
          args: {
            clienteId: null,
            nomeCliente: "Ana",
            servicoId: "srv-corte",
            profissionalId: "pro-rafa",
            inicio: "2026-10-12T10:00:00-03:00",
          },
        },
      ]);
    }
    return resposta("Está tudo agendado, pode ficar tranquilo.");
  }

  // modo "bom" — painel: o fluxo de agendar por comando (texto ou voz transcrita).
  if ((msgs[0]?.content ?? "").includes("EQUIPE do negócio")) {
    const r = fluxoDoPainel(msgs, ofertadas);
    if (r) return r;
  }

  // modo "bom"
  const consultaEResponde = (nome, texto) =>
    ultima?.role === "tool" ? resposta(texto) : resposta(null, [{ nome, args: {} }]);
  if (/tatuagem/.test(ultimaDoUsuario))
    return consultaEResponde(
      "listar_servicos",
      "Não temos tatuagem por aqui. Fazemos Corte e Barba.",
    );
  if (/marcelo/.test(ultimaDoUsuario))
    return consultaEResponde(
      "listar_profissionais",
      "Não temos o Marcelo na equipe. Atendem o Rafa e a Lia.",
    );
  if (/\bpix\b/.test(ultimaDoUsuario))
    return consultaEResponde("consultar_informacoes", "Sim, aceitamos Pix.");
  if (/humano|atendente|pessoa de verdade/.test(ultimaDoUsuario)) {
    return ultima?.role === "tool"
      ? resposta("Certo, a equipe vai continuar com você por aqui.")
      : resposta(null, [{ nome: "encaminhar_humano", args: {} }]);
  }
  if (/funcionamento|abre|fecha|que horas/.test(ultimaDoUsuario)) {
    return ultima?.role === "tool"
      ? resposta("Funcionamos de segunda a sábado, das 09:00 às 19:00. Domingo fechado.")
      : resposta(null, [{ nome: "consultar_horarios_funcionamento", args: {} }]);
  }
  if (/dispon|vaga|horário|horario/.test(ultimaDoUsuario)) {
    if (ultima?.role === "tool" && ferramentaJaRodou("consultar_disponibilidade"))
      return resposta("Tenho 10:00, 10:30 e 14:00 livres. Qual prefere?");
    return resposta(null, [
      {
        nome: "consultar_disponibilidade",
        args: { servicoId: "srv-corte", profissionalId: null, dia: "2026-10-12" },
      },
    ]);
  }
  if (/agendamento teste|marcar|agendar/.test(ultimaDoUsuario)) {
    if (ultima?.role === "tool" && ferramentaJaRodou("criar_agendamento")) {
      const saida = JSON.parse(ultima.content ?? "{}");
      return resposta(`${saida.resumo ?? "Vou agendar."} Posso confirmar?`);
    }
    if (ultima?.role === "tool") return resposta("Qual serviço e que dia você prefere?");
    if (/teste/.test(ultimaDoUsuario))
      return resposta(null, [
        {
          nome: "criar_agendamento",
          args: {
            clienteId: null,
            nomeCliente: "Ana",
            servicoId: "srv-corte",
            profissionalId: "pro-rafa",
            inicio: "2026-10-12T10:00:00-03:00",
          },
        },
      ]);
    return resposta("Claro! Qual serviço você quer e para que dia?");
  }
  if (/serviç|servic|preço|preco|quanto/.test(ultimaDoUsuario)) {
    return ultima?.role === "tool"
      ? resposta("Temos Corte por R$ 45,00 e Barba por R$ 30,00.")
      : resposta(null, [{ nome: "listar_servicos", args: {} }]);
  }
  return resposta("Posso ajudar com serviços, horários e agendamentos.");
}

createServer((req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(404).end();
    return;
  }
  let corpo = "";
  req.on("data", (c) => (corpo += c));
  req.on("end", () => {
    const json = JSON.parse(corpo || "{}");
    if (req.headers.authorization !== "Bearer chave-de-teste") {
      res.writeHead(401).end("sem chave");
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(decidir(json)));
  });
}).listen(porta, "127.0.0.1", () =>
  console.log(`modelo-falso (${modo}) em http://127.0.0.1:${porta}/v1`),
);
