import { urlDasFontes, type PaginaConfig } from "@/lib/pagina-config";

/**
 * Carrega as fontes da marca; o React leva o link para o head.
 *
 * `semEspera` (prévias do editor): com `precedence`, o React 19 esconde a tela inteira e mostra o
 * esqueleto da rota até a folha do Google Fonts chegar — no celular, Personalizar Página aparecia e sumia.
 * Sem `precedence` o link entra no lugar e a prévia troca de fonte quando ela chegar (`display=swap`).
 */
export function FontesDaMarca({
  config,
  semEspera = false,
}: {
  config: Pick<PaginaConfig, "fonteTitulo" | "fonteTexto">;
  semEspera?: boolean;
}) {
  if (semEspera) return <link rel="stylesheet" href={urlDasFontes(config)} />;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={urlDasFontes(config)} precedence="default" />
    </>
  );
}
