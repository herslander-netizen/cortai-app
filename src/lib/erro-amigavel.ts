/** Troca erros técnicos (banco, rede) por mensagem curta em português. O bruto vai só ao console. */
export const MENSAGEM_PADRAO = "Não consegui salvar. Tente de novo.";

const TECNICO =
  /violates|constraint|duplicate key|null value|relation "|column "|syntax|permission denied|row-level security|PGRST|fetch failed|Failed to fetch|NetworkError|timeout|ZodError|invalid input|Expected|Received/i;

export function mensagemDeErro(e: unknown, padrao = MENSAGEM_PADRAO): string {
  const texto = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (texto) console.error("[configurar]", texto);
  if (!texto || TECNICO.test(texto) || /^[\x20-\x7e]+$/.test(texto) && !/[ãõçéíóúâê]/i.test(texto)) {
    return padrao;
  }
  return texto.length > 140 ? padrao : texto;
}

/** Grava e só então avança; falha mantém a etapa atual. */
export async function avancarSeSalvar(p: {
  gravar?: () => Promise<unknown>;
  gravarEtapa: () => Promise<unknown>;
  avancar: () => void;
  aoErro: (mensagem: string) => void;
}): Promise<boolean> {
  try {
    if (p.gravar) await p.gravar();
    await p.gravarEtapa();
  } catch (e) {
    p.aoErro(mensagemDeErro(e));
    return false;
  }
  p.avancar();
  return true;
}
