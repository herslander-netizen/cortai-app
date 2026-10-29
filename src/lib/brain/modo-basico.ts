/**
 * MODO BÁSICO da Flow IA — o painel funciona sem IA, sem chave e sem custo.
 *
 * Faz o papel do "modelo": lê a frase da equipe, escolhe AÇÕES DO CATÁLOGO e responde com os
 * dados que elas devolveram. Tudo o que o cérebro garante continua valendo, porque o ciclo
 * (`pensarCortai`) é o mesmo: permissões, isolamento por negócio, conferência visível, regras
 * oficiais da agenda, confirmação por toque e idempotência. Aqui só existe o entendimento da
 * frase, por regras — e, na dúvida, ele PERGUNTA em vez de adivinhar.
 *
 * Entende: agendar; buscar cliente por nome; serviços e preços; equipe; horário de
 * funcionamento; horários livres; resumo do dia. Conversa livre exige a IA.
 */
import {
  ehPedidoDeAgendar,
  formatarHora,
  intencaoDe,
  lerClienteEscolhido,
  lerDia,
  lerHora,
  lerNomeSolto,
  lerPessoas,
  lerServico,
  normalizar,
  type Hora,
  type Intencao,
  type ServicoDoCatalogo,
} from "./modo-basico-nlu";

type Item = Record<string, unknown>;

export type EntradaDoModoBasico = {
  instrucoes: string;
  entrada: Item[];
  /** Nomes das ações oferecidas a esta pessoa (permissões já aplicadas). */
  ferramentas: { name: string }[];
  papel?: string | null | undefined;
  /** Profissional ligado ao usuário (quando o papel é profissional). */
  profissionalId?: string | null | undefined;
};

/** Rede de segurança do painel: sem IA, cai no modo básico. `CORTAI_MODO_BASICO=false` desliga. */
export function modoBasicoLigado(env: Record<string, string | undefined> = process.env) {
  const v = (env["CORTAI_MODO_BASICO"] ?? "").trim().toLowerCase();
  return !(v === "false" || v === "0" || v === "off" || v === "nao");
}

export const AVISO_DO_MODO_BASICO =
  "Modo básico: a IA está sem créditos ou indisponível, então só entendo comandos simples.";

const AJUDA =
  'Estou no modo básico. Entendo: "agendar Leandro Silva amanhã às 15h corte", "quais clientes chamam Leandro", "quais serviços", "horários livres amanhã", "horário de funcionamento" e "resumo de hoje".';

/** Perguntas que EU faço: servem para reconhecer a resposta curta que vem depois. */
const PERGUNTAS = {
  cliente: "Para qual cliente?",
  servico: "Qual serviço",
  profissional: "Com qual profissional",
  dia: "Para qual dia",
  hora: "Que horas",
  homonimo: "Encontrei mais de um",
  ocupado: "Esse horário não está livre",
} as const;

const texto = (t: string): Item[] => [
  { type: "message", role: "assistant", content: [{ type: "output_text", text: t }] },
];
let contador = 0;
const chamada = (name: string, args: Record<string, unknown>): Item => ({
  type: "function_call",
  name,
  arguments: JSON.stringify(args),
  call_id: `basico_${name}_${(contador += 1)}`,
});

const reais = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function horaLocal(iso: string, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
const rotuloDoDia = (dia: string) => {
  const [, m, d] = dia.split("-");
  const sem = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][
    new Date(`${dia}T12:00:00Z`).getUTCDay()
  ];
  return `${sem} ${d}/${m}`;
};
const lista = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

/* ------------------------------ Leitura da entrada ----------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- saída das ações: formato livre, lido com cuidado
type Saida = Record<string, any>;

type Mensagem = { role: "user" | "assistant"; texto: string };

function conteudoEmTexto(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c))
    return c
      .map((p) => (p && typeof p === "object" ? String((p as Item)["text"] ?? "") : ""))
      .join("");
  return "";
}

function separar(entrada: Item[]) {
  let ultimoUsuario = -1;
  entrada.forEach((i, idx) => {
    if (i["role"] === "user") ultimoUsuario = idx;
  });
  const mensagens: Mensagem[] = entrada
    .slice(0, Math.max(ultimoUsuario, 0) + 1)
    .filter((i) => i["role"] === "user" || i["role"] === "assistant")
    .map((i) => ({
      role: i["role"] as "user" | "assistant",
      texto: conteudoEmTexto(i["content"]),
    }));

  const chamadas = new Map<string, { nome: string; args: Record<string, unknown> }>();
  const saidas = new Map<string, { args: Record<string, unknown>; saida: Saida }>();
  for (const i of entrada.slice(ultimoUsuario + 1)) {
    if (i["type"] === "function_call") {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(String(i["arguments"] ?? "{}"));
      } catch {
        args = {};
      }
      chamadas.set(String(i["call_id"]), { nome: String(i["name"]), args });
    } else if (i["type"] === "function_call_output") {
      const c = chamadas.get(String(i["call_id"]));
      if (!c) continue;
      let saida: Saida = {};
      try {
        saida = JSON.parse(String(i["output"] ?? "{}"));
      } catch {
        saida = {};
      }
      saidas.set(c.nome, { args: c.args, saida });
    }
  }
  return { mensagens, saidas };
}

/* ------------------------------ Campos do comando ------------------------------ */

