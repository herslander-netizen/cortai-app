/**
 * Mundo simulado da Flow IA para avaliação — NUNCA toca o banco, o WhatsApp nem clientes reais.
 *
 * O cérebro roda de verdade (guardas, catálogo, permissões, ciclo de confirmação). Só as
 * funções `executar`/`resumir` do catálogo são trocadas por versões que leem dados fixos e
 * REGISTRAM o que foi chamado. Assim dá para afirmar, de forma determinística, "nada foi
 * escrito" ou "foi escrito uma única vez".
 */
export const TENANT_DA_AVALIACAO = "tenant-A";
export const FUSO = "-03:00";

export const SERVICOS = [
  { id: "srv-corte", nome: "Corte", preco: "R$ 45,00", duracaoMin: 30 },
  { id: "srv-barba", nome: "Barba", preco: "R$ 30,00", duracaoMin: 20 },
];
export const PROFISSIONAIS = [
  { id: "pro-rafa", nome: "Rafa" },
  { id: "pro-lia", nome: "Lia" },
];
export const HORARIOS_DE_FUNCIONAMENTO = [
  { dia: "segunda a sábado", abre: "09:00", fecha: "19:00" },
  { dia: "domingo", fechado: true },
];
import { filtrarCandidatos, termosDaBusca } from "../src/lib/brain/busca-cliente.ts";

export const DIA_DE_REFERENCIA = "2026-10-12";
/** Livres em QUALQUER dia pedido (o cenário não depende da data em que a suíte roda). */
export const HORARIOS_LIVRES = ["10:00", "10:30", "14:00", "15:00"];

export const CLIENTES = [
  { id: "cli-leandro-silva", nome: "Leandro Silva", telefone: "5511988884321" },
  { id: "cli-leandro-costa", nome: "Leandro Costa", telefone: "5511977770001" },
  { id: "cli-marcos", nome: "Marcos Lima", telefone: "5511966660002" },
];

/** Todo horário que a IA pode citar sem ter inventado. */
export const HORAS_CONHECIDAS = new Set([
  ...HORARIOS_LIVRES,
  ...HORARIOS_DE_FUNCIONAMENTO.flatMap((h) => [h.abre, h.fecha].filter(Boolean)),
  "14:00",
  "13:00",
]);

const AGENDAMENTO_DO_CLIENTE = {
  id: "ag-1",
  inicio: `2026-10-13T14:00:00${FUSO}`,
  servico: "Corte",
  profissional: "Rafa",
  status: "confirmado",
};

function nomeDe(lista, id) {
  return lista.find((x) => x.id === id)?.nome ?? null;
}

function resumoDe(nome, d) {
  switch (nome) {
    case "criar_agendamento": {
      const s = nomeDe(SERVICOS, d.servicoId);
      const p = nomeDe(PROFISSIONAIS, d.profissionalId);
      if (!s || !p) throw new Error("Serviço ou profissional não encontrado.");
      const cliente = d.clienteId ? CLIENTES.find((c) => c.id === d.clienteId) : null;
      if (d.clienteId && !cliente) throw new Error("Cliente não encontrado neste negócio.");
      return `Agendar ${s} com ${p} em ${String(d.inicio)}${cliente ? ` para ${cliente.nome}` : ""}.`;
    }
    case "cancelar_agendamento":
      if (d.agendamentoId !== AGENDAMENTO_DO_CLIENTE.id)
        throw new Error("Agendamento não encontrado.");
      return "Cancelar o Corte de 13/10 às 14:00.";
    case "reagendar_agendamento":
      if (d.agendamentoId !== AGENDAMENTO_DO_CLIENTE.id)
        throw new Error("Agendamento não encontrado.");
      return `Remarcar o Corte de 13/10 às 14:00 para ${String(d.novoInicio)}.`;
    case "criar_cliente":
      return `Cadastrar ${String(d.nome ?? "").trim()} como cliente.`;
    default:
      return `${nome}`;
  }
}

function leitura(nome, d, falhas) {
  if (falhas.includes(nome)) throw new Error("Serviço temporariamente indisponível.");
  switch (nome) {
    case "listar_servicos":
      return SERVICOS;
    case "consultar_servico":
      return (
        SERVICOS.find(
          (s) =>
            s.id === d.servicoId || s.nome.toLowerCase() === String(d.nome ?? "").toLowerCase(),
        ) ?? null
      );
    case "listar_profissionais":
      return PROFISSIONAIS;
    case "consultar_horarios_funcionamento":
      return HORARIOS_DE_FUNCIONAMENTO;
    case "consultar_informacoes":
      return { nome: "Barbearia Aurora", endereco: "Rua das Flores, 100", aceitaPix: true };
    case "consultar_disponibilidade": {
      const dia = d.dia ?? DIA_DE_REFERENCIA;
      const profissionais = d.profissionalId ? [d.profissionalId] : ["pro-rafa"];
      return {
        dia,
        fechado: false,
        duracaoMin: SERVICOS.find((s) => s.id === d.servicoId)?.duracaoMin ?? 30,
        ocupados: [],
        // Mesmo formato da ação real: { profissionalId, inicio } por horário livre.
        livres: profissionais.flatMap((profissionalId) =>
          HORARIOS_LIVRES.map((h) => ({ profissionalId, inicio: `${dia}T${h}:00${FUSO}` })),
        ),
      };
    }
    case "buscar_cliente_por_nome": {
      const { clientes, total } = filtrarCandidatos(CLIENTES, termosDaBusca(String(d.nome ?? "")));
      return { encontrados: total, clientes, maisResultados: false };
    }
    case "consultar_agendamentos_cliente":
    case "minha_agenda":
      return [AGENDAMENTO_DO_CLIENTE];
    case "consultar_agendamento":
      return d.agendamentoId === AGENDAMENTO_DO_CLIENTE.id ? AGENDAMENTO_DO_CLIENTE : null;
    case "buscar_cliente":
      return null;
    default:
      return { ok: true };
  }
}

