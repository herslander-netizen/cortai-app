/**
 * Adaptador da namespace de Durable Objects ao contrato do Flow Core.
 * O namespace precisa pertencer à prévia e ser vinculado via Pages/Worker.
 */
import type { LimitadorHibridoDistribuido } from "./roteador-hibrido";
import type { PedidoCotaGlobal } from "../../../infra/flow-ai-quota/regras";

export interface NamespaceGlobalDeCotas {
  getByName(nome: string): {
    reservar(pedido: PedidoCotaGlobal): Promise<boolean>;
  };
}

export function criarLimitadorDeNamespace(
  namespace: NamespaceGlobalDeCotas | null | undefined,
): LimitadorHibridoDistribuido | null {
  if (!namespace || typeof namespace.getByName !== "function") return null;

  return {
    async reservar(input) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input.chaveId)) return false;
      try {
        // Todos os tenants compartilham o MESMO objeto por provedor e chave.
        // Nunca incluir tenant, conversa ou pessoa neste identificador.
        const nome = `flow-core-v1:${input.provedor}:${input.chaveId}`;
        const objeto = namespace.getByName(nome);
        const aceito = await objeto.reservar(input);
        return aceito === true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Importação dinâmica mantém o gateway de testes e o fallback legado
 * disponíveis fora da Cloudflare. Sem binding, o híbrido falha fechado.
 */
export async function obterLimitadorCloudflare(): Promise<LimitadorHibridoDistribuido | null> {
  try {
    const cf = await import("cloudflare:workers");
    const binding = (cf.env as unknown as {
      FLOW_AI_COTAS?: NamespaceGlobalDeCotas;
    }).FLOW_AI_COTAS;
    return criarLimitadorDeNamespace(binding);
  } catch {
    return null;
  }
}
