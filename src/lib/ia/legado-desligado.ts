/**
 * Integração externa ALVO IA desligada (fase 5 do plano da Flow IA, 10/10/2026).
 * As rotas `/api/public/alvo-ia`, `/api/public/ai/*` e `/api/public/cortai/acoes`
 * respondem 410 antes de ler token ou corpo. Nada foi apagado do banco: as tabelas
 * `integracoes_de_ia`, `eventos_de_ia` e `eventos_recebidos_de_ia` continuam lá
 * (vazias na conferência de 10/10/2026). O caminho oficial é o cérebro em `src/lib/brain`.
 */
export function respostaDoLegadoDesligado(): Response {
  return new Response(
    JSON.stringify({
      erro: "Integração externa desligada. A Flow IA agora funciona dentro do próprio Flow.",
    }),
    { status: 410, headers: { "content-type": "application/json" } },
  );
}
