/**
 * Destaca valores em reais em mensagens livres enviadas ao WhatsApp.
 * WhatsApp usa um asterisco de cada lado para negrito: *R$ 120,00*.
 *
 * Não modifica números sem R$, não altera dados do catálogo e respeita
 * trechos que já estejam em negrito (inclusive com mais texto).
 * Modelos oficiais aprovados são formatados pelo próprio catálogo Meta.
 */
export function destacarValoresEmReaisNoWhatsapp(texto: string): string {
  const preco = /R\$\s*(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?(?!\d|,\d|\.\d)/g;

  return texto
    .split(/(\*[^*\n]+\*)/g)
    .map((parte, indice) =>
      indice % 2 === 1 ? parte : parte.replace(preco, (valor) => `*${valor}*`),
    )
    .join("");
}