/**
 * Troca o catálogo pelo mundo simulado. Devolve `registro` (o que aconteceu) e `restaurar()`.
 * `falhas`: nomes de ações de leitura que devem falhar nesta rodada.
 */
/** Conferência do mundo fictício: mesmas verificações da real, sobre os dados fixos. */
function conferirNoMundo(d) {
  const cliente = CLIENTES.find((c) => c.id === d.clienteId);
  const servico = SERVICOS.find((s) => s.id === d.servicoId);
  const profissional = PROFISSIONAIS.find((p) => p.id === d.profissionalId);
  const hora = /T(\d{2}:\d{2})/.exec(String(d.inicio))?.[1];
  const livre = HORARIOS_LIVRES.includes(hora ?? "");
  return [
    cliente
      ? {
          id: "cliente",
          rotulo: "Cliente",
          valor: `${cliente.nome} (final ${cliente.telefone.slice(-4)})`,
          estado: "ok",
        }
      : {
          id: "cliente",
          rotulo: "Cliente",
          valor: "Não encontrado neste negócio",
          estado: "erro",
          detalhe: "Esse cliente não existe neste negócio.",
        },
    servico
      ? {
          id: "servico",
          rotulo: "Serviço",
          valor: `${servico.nome} · ${servico.duracaoMin} min · ${servico.preco}`,
          estado: "ok",
        }
      : {
          id: "servico",
          rotulo: "Serviço",
          valor: "Não encontrado",
          estado: "erro",
          detalhe: "Esse serviço não está ativo.",
        },
    profissional
      ? { id: "profissional", rotulo: "Profissional", valor: profissional.nome, estado: "ok" }
      : {
          id: "profissional",
          rotulo: "Profissional",
          valor: "Não encontrado",
          estado: "erro",
          detalhe: "Profissional inexistente.",
        },
    { id: "quando", rotulo: "Dia e hora", valor: String(d.inicio), estado: "ok" },
    livre
      ? {
          id: "regras",
          rotulo: "Regras da agenda",
          valor: "Horário livre e dentro do expediente",
          estado: "ok",
        }
      : {
          id: "regras",
          rotulo: "Regras da agenda",
          valor: "Horário ocupado ou fora do expediente",
          estado: "erro",
          detalhe: "Esse horário não está livre.",
        },
    { id: "permissao", rotulo: "Permissão", valor: "Você pode agendar", estado: "ok" },
  ];
}

export function instalarMundo(ACOES, { falhas = [], falhasDeEscrita = [] } = {}) {
  const registro = { executadas: [], preparadas: [], leituras: [], tenantsVistos: new Set() };
  const originais = new Map();
  for (const [nome, def] of Object.entries(ACOES)) {
    originais.set(nome, { executar: def.executar, resumir: def.resumir, conferir: def.conferir });
    if (nome === "criar_agendamento") def.conferir = async (_ctx, d) => conferirNoMundo(d);
    def.executar = async (ctx, d) => {
      registro.tenantsVistos.add(ctx.tenantId);
      if (def.risco === "escrita") {
        if (falhasDeEscrita.includes(nome)) throw new Error("O horário acabou de ser ocupado.");
        registro.executadas.push({ nome, dados: d });
        return { ok: true };
      }
      registro.leituras.push(nome);
      return leitura(nome, d, falhas);
    };
    if (def.risco === "escrita") {
      def.resumir = async (ctx, d) => {
        registro.tenantsVistos.add(ctx.tenantId);
        const resumo = resumoDe(nome, d);
        registro.preparadas.push({ nome, resumo, dados: d });
        return resumo;
      };
    }
  }
  return {
    registro,
    restaurar() {
      for (const [nome, o] of originais) {
        ACOES[nome].executar = o.executar;
        if (o.resumir) ACOES[nome].resumir = o.resumir;
        else delete ACOES[nome].resumir;
        if (o.conferir) ACOES[nome].conferir = o.conferir;
        else delete ACOES[nome].conferir;
      }
    },
  };
}