type Campos = {
  clienteNome: string | null;
  clienteId: string | null;
  comNome: string | null;
  servicoTexto: string;
  dia: string | null;
  hora: Hora | null;
};

const comecaCom = (texto: string, prefixo: string) => texto.trim().startsWith(prefixo);

/**
 * Junta os campos do pedido ao longo da conversa: o pedido original e as respostas curtas às
 * perguntas que o próprio modo básico fez ("Para qual cliente?").
 */
function reunirCampos(
  mensagens: Mensagem[],
  hoje: string,
  palavrasDeServico: string[],
): { campos: Campos; continuacao: boolean } | null {
  const ultima = mensagens.at(-1);
  if (!ultima) return null;
  let inicio = -1;
  if (ehPedidoDeAgendar(ultima.texto)) inicio = mensagens.length - 1;
  else {
    const anterior = mensagens.at(-2);
    const respondeAPergunta =
      anterior?.role === "assistant" &&
      Object.values(PERGUNTAS).some((p) => comecaCom(anterior.texto, p));
    if (!respondeAPergunta) return null;
    for (let i = mensagens.length - 2; i >= Math.max(0, mensagens.length - 10); i -= 1) {
      if (mensagens[i]!.role === "user" && ehPedidoDeAgendar(mensagens[i]!.texto)) {
        inicio = i;
        break;
      }
    }
    if (inicio < 0) return null;
  }

  const campos: Campos = {
    clienteNome: null,
    clienteId: null,
    comNome: null,
    servicoTexto: "",
    dia: null,
    hora: null,
  };
  for (let i = inicio; i < mensagens.length; i += 1) {
    const m = mensagens[i]!;
    if (m.role !== "user") continue;
    const pergunta = i > inicio ? mensagens[i - 1] : undefined;
    const t = m.texto;
    const id = lerClienteEscolhido(t);
    if (id) campos.clienteId = id;
    campos.servicoTexto += ` ${t}`;
    campos.hora = lerHora(t) ?? campos.hora;
    campos.dia = lerDia(t, hoje) ?? campos.dia;
    const pessoas = lerPessoas(t, palavrasDeServico);
    if (pessoas.cliente) campos.clienteNome = pessoas.cliente;
    if (pessoas.com) campos.comNome = pessoas.com;
    if (pergunta?.role === "assistant" && !id) {
      if (comecaCom(pergunta.texto, PERGUNTAS.cliente) && !pessoas.cliente)
        campos.clienteNome = lerNomeSolto(t, palavrasDeServico) ?? campos.clienteNome;
      else if (comecaCom(pergunta.texto, PERGUNTAS.profissional) && !pessoas.com)
        campos.comNome = lerNomeSolto(t, palavrasDeServico) ?? campos.comNome;
    }
  }
  return { campos, continuacao: inicio < mensagens.length - 1 };
}

/* ---------------------------------- Planejador --------------------------------- */

