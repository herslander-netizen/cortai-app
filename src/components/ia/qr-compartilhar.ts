/**
 * Imagem PNG do QR de conexão para compartilhar com outro aparelho (o celular do negócio não escaneia a própria tela).
 * Texto do código: desenha com módulos sempre escuros sobre branco e margem de leitura; imagem pronta: usa como veio.
 */
export async function imagemDoQr(valor: string): Promise<Blob> {
  let url: string;
  const estilos = window.getComputedStyle(document.documentElement);
  if (valor.startsWith("data:image")) url = await repintarQr(valor);
  else if (/^[A-Za-z0-9+/=\s]+$/.test(valor) && valor.length > 300)
    url = await repintarQr(`data:image/png;base64,${valor.replace(/\s/g, "")}`);
  else {
    const { toDataURL } = await import("qrcode");
    url = await toDataURL(valor, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 768,
      color: {
        dark: estilos.getPropertyValue("--qr-modulo").trim(),
        light: estilos.getPropertyValue("--qr-light").trim(),
      },
    });
  }
  const resposta = await fetch(url);
  return resposta.blob();
}

/**
 * QR que já chega como imagem (a da Evolution vem azul): repinta cada ponto escuro com `--qr-modulo` (preto) e o
 * resto com `--qr-light` (branco), para a câmera ler bem nos dois temas. Sem canvas, devolve a imagem como veio.
 */
export async function repintarQr(url: string): Promise<string> {
  const estilos = window.getComputedStyle(document.documentElement);
  const escuro = corEmRgb(estilos.getPropertyValue("--qr-modulo").trim() || "#121513");
  const claro = corEmRgb(estilos.getPropertyValue("--qr-light").trim() || "#ffffff");
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width) return url;
  ctx.drawImage(img, 0, 0);
  const dados = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = dados.data;
  for (let i = 0; i < p.length; i += 4) {
    const luz =
      (0.299 * p[i]! + 0.587 * p[i + 1]! + 0.114 * p[i + 2]!) * (p[i + 3]! / 255) +
      255 * (1 - p[i + 3]! / 255);
    const cor = luz < 160 ? escuro : claro;
    p[i] = cor[0];
    p[i + 1] = cor[1];
    p[i + 2] = cor[2];
    p[i + 3] = 255;
  }
  ctx.putImageData(dados, 0, 0);
  return canvas.toDataURL("image/png");
}

/** "#121513" ou "rgb(18, 21, 19)" → [r, g, b]. */
export function corEmRgb(cor: string): [number, number, number] {
  const hex = cor.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex)
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  const n = cor.match(/\d+/g)?.map(Number);
  return n && n.length >= 3 ? [n[0]!, n[1]!, n[2]!] : [18, 21, 19];
}
