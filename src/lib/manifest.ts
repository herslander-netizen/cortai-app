/** Um único manifest por documento: a equipe instala o app dela; o resto, o do cliente. */
export const MANIFEST_EQUIPE = "/manifest-equipe.webmanifest";
export const MANIFEST_CLIENTE = "/manifest-cliente.webmanifest";

export function manifestDaRota(routeIds: readonly string[]): string {
  return routeIds.some((id) => id === "/barbeiro" || id.startsWith("/barbeiro/"))
    ? MANIFEST_EQUIPE
    : MANIFEST_CLIENTE;
}
