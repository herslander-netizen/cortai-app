import type { Destino } from "@/lib/guarda";

const DESTINOS_DE_RETORNO: readonly Destino[] = ["/admin", "/barbeiro", "/app", "/comecar", "/escolher"];

/**
 * Mantém o destino do onboarding no link de confirmação sem aceitar URLs
 * externas. O Supabase só recebe caminhos internos do próprio Flow.
 */
export function urlDeRetornoDeAutenticacao(origin: string, proximo?: string): string {
  const retorno = new URL("/entrar/retorno", origin);
  if (proximo && destinoInterno(proximo)) retorno.searchParams.set("proximo", proximo);
  return retorno.toString();
}

export function destinoInterno(valor: string): boolean {
  if (!valor.startsWith("/") || valor.startsWith("//")) return false;
  const caminho = valor.split("?")[0] ?? "";
  return DESTINOS_DE_RETORNO.some(
    (destino) => caminho === destino || caminho.startsWith(`${destino}/`),
  );
}

type ErroAuth = {
  code?: string | undefined;
  status?: number | undefined;
  message?: string | undefined;
};

/** Mensagens seguras para o navegador; detalhes técnicos permanecem no servidor/SDK. */
export function mensagemDeErroDeAuth(erro: ErroAuth | null, operacao: "entrar" | "criar") {
  const codigo = (erro?.code ?? "").toLowerCase();
  const mensagem = (erro?.message ?? "").toLowerCase();
  if (erro?.status === 429 || codigo.includes("rate_limit") || codigo.includes("too_many")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  }
  if (codigo === "weak_password" || mensagem.includes("password") && mensagem.includes("leaked")) {
    return "Essa senha é fácil de adivinhar ou já apareceu em vazamentos. Escolha outra.";
  }
  if (codigo === "email_address_invalid" || codigo === "invalid_email") {
    return "Confira o e-mail digitado.";
  }
  if (codigo === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar. Se precisar, peça um novo link.";
  }
  if (operacao === "entrar" && (codigo === "invalid_credentials" || codigo === "user_not_found")) {
    return "E-mail ou senha incorretos.";
  }
  if (mensagem.includes("network") || mensagem.includes("fetch") || mensagem.includes("timeout")) {
    return "Não foi possível conectar agora. Confira sua internet e tente novamente.";
  }
  return operacao === "criar"
    ? "Não foi possível criar a conta agora. Tente novamente em instantes."
    : "Não foi possível entrar agora. Tente novamente em instantes.";
}

export function mensagemDeErroDeNegocio(erro: unknown): string {
  const mensagem = erro instanceof Error ? erro.message : "";
  const mensagensSeguras = [
    "Informe um CPF ou CNPJ válido.",
    "Informe um telefone com DDD.",
    "Sua conta já está ligada a um negócio.",
    "Não foi possível verificar seu acesso agora.",
    "O cadastro está temporariamente indisponível. Tente novamente em instantes.",
    "Não foi possível criar seu negócio agora.",
    "Não foi possível liberar o acesso ao seu negócio. Tente novamente.",
    "O negócio foi criado, mas não conseguimos preparar o teste grátis. Tente novamente.",
    "O negócio foi criado, mas não conseguimos preparar sua página. Tente novamente.",
    "O negócio foi criado, mas não conseguimos finalizar seu acesso. Tente novamente.",
    "Seu negócio já existia e foi finalizado. Confira os dados antes de continuar.",
  ];
  if (mensagensSeguras.includes(mensagem)) return mensagem;
  if (mensagem.includes("Invalid Supabase server key") || mensagem.includes("Missing Supabase environment variable")) {
    return "O cadastro está temporariamente indisponível. Tente novamente em instantes.";
  }
  return "Não foi possível criar seu negócio agora. Tente novamente.";
}
