/**
 * Qual vínculo (negócio) vale para a pessoa logada — uma regra só para a sessão
 * (`getSessao`), para as funções do servidor (`tenantIdDoMembro`) e para o MCP.
 * Pura e testável: quem chama busca os vínculos e o `perfis.tenant_ativo`.
 *
 * Ordem de preferência: o negócio escolhido pela pessoa (se o acesso está ativo),
 * senão o primeiro acesso ativo, senão o primeiro vínculo (suspenso — quem chama
 * decide recusar). Os vínculos devem vir em ordem estável (`criado_em`).
 */
export type VinculoBasico = { tenant_id: string; ativo: boolean };

export function escolherVinculo<T extends VinculoBasico>(
  vinculos: readonly T[],
  tenantAtivo: string | null | undefined,
): T | null {
  const ativos = vinculos.filter((v) => v.ativo);
  const escolhido = tenantAtivo ? ativos.find((v) => v.tenant_id === tenantAtivo) : undefined;
  return escolhido ?? ativos[0] ?? vinculos[0] ?? null;
}
