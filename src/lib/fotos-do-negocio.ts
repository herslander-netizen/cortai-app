/**
 * Fotos do negócio (produtos, portfólio, galeria). O valor guardado no banco é o **caminho** do arquivo no
 * armazenamento (`<negócio>/<arquivo>`), nunca um link digitado: o servidor assina o link na hora de mostrar.
 * Links `https://` antigos continuam valendo para o que já estava salvo.
 */
export const BUCKET_FOTOS = "tenant-logos";
/** Mais de 6 fotos no portfólio não cabem na página do profissional. */
export const MAX_FOTOS_DO_PORTFOLIO = 6;
/** Quantos arquivos a galeria mostra (os mais recentes). */
export const MAX_FOTOS_NA_GALERIA = 60;

const EXTENSAO_DE_IMAGEM = /\.(jpe?g|png|webp)$/i;

export const ehLinkExterno = (valor: string) => /^https?:\/\//i.test(valor);

export const ehArquivoDeImagem = (nome: string) => EXTENSAO_DE_IMAGEM.test(nome);

/** O caminho precisa ser da pasta do próprio negócio e sem `..` (a assinatura usa credencial de servidor). */
export function caminhoDoNegocio(valor: string, tenantId: string) {
  return valor.startsWith(`${tenantId}/`) && !valor.includes("..") && ehArquivoDeImagem(valor);
}

/** Aceita o caminho de uma foto do negócio ou um link antigo `https://`. */
export function fotoValida(valor: string, tenantId: string) {
  return ehLinkExterno(valor) || caminhoDoNegocio(valor, tenantId);
}

export function novoCaminhoDeFoto(
  tenantId: string,
  prefixo: string,
  extensao: "jpg" | "png" | "webp" = "jpg",
  aleatorio = Math.random(),
) {
  const sufixo = aleatorio.toString(36).slice(2, 8);
  return `${tenantId}/${prefixo}-${Date.now()}-${sufixo}.${extensao}`;
}

/** Confere pelos primeiros bytes que o arquivo é mesmo JPEG, PNG ou WebP (o tipo informado não basta). */
export function tipoDaImagem(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length > 7 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  if (
    bytes.length > 11 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
