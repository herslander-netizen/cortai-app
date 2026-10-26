type ContatoBruto = {
  name?: readonly string[];
  tel?: readonly string[];
};

type NavegadorComContatos = {
  contacts?: {
    select: (
      properties: string[],
      options: { multiple: boolean },
    ) => Promise<ContatoBruto[]>;
  };
};

export type ContatoSelecionado = {
  nome: string;
  telefone: string;
};

/**
 * Abre o seletor de contatos quando o navegador o suporta (HTTPS, gesto do usuário).
 * Solicita somente nome e telefone; não lê nem envia a agenda inteira.
 */
export async function selecionarContatoDoAparelho(
  navegador: NavegadorComContatos | undefined =
    typeof navigator === "undefined" ? undefined : (navigator as NavegadorComContatos),
): Promise<ContatoSelecionado | null> {
  const api = navegador?.contacts;
  if (!api || typeof api.select !== "function") {
    throw new Error("CONTATO_PICKER_INDISPONIVEL");
  }

  const selecionados = await api.select(["name", "tel"], { multiple: false });
  const escolhido = selecionados[0];
  if (!escolhido) return null;

  const primeiroValor = (valores?: readonly string[]) =>
    valores?.find((valor) => valor.trim().length > 0)?.trim() ?? "";
  const contato = {
    nome: primeiroValor(escolhido.name),
    telefone: primeiroValor(escolhido.tel),
  };

  return contato.nome || contato.telefone ? contato : null;
}
