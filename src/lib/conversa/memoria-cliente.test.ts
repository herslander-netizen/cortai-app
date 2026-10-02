import { describe, expect, it } from "vitest";
import { camposMantidosAoCorrigir, lerMemoriaCliente, lerRascunho, salvarMemoriaCliente, salvarRascunho } from "./memoria-cliente";
function storage(quebra = false) { const dados = new Map<string,string>(); return { getItem: (k:string) => { if (quebra) throw Error(); return dados.get(k) ?? null; }, setItem: (k:string,v:string) => { if (quebra) throw Error(); dados.set(k,v); }, removeItem: (k:string) => dados.delete(k) }; }
describe("memória da conversa", () => {
  it("salva e lê cliente", () => { const s=storage(); expect(salvarMemoriaCliente("x", { primeiroNome:"Ana" }, s)).toBe(true); expect(lerMemoriaCliente("x", s)?.primeiroNome).toBe("Ana"); });
  it("segue sem armazenamento", () => { const s=storage(true); expect(salvarMemoriaCliente("x", {}, s)).toBe(false); expect(lerMemoriaCliente("x", s)).toBeNull(); });
  it("expira rascunho em 30 minutos", () => { const s=storage(); salvarRascunho("x", { dia:"2026-10-02" }, s, 1000); expect(lerRascunho("x", s, 1000+29*60_000)).not.toBeNull(); expect(lerRascunho("x", s, 1000+31*60_000)).toBeNull(); });
  it("descarta somente dependências da etapa", () => expect(camposMantidosAoCorrigir("dia"))).toEqual(["servicoId", "profissionalId"]);
});
