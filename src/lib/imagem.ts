/**
 * Compressão no navegador antes do envio (logo/capa). Redimensiona para caber
 * em `maxLado` e reencoda; logo mantém PNG/WebP para preservar transparência.
 * Se o navegador não conseguir decodificar, devolve o arquivo original.
 */
export async function comprimirImagem(
  file: File,
  opcoes: { maxLado: number; transparente: boolean; qualidade?: number },
): Promise<Blob> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("imagem inválida"));
      i.src = url;
    });
    const escala = Math.min(
      1,
      opcoes.maxLado / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
    );
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const tipo = opcoes.transparente ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((ok) =>
      canvas.toBlob(ok, tipo, opcoes.qualidade ?? 0.85),
    );
    if (!blob) return file;
    return blob.size < file.size || escala < 1 ? blob : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Baixa uma foto já enviada (link assinado do armazenamento) como arquivo, para reajustar o enquadramento
 * de uma foto antiga no mesmo ajustador das fotos novas.
 */
export async function arquivoDaUrl(url: string, nome = "foto"): Promise<File> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não foi possível abrir a foto para ajustar.");
  const blob = await resposta.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Esse arquivo não é uma imagem.");
  const extensao = blob.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return new File([blob], `${nome}.${extensao}`, { type: blob.type, lastModified: Date.now() });
}
