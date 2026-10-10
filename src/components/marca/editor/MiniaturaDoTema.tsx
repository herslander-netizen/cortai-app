import type { PaginaConfig } from "@/lib/pagina-config";

/** Esboço de página pintado com as cores do tema: fundo, texto, botão e destaque. */
export function MiniaturaDoTema({ cores }: { cores: PaginaConfig["cores"] }) {
  return (
    <span
      aria-hidden
      className="mb-3 flex h-16 w-full flex-col gap-1 rounded-md border border-line p-2"
      style={{ backgroundColor: cores.fundo }}
    >
      <i className="h-1.5 w-10 rounded-full opacity-90" style={{ backgroundColor: cores.texto }} />
      <i className="h-1 w-16 rounded-full opacity-40" style={{ backgroundColor: cores.texto }} />
      <span className="mt-auto flex items-center gap-1.5">
        <i className="h-3.5 flex-1 rounded-md" style={{ backgroundColor: cores.botao }} />
        <i className="size-3.5 rounded-full" style={{ backgroundColor: cores.destaque }} />
      </span>
    </span>
  );
}
