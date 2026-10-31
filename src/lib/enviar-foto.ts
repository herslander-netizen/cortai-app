import { comprimirImagem } from "@/lib/imagem";
import { enviarFotoDoNegocio } from "@/lib/fotos.functions";

function paraBase64(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onerror = () => falha(new Error("Não foi possível ler a foto."));
    leitor.onload = () => ok(String(leitor.result).split(",")[1] ?? "");
    leitor.readAsDataURL(blob);
  });
}

/**
 * Envia uma foto escolhida na galeria do aparelho (ou tirada na hora): reduz no próprio aparelho
 * (1600 px) e o servidor guarda na pasta do negócio. Devolve o caminho para salvar e um link para mostrar.
 */
export async function enviarFoto(
  arquivo: File,
  prefixo: "produto" | "profissional" | "foto" = "foto",
): Promise<{ path: string; url: string }> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  // PNG/WebP (logo ajustada com sobra transparente) continua transparente; foto comum vira JPEG.
  const transparente = arquivo.type === "image/png" || arquivo.type === "image/webp";
  const reduzida = await comprimirImagem(arquivo, { maxLado: 1600, transparente });
  return enviarFotoDoNegocio({ data: { base64: await paraBase64(reduzida), prefixo } });
}
