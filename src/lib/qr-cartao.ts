/**
 * Cartões do QR Code no padrão do Figaro (`PageQrCodeVariant`, spec 4 §5.10): **papel** (folha para
 * imprimir e colar) e **adesivo** (quadrado com cantos redondos). O Figaro monta o desenho no servidor;
 * aqui ele é desenhado no navegador a partir do QR gerado, com as cores da marca do tema.
 */

export type VarianteDoQr = "papel" | "adesivo";

export const VARIANTES_DO_QR: Record<VarianteDoQr, { rotulo: string; largura: number; altura: number }> = {
  papel: { rotulo: "Papel", largura: 1024, altura: 1024 },
  adesivo: { rotulo: "Adesivo", largura: 1024, altura: 1024 },
};

export type OpcoesDoCartao = {
  qr: HTMLImageElement | ImageBitmap;
  nome: string;
  variante: VarianteDoQr;
  corDaMarca?: string;
  /** Símbolo do Flow no centro do QR (o QR precisa de correção de erro alta, nível H). */
  logo?: CanvasImageSource | null;
  /** Endereço exibido abaixo do QR, sem "https://" (ex.: "cortai.dev/meu-negocio"). */
  endereco?: string;
};

function retanguloArredondado(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Desenha o cartão e devolve o PNG (data URL). Só roda no navegador. */
/** Selo branco arredondado com o símbolo, no centro do QR (~28% do lado, ~8% da área; o nível H tolera 30%). */
function seloNoCentro(c: CanvasRenderingContext2D, logo: CanvasImageSource, x: number, y: number, lado: number) {
  const selo = Math.round(lado * 0.28);
  const sx = x + (lado - selo) / 2;
  const sy = y + (lado - selo) / 2;
  c.fillStyle = "#FFFFFF";
  retanguloArredondado(c, sx, sy, selo, selo, selo * 0.28);
  c.fill();
  c.imageSmoothingEnabled = true;
  const m = selo * 0.12;
  c.drawImage(logo, sx + m, sy + m, selo - 2 * m, selo - 2 * m);
  c.imageSmoothingEnabled = false;
}

export function desenharCartaoDoQr({
  qr,
  nome,
  variante,
  corDaMarca = "#10203A",
  logo = null,
  endereco = "",
}: OpcoesDoCartao): string {
  const { largura, altura } = VARIANTES_DO_QR[variante];
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Não foi possível montar a imagem do QR Code.");

  c.fillStyle = "#FFFFFF";
  c.fillRect(0, 0, largura, altura);

  if (variante === "adesivo") {
    c.fillStyle = corDaMarca;
    retanguloArredondado(c, 0, 0, largura, altura, 180);
    c.fill();
    c.fillStyle = "#FFFFFF";
    retanguloArredondado(c, 70, 70, largura - 140, altura - 140, 120);
    c.fill();
    const lado = 640;
    c.imageSmoothingEnabled = false;
    c.drawImage(qr, (largura - lado) / 2, 120, lado, lado);
    if (logo) seloNoCentro(c, logo, (largura - lado) / 2, 120, lado);
    c.fillStyle = corDaMarca;
    c.textAlign = "center";
    c.font = "700 56px sans-serif";
    c.fillText(nome.slice(0, 28), largura / 2, 845, largura - 200);
    c.font = "500 38px sans-serif";
    c.fillText("Agende pelo celular", largura / 2, 910, largura - 200);
    return canvas.toDataURL("image/png");
  }

  // Papel (Figaro, captura do dono 30/10): folha branca com o nome em cima, o QR com o símbolo no centro, o
  // endereço e "Agende pelo celular".
  c.textAlign = "center";
  c.fillStyle = "#202124";
  c.font = "700 64px sans-serif";
  c.fillText(nome.slice(0, 28), largura / 2, 150, largura - 160);
  const lado = 470;
  const qx = (largura - lado) / 2;
  const qy = 260;
  c.imageSmoothingEnabled = false;
  c.drawImage(qr, qx, qy, lado, lado);
  if (logo) seloNoCentro(c, logo, qx, qy, lado);
  c.fillStyle = "#202124";
  if (endereco) {
    c.font = "500 46px sans-serif";
    c.fillText(endereco.slice(0, 40), largura / 2, 860, largura - 120);
  }
  c.font = "400 38px sans-serif";
  c.fillText("Agende pelo celular", largura / 2, endereco ? 925 : 860, largura - 120);
  return canvas.toDataURL("image/png");
}
