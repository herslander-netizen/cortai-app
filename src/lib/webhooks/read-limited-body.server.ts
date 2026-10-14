export type CorpoLimitado =
  | { corpo: string }
  | { status: 400 | 413 };

/** Lê o corpo em streaming, impondo limite em bytes e rejeitando UTF-8 inválido. */
export async function lerCorpoLimitado(
  request: Request,
  maxBytes: number,
): Promise<CorpoLimitado> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes precisa ser um inteiro não negativo.");
  }
  const leitor = request.body?.getReader();
  if (!leitor) return { status: 400 };

  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await leitor.cancel().catch(() => undefined);
      return { status: 413 };
    }
    partes.push(value);
  }

  const bytes = new Uint8Array(total);
  let deslocamento = 0;
  for (const parte of partes) {
    bytes.set(parte, deslocamento);
    deslocamento += parte.byteLength;
  }

  try {
    return { corpo: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { status: 400 };
  }
}
