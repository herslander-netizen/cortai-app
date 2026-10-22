/** A ausência de estado em registros legados mantém a página publicada. */
export function paginaPublicaDisponivel(isOnline: boolean | null | undefined): boolean {
  return isOnline !== false;
}
