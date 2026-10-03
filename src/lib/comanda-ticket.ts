/** Regras puras da comanda em ticket: um único layout para qualquer negócio e forma de pagamento. */

export type EstadoDoTicket = "pago" | "pendente" | "cancelado";

export type ItemDoTicket = { quantidade: number; descricao: string; totalCentavos: number };

export type DadosDoTicket = {
  id: string;
  codigo: string;
  negocio: { nome: string | null; logoUrl: string | null };
  data: string; // dd/mm/aaaa no fuso do negócio
  horario: string; // HH:MM no fuso do negócio
  cliente: { nome: string; telefone: string | null };
  servicos: ItemDoTicket[];
  produtos: ItemDoTicket[];
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
  forma: string | null;
  estado: EstadoDoTicket;
  pixChave: string | null;
};

const ROTULOS_FORMA: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  credito_cartao: "Cartão de crédito",
  debito: "Cartão de débito",
  transferencia: "Transferência",
  credito: "Plano do cliente",
  plano: "Plano do cliente",
  fiado: "Fiado",
};

export function rotuloDaForma(forma: string | null | undefined): string {
  if (!forma) return "A definir";
  return ROTULOS_FORMA[forma] ?? forma.charAt(0).toUpperCase() + forma.slice(1);
}

export const ROTULO_DO_ESTADO: Record<EstadoDoTicket, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

/** Estado do ticket separado da identificação: vem da comanda e do pagamento, nunca do código. */
export function estadoDoTicket(
  statusComanda: string,
  pagamento: { status: string; estornado_em: string | null } | null,
): EstadoDoTicket {
  if (statusComanda === "cancelada" || statusComanda === "cancelado") return "cancelado";
  if (pagamento?.estornado_em || pagamento?.status === "estornado") return "cancelado";
  if (statusComanda === "paga") return "pago";
  return "pendente";
}

/** Dígitos do código (sem # e hífens), usados no código de barras. */
export function digitosDoCodigo(codigo: string): string {
  return codigo.replace(/\D/g, "");
}

/** Código como aparece embaixo das barras: "01102026 0930 2000". */
export function codigoLegivel(codigo: string): string {
  return codigo.replace(/^#/, "").split("-").join(" ");
}

/** Termo digitado parece um código/data de comanda? Devolve o prefixo pesquisável. */
export function prefixoDeCodigo(termo: string): string | null {
  const t = termo.trim().replace(/^#/, "");
  const data = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (data) return `${data[1]}${data[2]}${data[3]}`;
  if (/^\d{4,8}(-\d{0,4}){0,2}$/.test(t) || /^\d{8}\s?\d{0,4}\s?\d{0,8}$/.test(t)) {
    const d = t.replace(/\D/g, "");
    if (d.length <= 8) return d;
    if (d.length <= 12) return `${d.slice(0, 8)}-${d.slice(8)}`;
    return `${d.slice(0, 8)}-${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return null;
}

// Interleaved 2 of 5 (ITF): n = estreita, w = larga. Só identifica a comanda; não é pagamento.
const ITF: Record<string, string> = {
  "0": "nnwwn",
  "1": "wnnnw",
  "2": "nwnnw",
  "3": "wwnnn",
  "4": "nnwnw",
  "5": "wnwnn",
  "6": "nwwnn",
  "7": "nnnww",
  "8": "wnnwn",
  "9": "nwnwn",
};

export type Barra = { barra: boolean; larga: boolean };

export function barrasDoCodigo(codigo: string): Barra[] {
  let d = digitosDoCodigo(codigo);
  if (d.length % 2) d = `0${d}`;
  const out: Barra[] = [];
  const add = (padrao: string, inicioBarra = true) =>
    [...padrao].forEach((c, i) =>
      out.push({ barra: inicioBarra ? i % 2 === 0 : i % 2 === 1, larga: c === "w" }),
    );
  add("nnnn");
  for (let i = 0; i < d.length; i += 2) {
    const a = ITF[d[i]!]!;
    const b = ITF[d[i + 1]!]!;
    for (let k = 0; k < 5; k++) {
      out.push({ barra: true, larga: a[k] === "w" });
      out.push({ barra: false, larga: b[k] === "w" });
    }
  }
  add("wnn");
  return out;
}

/** Telefone para exibir: +55 79 99178-7208. */
export function telefoneDoTicket(tel: string | null | undefined): string | null {
  if (!tel || tel === "avulso") return null;
  const d = tel.replace(/\D/g, "");
  const n = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (n.length < 10) return tel;
  const ddd = n.slice(0, 2);
  const resto = n.slice(2);
  const meio = resto.length - 4;
  return `+55 ${ddd} ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}
