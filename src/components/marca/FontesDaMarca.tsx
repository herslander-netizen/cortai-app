import { urlDasFontes, type PaginaConfig } from "@/lib/pagina-config";

/** Carrega as fontes da marca; o React leva o link para o head. */
export function FontesDaMarca({
  config,
}: {
  config: Pick<PaginaConfig, "fonteTitulo" | "fonteTexto">;
}) {
  return <link rel="stylesheet" href={urlDasFontes(config)} precedence="default" />;
}
