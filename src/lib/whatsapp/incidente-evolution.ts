/**
 * Regras puras do monitoramento do serviço Evolution (sem banco, sem rede).
 *
 * Um único timeout nunca prova queda: a primeira falha vira "instável" (sem alerta); a segunda
 * falha seguida, dentro da janela, confirma a queda e gera um alerta por ocorrência. Erro de
 * autenticação é determinístico e confirma de imediato. Quando o serviço volta, a ocorrência é
 * encerrada e só então se avisa a recuperação (se a queda chegou a ser confirmada).
 */

export type ClasseDaFalha =
  "timeout" | "autenticacao" | "servico_indisponivel" | "instancia_inexistente" | "desconhecido";

export const ROTULO_DA_FALHA: Record<ClasseDaFalha, string> = {
  timeout: "Sem resposta do serviço (tempo esgotado)",
  autenticacao: "Serviço recusou a credencial (erro de autenticação)",
  servico_indisponivel: "Serviço indisponível",
  instancia_inexistente: "Conexão não encontrada no serviço",
  desconhecido: "Falha não identificada",
};

/** Traduz o erro da chamada ao serviço em uma classe, sem expor o texto bruto. */
export function classificarFalhaDoServico(erro: unknown): ClasseDaFalha {
  const texto = (erro instanceof Error ? erro.message : String(erro ?? "")).toLowerCase();
  if (/tempo esgotado|sem resposta em|timeout|timed out|abort/.test(texto)) return "timeout";
  if (/respondeu (401|403)\b/.test(texto)) return "autenticacao";
  if (/respondeu 404\b/.test(texto)) return "instancia_inexistente";
  if (
    /respondeu 5\d\d\b|econnrefused|enotfound|econnreset|fetch failed|network|eai_again/.test(texto)
  )
    return "servico_indisponivel";
  return "desconhecido";
}

export type EventoDoServico =
  "evolution_instavel" | "evolution_indisponivel" | "evolution_recuperado";

/** Falha isolada mais antiga que isto deixa de contar como "seguida" da próxima. */
export const JANELA_DE_CONFIRMACAO_MS = 45 * 60_000;

export type DecisaoDoIncidente =
  | { tipo: "nada" }
  | { tipo: "registrar_instavel" }
  | { tipo: "confirmar_queda" }
  | { tipo: "recuperar"; alertar: boolean };

export function decidirIncidente(input: {
  resultado: "ok" | "falha";
  classe?: ClasseDaFalha;
  ultimoEvento: EventoDoServico | null;
  ultimoEventoEm: string | null;
  agora: Date;
}): DecisaoDoIncidente {
  const { resultado, ultimoEvento } = input;
  if (resultado === "ok") {
    if (ultimoEvento === "evolution_indisponivel") return { tipo: "recuperar", alertar: true };
    if (ultimoEvento === "evolution_instavel") return { tipo: "recuperar", alertar: false };
    return { tipo: "nada" };
  }
  if (input.classe === "autenticacao")
    return ultimoEvento === "evolution_indisponivel"
      ? { tipo: "nada" }
      : { tipo: "confirmar_queda" };
  if (ultimoEvento === "evolution_indisponivel") return { tipo: "nada" };
  if (ultimoEvento === "evolution_instavel" && input.ultimoEventoEm) {
    const idade = input.agora.getTime() - new Date(input.ultimoEventoEm).getTime();
    return idade <= JANELA_DE_CONFIRMACAO_MS
      ? { tipo: "confirmar_queda" }
      : { tipo: "registrar_instavel" };
  }
  return { tipo: "registrar_instavel" };
}
