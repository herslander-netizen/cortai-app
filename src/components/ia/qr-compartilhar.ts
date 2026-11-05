/**
 * Imagem PNG do QR de conexão para compartilhar com outro aparelho (o celular do negócio não escaneia a própria tela).
 * Texto do código: desenha com módulos sempre escuros sobre branco e margem de leitura; imagem pronta: usa como veio.
 */
export async function imagemDoQr(valor: string): Promise<Blob> {
  let url: string;
  if (valor.startsWith("data:image")) url = valor;
  else if (/^[A-Za-z0-9+/=\s]+$/.test(valor) && valor.length > 300)
    url = `data:image/png;base64,${valor.replace(/\s/g, "")}`;
  else {
    const estilos = window.getComputedStyle(document.documentElement);
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
