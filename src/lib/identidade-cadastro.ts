import { contrasteDaMarca } from "@/lib/cor-marca";

/** Cores definidas na implantação, independentes da paleta global do Flow. */
export type PaletaDoCadastro = {
  principal: string;
  secundaria: string;
  destaque: string;
};

function registro(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

/**
 * Atualiza apenas os seis tokens de cor da página pública.
 * Preserva o layout, o chat, o modo de agendamento e campos de versões futuras.
 * Também permite incorporar a identidade completa sem substituir a página.
 */
export function aplicarIdentidadeDoCadastro(
  container: unknown,
  paleta: PaletaDoCadastro | null,
  marca: Record<string, unknown>,
): Record<string, unknown> {
  const anterior = registro(container);
  const pagina = registro(anterior["pagina"]);
  const cores = registro(pagina["cores"]);
  const novaPagina = paleta
    ? {
        ...pagina,
        cores: {
          ...cores,
          principal: paleta.principal,
          secundaria: paleta.secundaria,
          botao: paleta.principal,
          fundo: paleta.secundaria,
          texto: contrasteDaMarca(paleta.secundaria),
          destaque: paleta.destaque,
        },
      }
    : pagina;

  return { ...anterior, pagina: novaPagina, marca };
}
