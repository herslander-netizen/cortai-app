/** Nomes das formas de pagamento mostradas ao cliente — fonte única. */
const ROTULO_FORMA: Record<string, string> = {
  balcao: "Pagar no local",
  saldo: "Saldo da carteira",
  pix: "Pix",
  credito: "Crédito da carteira",
  fiado: "Fiado",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

export function rotuloForma(forma: string | null | undefined) {
  return ROTULO_FORMA[forma ?? ""] ?? "Pagamento no local";
}
