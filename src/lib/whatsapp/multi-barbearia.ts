/**
 * Número compartilhado entre barbearias: regras puras, sem IA e sem banco.
 * A decisão final sempre volta ao servidor, que valida o tenant escolhido.
 */
export type OpcaoBarbearia = { id: string; nome: string };

export type ContextoDoNumero = { tenantId: string | null; aguardandoEscolha: boolean } | null;

export type Decisao =
  | { tipo: "usar"; tenantId: string; salvar: boolean; evento?: "selecao" }
  | { tipo: "menu"; texto: string; evento?: "troca" | "invalida" };

const EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

function normalizar(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

/** Pedido de troca por frases simples. */
export function ehPedidoDeTroca(texto: string): boolean {
  const t = normalizar(texto);
  return (
    /\b(trocar|mudar|alterar)( de)? (barbearia|unidade|salao|studio|lugar)\b/.test(t) ||
    /\b(outra|outro) (barbearia|unidade|salao|studio|lugar)\b/.test(t)
  );
}

export function menuDeBarbearias(opcoes: OpcaoBarbearia[], prefixo?: string): string {
  return [
    prefixo ?? "Olá! Com qual lugar você quer falar?",
    ...opcoes.map((o, i) => `${EMOJIS[i] ?? `${i + 1} -`} ${o.nome}`),
    "",
    "Responda com o número.",
  ].join("\n");
}

export function decidirBarbearia(input: {
  texto: string;
  opcoes: OpcaoBarbearia[];
  contexto: ContextoDoNumero;
  /** Barbearia definida por notificação respondida (botão ou citação). */
  porNotificacao?: string | null;
  /** Barbearia citada por slug/código na mensagem. */
  porSlug?: string | null;
}): Decisao {
  const { texto, opcoes, contexto } = input;
  const validos = new Set(opcoes.map((o) => o.id));

  if (ehPedidoDeTroca(texto)) return { tipo: "menu", texto: menuDeBarbearias(opcoes), evento: "troca" };

  if (input.porNotificacao && validos.has(input.porNotificacao)) {
    return { tipo: "usar", tenantId: input.porNotificacao, salvar: true, evento: "selecao" };
  }
  if (contexto?.tenantId && !contexto.aguardandoEscolha && validos.has(contexto.tenantId)) {
    return { tipo: "usar", tenantId: contexto.tenantId, salvar: false };
  }
  const n = texto.trim().match(/^(\d{1,2})$/);
  if (n && opcoes[Number(n[1]) - 1]) {
    return { tipo: "usar", tenantId: opcoes[Number(n[1]) - 1]!.id, salvar: true, evento: "selecao" };
  }
  if (input.porSlug && validos.has(input.porSlug)) {
    return { tipo: "usar", tenantId: input.porSlug, salvar: true, evento: "selecao" };
  }
  if (contexto?.aguardandoEscolha) {
    return {
      tipo: "menu",
      texto: menuDeBarbearias(opcoes, "Não entendi a opção. Com qual lugar você quer falar?"),
      evento: "invalida",
    };
  }
  return { tipo: "menu", texto: menuDeBarbearias(opcoes) };
}
