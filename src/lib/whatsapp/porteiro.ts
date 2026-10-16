/**
 * Porteiro do WhatsApp automático ao cliente — regra única e pura (análise de 11/10/2026).
 *
 * Mensagem que o número do negócio manda sem a pessoa ter escrito, para um número que
 * ela não confirmou, é o que leva a denúncia e banimento (sobretudo no Evolution). Então:
 * - telefone vindo do link, da fila pública ou do app só recebe depois de confirmado
 *   (a pessoa escreveu para o negócio ou mandou o código);
 * - SAIR e "número errado" param tudo, inclusive os avisos essenciais;
 * - número que o WhatsApp recusou não recebe de novo;
 * - mensagens de relacionamento seguem exigindo consentimento.
 * Fichas criadas pela equipe (balcão, manual...) já contam com o número dado em pessoa.
 */

/** Origens em que qualquer pessoa digita o telefone, sem prova de que é dela. */
export const ORIGENS_SEM_PROVA = new Set(["link_publico", "fila_publica", "app"]);

export type ClienteParaEnvio = {
  telefone?: string | null;
  origem?: string | null;
  opt_in_whatsapp?: boolean | null;
  sem_whatsapp_em?: string | null;
  /** Ausente (coluna ainda não existe no banco): vale a regra antiga. */
  whatsapp_confirmado_em?: string | null;
  whatsapp_parado_em?: string | null;
  whatsapp_parado_motivo?: string | null;
};

export type Decisao = { pode: true } | { pode: false; motivo: string };

export function podeMandarWhatsapp(
  cliente: ClienteParaEnvio | null,
  opcoes: { relacionamento?: boolean } = {},
): Decisao {
  if (!cliente) return { pode: false, motivo: "Cliente não encontrado." };
  const digitos = String(cliente.telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return { pode: false, motivo: "Cliente sem WhatsApp válido." };
  if (cliente.sem_whatsapp_em) return { pode: false, motivo: "Telefone do cliente sem WhatsApp." };
  if (cliente.whatsapp_parado_em)
    return {
      pode: false,
      motivo:
        cliente.whatsapp_parado_motivo === "numero_errado"
          ? "A pessoa avisou que o número é errado."
          : "O cliente pediu para não receber mensagens (SAIR).",
    };
  const colunaExiste = "whatsapp_confirmado_em" in cliente;
  if (
    colunaExiste &&
    !cliente.whatsapp_confirmado_em &&
    ORIGENS_SEM_PROVA.has(String(cliente.origem ?? ""))
  )
    return { pode: false, motivo: "Telefone não confirmado pelo cliente." };
  if (opcoes.relacionamento && cliente.opt_in_whatsapp !== true)
    return { pode: false, motivo: "Cliente sem consentimento para lembretes." };
  return { pode: true };
}

const SEM_ACENTO = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "SAIR" e equivalentes: para todas as mensagens automáticas. */
export function pedeParaSair(texto: string): boolean {
  return [
    "sair",
    "parar",
    "cortai sair",
    "cortai_sair",
    "descadastrar",
    "nao quero mais receber",
  ].includes(SEM_ACENTO(texto));
}

/** "VOLTAR": volta a receber. */
export function pedeParaVoltar(texto: string): boolean {
  return ["voltar", "cortai voltar"].includes(SEM_ACENTO(texto));
}

/** Quem recebeu por engano: "número errado", "não sou eu", "engano"... */
export function avisaNumeroErrado(texto: string): boolean {
  const t = SEM_ACENTO(texto);
  if (t.length > 60) return false;
  return /\b(numero errado|nao sou (eu|essa pessoa|esse cliente)|engano|nao conheco|nao marquei|nao agendei)\b/.test(
    t,
  );
}
