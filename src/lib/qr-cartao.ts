/**
 * Cartões do QR Code no padrão do Figaro (`PageQrCodeVariant`, spec 4 §5.10): **papel** (folha para
 * imprimir e colar) e **adesivo** (quadrado com cantos redondos). O Figaro monta o desenho no servidor;
 * aqui ele é desenhado no navegador a partir do QR gerado, com as cores da marca do tema.
 */

export type VarianteDoQr = "papel" | "adesivo";

export const VARIANTES_DO_QR: Record<VarianteDoQr, { rotulo: string; largura: number; altura: number }> = {
  papel: { rotulo: "Papel", largura: 1024, altura: 1448 },
  adesivo: { rotulo: "Adesivo", largura: 1024, altura: 1024 },
};

export type OpcoesDoCartao = {
  qr: HTMLImageElement | ImageBitmap;
  nome: string;
  variante: VarianteDoQr;
  corDaMarca?: string;
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
export function desenharCartaoDoQr({ qr, nome, variante, corDaMarca = "#10203A" }: OpcoesDoCartao): string {
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
    c.fillStyle = corDaMarca;
    c.textAlign = "center";
    c.font = "700 56px sans-serif";
    c.fillText(nome.slice(0, 28), largura / 2, 845, largura - 200);
    c.font = "500 38px sans-serif";
    c.fillText("Agende pelo celular", largura / 2, 910, largura - 200);
    return canvas.toDataURL("image/png");
  }

  c.fillStyle = corDaMarca;
  c.fillRect(0, 0, largura, 200);
  c.fillStyle = "#FFFFFF";
  c.textAlign = "center";
  c.font = "700 72px sans-serif";
  c.fillText(nome.slice(0, 24), largura / 2, 125, largura - 120);
  const lado = 760;
  c.imageSmoothingEnabled = false;
  c.drawImage(qr, (largura - lado) / 2, 330, lado, lado);
  c.fillStyle = corDaMarca;
  c.font = "700 64px sans-serif";
  c.fillText("Agende seu horário", largura / 2, 1230, largura - 120);
  c.font = "500 42px sans-serif";
  c.fillText("Aponte a câmera do celular para o QR Code", largura / 2, 1300, largura - 120);
  return canvas.toDataURL("image/png");
}
