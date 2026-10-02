export function deB64urlNavegador(texto: string): Uint8Array<ArrayBuffer> {
  const base = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base + "===".slice((base.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
