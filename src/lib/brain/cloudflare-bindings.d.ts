/** Tipagem mínima do binding global para a prévia Cloudflare.
 * Substituir pelos tipos gerados por wrangler quando o namespace for conectado. */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
