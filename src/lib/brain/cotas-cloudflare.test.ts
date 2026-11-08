import { afterEach, describe, expect, it, vi } from "vitest";
import {
  pedidoDeCotaValido, reservarCotaSincrona, type PersistenciaDaCota, type PedidoCotaGlobal,
} from "../../../infra/flow-ai-quota/regras";
import { criarLimitadorDeNamespace } from "./cotas-cloudflare.server";

class BancoFalso implements PersistenciaDaCota {
  eventos = new Map<string, number>();
  transacao<T>(executar: () => T) { return executar(); }
  existe(id: string) { return this.eventos.has(id); }
  contarDesde(ms: number) { return Array.from(this.eventos.values()).filter(v => v > ms).length; }
  inserir(id: string, ms: number) { this.eventos.set(id, ms); }
  apagarAntes(ms: number) {
    for (const [id, instante] of this.eventos) if (instante <= ms) this.eventos.delete(id);
  }
}
const p = (id: string, minuto = 3, dia = 7): PedidoCotaGlobal => ({
  provedor: "groq", chaveId: "chave-uma", idempotencia: id,
  janelaMinutoMax: minuto, janelaDiaMax: dia,
});
afterEach(() => vi.restoreAllMocks());

describe("Durable Objects — núcleo transacional da cota", () => {
  it("sem entrada válida não grava", () => {
    const db = new BancoFalso();
    expect(pedidoDeCotaValido(p("a", 0), 100_000)).toBe(false);
    expect(reservarCotaSincrona(db, p("a", 0), 100_000)).toBe(false);
    expect(db.eventos.size).toBe(0);
  });
  it("limite global de minuto permite exatamente N chamadas", () => {
    const db = new BancoFalso();
    expect([0, 1, 2, 3].map(i => reservarCotaSincrona(db, p("r"+i), 120_000+i))).toEqual([
      true, true, true, false,
    ]);
  });
  it("janela móvel evita explosão na virada do minuto", () => {
    const db = new BancoFalso();
    expect(reservarCotaSincrona(db, p("1", 1), 119_999)).toBe(true);
    expect(reservarCotaSincrona(db, p("2", 1), 120_000)).toBe(false);
    expect(reservarCotaSincrona(db, p("3", 1), 180_000)).toBe(true);
  });
  it("janela de 24h vale mesmo depois de a janela do minuto esvaziar", () => {
    const db = new BancoFalso();
    expect(reservarCotaSincrona(db, p("1", 3, 1), 90_000_000)).toBe(true);
    expect(reservarCotaSincrona(db, p("2", 3, 1), 90_120_000)).toBe(false);
    expect(reservarCotaSincrona(db, p("3", 3, 1), 176_400_001)).toBe(true);
  });
  it("repetição idempotente nunca permite chamada sem nova reserva", () => {
    const db = new BancoFalso();
    expect(reservarCotaSincrona(db, p("mesmo"), 100_000)).toBe(true);
    expect(reservarCotaSincrona(db, p("mesmo"), 100_001)).toBe(false);
    expect(db.eventos.size).toBe(1);
  });
  it("oitenta requisições simultâneas recebem somente três vagas", async () => {
    const db = new BancoFalso();
    const resultados = await Promise.all(Array.from({ length: 80 }, (_, i) =>
      Promise.resolve().then(() => reservarCotaSincrona(db, p("req-"+i), 120_000)),
    ));
    expect(resultados.filter(Boolean)).toHaveLength(3);
    expect(db.eventos.size).toBe(3);
  });
  it("limites duvidosos ou fraudulentos são rejeitados", () => {
    const db = new BancoFalso();
    expect(reservarCotaSincrona(db, p("a", 5000), 120_000)).toBe(false);
    expect(reservarCotaSincrona(db, p("b", 1, 5000), 120_000)).toBe(false);
    expect(reservarCotaSincrona(db, { ...p("c"), chaveId: "segredo com espaços" }, 120_000)).toBe(false);
    expect(reservarCotaSincrona(db, { ...p("d"), idempotencia: "" }, 120_000)).toBe(false);
    expect(db.eventos.size).toBe(0);
  });
});

describe("Flow Core — namespace compartilhada por chave", () => {
  it("sem binding, não produz limitador", () => {
    expect(criarLimitadorDeNamespace(null)).toBeNull();
    expect(criarLimitadorDeNamespace(undefined)).toBeNull();
  });
  it("todos os tenants usam a mesma identidade de objeto por chave", async () => {
    const nomes: string[] = [];
    const eventos: string[] = [];
    const namespace = {
      getByName(nome: string) {
        nomes.push(nome);
        return { reservar: async (pedido: PedidoCotaGlobal) => {
          eventos.push(pedido.idempotencia);
          return true;
        }};
      },
    };
    const l = criarLimitadorDeNamespace(namespace)!;
    const dados = { provedor: "groq" as const, modelo: "gratuito",
      chaveId: "contaA", janelaMinutoMax: 2, janelaDiaMax: 20 };
    expect(await l.reservar({ ...dados, idempotencia: "tenant-1:passo-1" })).toBe(true);
    expect(await l.reservar({ ...dados, idempotencia: "tenant-2:passo-1" })).toBe(true);
    expect(nomes).toEqual(["flow-core-v1:groq:contaA", "flow-core-v1:groq:contaA"]);
    expect(eventos).toHaveLength(2);
  });
  it("falha de RPC bloqueia cobrança; não há fallback sem cota", async () => {
    const l = criarLimitadorDeNamespace({
      getByName: () => ({ reservar: async () => { throw new Error("timeout"); } }),
    })!;
    expect(await l.reservar({
      provedor: "groq", modelo: "g", chaveId: "contaA", idempotencia: "x",
      janelaMinutoMax: 2, janelaDiaMax: 10,
    })).toBe(false);
  });
});
