import { urlDasFontes, type PaginaConfig } from "@/lib/pagina-config";

/** Carrega as fontes da marca; o React leva o link para o head. */
export function FontesDaMarca({
  config,
}: {
  config: Pick<PaginaConfig, "fonteTitulo" | "fonteTexto">;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={urlDasFontes(config)} precedence="default" />
    </>
  );
}
