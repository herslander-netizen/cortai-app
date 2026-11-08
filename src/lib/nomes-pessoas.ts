/**
 * Identificação de pessoas no Flow.
 *
 * Nome exibido serve para conversar; NÃO serve como chave de cadastro. Antes de agir sobre
 * homônimos, use o ID do registro e um identificador adicional validado no negócio.
 * Cadastro novo sem ID conhecido deve pedir nome + sobrenome (ou intervenção humana
 * quando a pessoa possuir legalmente nome único).
 */
const PARTES_DE_LIGACAO = new Set(["de", "da", "do", "das", "dos", "e"]);
const PALAVRA_DE_NOME = /^[\p{L}][\p{L}\p{M}'’\-]*$/u;

export function normalizarNomePessoa(nome: string): string {
  return nome.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Não rejeita nomes registrados previamente; valida apenas nova identificação sem ID confirmado. */
export function nomeESobrenome(nome: string): string | null {
  const limpo = normalizarNomePessoa(nome);
  if (limpo.length < 3 || limpo.length > 80) return null;
  const partes = limpo.split(" ");
  if (partes.some((parte) => !PALAVRA_DE_NOME.test(parte))) return null;
  const substantivas = partes.filter((parte) => !PARTES_DE_LIGACAO.has(parte.toLocaleLowerCase("pt-BR")));
  return substantivas.length >= 2 ? limpo : null;
}

/**
 * Um número pode ser compartilhado pela família. O telefone identifica a conversa,
 * não prova qual das fichas está falando. Falhar fechado sem selecionar uma ao acaso.
 */
export function clienteUnicoDoTelefone<T>(clientes: readonly T[]): T | null {
  if (clientes.length > 1) {
    throw new Error(
      "Há mais de um cliente cadastrado neste telefone. Para evitar confusão, confirme nome e sobrenome com a equipe antes de consultar ou alterar um agendamento.",
    );
  }
  return clientes[0] ?? null;
}