export function planejarModoBasico(e: EntradaDoModoBasico): Item[] {
  const { mensagens, saidas } = separar(e.entrada);
  const ultima = mensagens.at(-1)?.texto ?? "";
  const oferecida = (nome: string) => e.ferramentas.some((f) => f.name === nome);
  const hoje =
    /hoje = (\d{4}-\d{2}-\d{2})/.exec(e.instrucoes)?.[1] ?? new Date().toISOString().slice(0, 10);
  const fuso = /fuso ([A-Za-z_]+\/[A-Za-z_]+)/.exec(e.instrucoes)?.[1] ?? "America/Sao_Paulo";

  // Falha de leitura neste turno: diz o motivo real e para.
  for (const [nome, { saida }] of saidas) {
    if (saida["ok"] === false && nome !== "criar_agendamento")
      return texto(`Não consegui consultar agora: ${String(saida["erro"] ?? "erro")}.`);
  }

  const servicosOut = saidas.get("listar_servicos")?.saida["resultado"] as
    { id: string; nome: string; preco_centavos?: number; duracao_min?: number }[] | undefined;
  const equipeOut = saidas.get("listar_profissionais")?.saida["resultado"] as
    { id: string; nome: string }[] | undefined;
  const catalogo: ServicoDoCatalogo[] = servicosOut ?? [];
  const palavrasDeServico = catalogo.map((s) => s.nome);

  const pedido = reunirCampos(mensagens, hoje, palavrasDeServico);
  const intencao: Intencao = pedido ? "agendar" : intencaoDe(ultima);

  if (intencao === "agendar") return planejarAgendamento();
  return planejarConsulta(intencao);

  /* --------------------------------- agendar --------------------------------- */
  function planejarAgendamento(): Item[] {
    if (!oferecida("criar_agendamento"))
      return texto("Você não tem permissão para agendar por aqui. Use a tela da Agenda.");

    // 1) Catálogo e equipe primeiro: o nome do serviço e do profissional vêm do negócio.
    if (!servicosOut || (e.papel === "dono" && !equipeOut)) {
      const lote: Item[] = [];
      if (!servicosOut) lote.push(chamada("listar_servicos", {}));
      if (e.papel === "dono" && !equipeOut) lote.push(chamada("listar_profissionais", {}));
      return lote;
    }
    const { campos } = pedido ?? reunirCampos(mensagens, hoje, palavrasDeServico)!;

    // 2) Serviço
    const servico = lerServico(campos.servicoTexto, catalogo);
    if (!servico)
      return texto(
        `${PERGUNTAS.servico}? Temos: ${lista(catalogo.map((s) => s.nome)) || "nenhum serviço cadastrado"}.`,
      );

    // 3) Profissional (quem tem papel de profissional agenda para si; o backend força)
    let profissionalId: string | null = null;
    let clienteNome = campos.clienteNome;
    if (e.papel === "profissional") profissionalId = e.profissionalId ?? null;
    else {
      const equipe = equipeOut ?? [];
      const alvo = campos.comNome ? normalizar(campos.comNome) : null;
      const porNome = alvo
        ? equipe.filter((p) => normalizar(p.nome).split(" ").includes(alvo.split(" ")[0]!))
        : [];
      // "com Ricardo" e Ricardo não é da equipe: então é o cliente.
      if (alvo && !porNome.length && !clienteNome) clienteNome = campos.comNome;
      if (porNome.length === 1) profissionalId = porNome[0]!.id;
      else if (porNome.length > 1)
        return texto(`${PERGUNTAS.profissional}? ${lista(porNome.map((p) => p.nome))}.`);
      else if (equipe.length === 1) profissionalId = equipe[0]!.id;
      else
        return texto(
          `${PERGUNTAS.profissional}? ${lista(equipe.map((p) => p.nome)) || "Não há profissionais ativos"}.`,
        );
    }

    // 4) Cliente (o nome que "com" trouxe só vira cliente quando não era um profissional)
    if (!clienteNome && campos.comNome && e.papel === "profissional") clienteNome = campos.comNome;
    let clienteId = campos.clienteId;
    if (!clienteId) {
      if (!clienteNome) return texto(PERGUNTAS.cliente);
      if (!oferecida("buscar_cliente_por_nome"))
        return texto("Você não tem permissão para consultar clientes por aqui.");
      const busca = saidas.get("buscar_cliente_por_nome");
      if (!busca) return [chamada("buscar_cliente_por_nome", { nome: clienteNome })];
      const achados = (busca.saida["resultado"]?.clientes ?? []) as {
        id: string;
        nome: string;
        telefoneFinal?: string | null;
      }[];
      if (achados.length === 0)
        return texto(
          `Não encontrei "${clienteNome}" entre os clientes. Confira o nome ou cadastre o cliente na tela de Clientes.`,
        );
      if (achados.length > 1)
        return texto(
          `${PERGUNTAS.homonimo}: ${lista(achados.map((c) => `${c.nome}${c.telefoneFinal ? ` (final ${c.telefoneFinal})` : ""}`))}. Qual deles?`,
        );
      clienteId = achados[0]!.id;
    }

    // 5) Dia e hora
    if (!campos.dia && !campos.hora) return texto(`${PERGUNTAS.dia} e que horas?`);
    if (!campos.dia) return texto(`${PERGUNTAS.dia}?`);
    if (!campos.hora) return texto(`${PERGUNTAS.hora}?`);

    // 6) Disponibilidade REAL
    const disp = saidas.get("consultar_disponibilidade");
    if (!disp)
      return [
        chamada("consultar_disponibilidade", {
          dia: campos.dia,
          servicoId: servico.id,
          profissionalId,
        }),
      ];
    const resultado = disp.saida["resultado"] as {
      fechado?: boolean;
      livres?: { profissionalId: string; inicio: string }[];
    };
    if (resultado?.fechado)
      return texto(`Nesse dia (${rotuloDoDia(campos.dia)}) o negócio está fechado.`);
    const livres = (resultado?.livres ?? []).filter(
      (l) => !profissionalId || l.profissionalId === profissionalId,
    );
    const pedida = formatarHora(campos.hora);
    const escolhido = livres.find((l) => horaLocal(l.inicio, fuso) === pedida);
    if (!escolhido) {
      const proximas = [...new Set(livres.map((l) => horaLocal(l.inicio, fuso)))]
        .filter((h) => h >= pedida)
        .slice(0, 5);
      const outras = proximas.length
        ? proximas
        : [...new Set(livres.map((l) => horaLocal(l.inicio, fuso)))].slice(0, 5);
      return texto(
        outras.length
          ? `${PERGUNTAS.ocupado} (${pedida}, ${rotuloDoDia(campos.dia)}). Tenho: ${lista(outras)}. Qual prefere?`
          : `Não há horários livres em ${rotuloDoDia(campos.dia)}. Quer olhar outro dia?`,
      );
    }

    // 7) Agendar: o cérebro conferir, prepara a confirmação ou executa conforme a política.
    const criado = saidas.get("criar_agendamento");
    if (!criado)
      return [
        chamada("criar_agendamento", {
          clienteId,
          nomeCliente: null,
          servicoId: servico.id,
          profissionalId: escolhido.profissionalId,
          inicio: escolhido.inicio,
        }),
      ];
    if (criado.saida["status"] === "aguardando_confirmacao")
      return texto(`${String(criado.saida["resumo"] ?? "")} Posso confirmar?`);
    if (criado.saida["ok"] === false)
      return texto(
        `Não consegui agendar: ${String(criado.saida["erro"] ?? "erro")}. Nada foi alterado. Quer tentar outro horário?`,
      );
    return texto("Pedido recebido.");
  }

  /* --------------------------------- consultas --------------------------------- */
  function planejarConsulta(i: Intencao): Item[] {
    const pedirUma = (nome: string, args: Record<string, unknown> = {}): Item[] | null =>
      saidas.has(nome) ? null : [chamada(nome, args)];

    if (i === "caixa") {
      if (!oferecida("consultar_caixa_hoje"))
        return texto("Você não tem acesso ao caixa financeiro deste negócio.");
      const pedir = pedirUma("consultar_caixa_hoje");
      if (pedir) return pedir;
      const r = saidas.get("consultar_caixa_hoje")!.saida["resultado"] as {
        dia: string;
        entradasCentavos: number;
        saidasCentavos: number;
        liquidoCentavos: number;
        entradasPorFormaCentavos: {
          pix: number;
          dinheiro: number;
          cartao: number;
          outras: number;
        };
      };
      const forma = r.entradasPorFormaCentavos;
      return texto(
        `Caixa de ${r.dia}: entradas registradas de ${reais(r.entradasCentavos)}, saídas de ${reais(r.saidasCentavos)} e saldo líquido dos movimentos de ${reais(r.liquidoCentavos)}. Entradas por forma: Pix ${reais(forma.pix)}, dinheiro ${reais(forma.dinheiro)}, cartão ${reais(forma.cartao)}${forma.outras ? `, outras formas ${reais(forma.outras)}` : ""}. Esses valores refletem lançamentos do caixa, não lucro contábil.`,
      );
    }
    if (i === "movimento") {
      if (!oferecida("consultar_movimento"))
        return texto("Você não tem acesso aos indicadores de agenda do negócio.");
      const pedir = pedirUma("consultar_movimento");
      if (pedir) return pedir;
      const r = saidas.get("consultar_movimento")!.saida["resultado"] as {
        total: number;
        porStatus: Record<string, number>;
      };
      const partes = Object.entries(r.porStatus ?? {}).map(([s, n]) => `${n} ${s}`);
      return texto(
        `Hoje há ${r.total} agendamento(s)${partes.length ? `: ${partes.join(", ")}` : ""}.`,
      );
    }
    if (i === "servicos") {
      const pedir = pedirUma("listar_servicos");
      if (pedir) return pedir;
      const s = servicosOut ?? [];
      return texto(
        s.length
          ? `Serviços: ${s.map((x) => `${x.nome}${x.preco_centavos !== undefined ? ` (${reais(x.preco_centavos)}${x.duracao_min ? `, ${x.duracao_min} min` : ""})` : ""}`).join("; ")}.`
          : "Não há serviços cadastrados.",
      );
    }
    if (i === "profissionais") {
      const pedir = pedirUma("listar_profissionais");
      if (pedir) return pedir;
      const p = equipeOut ?? [];
      return texto(
        p.length ? `Equipe: ${lista(p.map((x) => x.nome))}.` : "Não há profissionais ativos.",
      );
    }
    if (i === "funcionamento") {
      const pedir = pedirUma("consultar_horarios_funcionamento");
      if (pedir) return pedir;
      const h = (saidas.get("consultar_horarios_funcionamento")!.saida["resultado"] ?? []) as {
        dia_semana: number;
        fechado: boolean;
        abre: string;
        fecha: string;
      }[];
      const nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return texto(
        h.length
          ? `Funcionamento: ${h.map((d) => `${nomes[d.dia_semana]} ${d.fechado ? "fechado" : `${String(d.abre).slice(0, 5)}–${String(d.fecha).slice(0, 5)}`}`).join("; ")}.`
          : "Não há horário de funcionamento cadastrado.",
      );
    }
    if (i === "buscar_cliente") {
      if (!oferecida("buscar_cliente_por_nome"))
        return texto("Você não tem permissão para consultar clientes por aqui.");
      const nome =
        /\b(?:chamam?|chamado|nome|cliente|buscar|procurar|achar|localizar|ver)\s+(?:de\s+|com\s+)?([a-zà-ú ]{2,40})$/i
          .exec(normalizar(ultima))?.[1]
          ?.trim() ?? null;
      if (!nome) return texto("De qual cliente? Diga o nome.");
      const pedir = pedirUma("buscar_cliente_por_nome", { nome });
      if (pedir) return pedir;
      const r = saidas.get("buscar_cliente_por_nome")!.saida["resultado"] as {
        encontrados: number;
        clientes: { nome: string; telefoneFinal?: string | null }[];
      };
      return texto(
        r.encontrados
          ? `Encontrei ${r.encontrados}: ${lista(r.clientes.map((c) => `${c.nome}${c.telefoneFinal ? ` (final ${c.telefoneFinal})` : ""}`))}.`
          : `Nenhum cliente encontrado com "${nome}".`,
      );
    }
    if (i === "disponibilidade") {
      if (!servicosOut || !equipeOut) {
        const lote: Item[] = [];
        if (!servicosOut) lote.push(chamada("listar_servicos", {}));
        if (!equipeOut) lote.push(chamada("listar_profissionais", {}));
        return lote;
      }
      const servico = lerServico(ultima, catalogo) ?? catalogo[0];
      if (!servico) return texto("Não há serviços cadastrados.");
      const dia = lerDia(ultima, hoje) ?? hoje;
      const disp = saidas.get("consultar_disponibilidade");
      if (!disp)
        return [
          chamada("consultar_disponibilidade", {
            dia,
            servicoId: servico.id,
            profissionalId: null,
          }),
        ];
      const r = disp.saida["resultado"] as {
        fechado?: boolean;
        livres?: { profissionalId: string; inicio: string }[];
      };
      if (r.fechado) return texto(`Em ${rotuloDoDia(dia)} o negócio está fechado.`);
      const porProf = new Map<string, string[]>();
      for (const l of r.livres ?? []) {
        const nome =
          (equipeOut ?? []).find((p) => p.id === l.profissionalId)?.nome ?? "Profissional";
        porProf.set(nome, [...(porProf.get(nome) ?? []), horaLocal(l.inicio, fuso)]);
      }
      return texto(
        porProf.size
          ? `Horários livres (${servico.nome}, ${rotuloDoDia(dia)}): ${[...porProf].map(([n, hs]) => `${n}: ${hs.slice(0, 8).join(", ")}${hs.length > 8 ? "…" : ""}`).join("; ")}.`
          : `Não há horários livres em ${rotuloDoDia(dia)}.`,
      );
    }
    return texto(AJUDA);
  }
}
