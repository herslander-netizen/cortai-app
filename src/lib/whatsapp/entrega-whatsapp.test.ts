import { describe, expect, it } from "vitest";

import { acaoDoErroMeta, lembretePerdeuOMomento, lerErroMeta, linkWaMe } from "./erros-meta";
import { traduzirEstado } from "./entregas.server";
import { rotearConexaoMeta, type ConexaoMeta } from "./roteamento-meta";

const ID = "1319089504626412";
const c = (id: string, extra: Partial<ConexaoMeta> = {}): ConexaoMeta => ({
  id,
  tenant_id: `t-${id}`,
  sessao_id: `s-${id}`,
  meta_phone_number_id: null,
  numero: "+55 79 9818-1983",
  compartilhada: false,
  ...extra,
});

describe("roteamento do número oficial", () => {
  it("uma conexão com o id", () => {
    const r = rotearConexaoMeta([c("a", { meta_phone_number_id: ID })], ID);
    expect(r).toMatchObject({ tipo: "ok", compartilhada: false, aprenderIds: [] });
  });
  it("várias compartilhadas com o mesmo id", () => {
    const r = rotearConexaoMeta(
      [
        c("a", { meta_phone_number_id: ID, compartilhada: true }),
        c("b", { meta_phone_number_id: ID, compartilhada: true }),
      ],
      ID,
    );
    expect(r).toMatchObject({ tipo: "ok", compartilhada: true });
  });
  it("id ainda não gravado: mesmo número vira compartilhado e aprende o id em todas", () => {
    const r = rotearConexaoMeta([c("a"), c("b")], ID, "557998181983");
    expect(r).toMatchObject({ tipo: "ok", compartilhada: true, aprenderIds: ["a", "b"] });
  });
  it("payload real do webhook (caso das 18:53) chega a um negócio", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: { metadata: { phone_number_id: ID, display_phone_number: "557998181983" } },
            },
          ],
        },
      ],
    };
    const meta = payload.entry[0]!.changes[0]!.value.metadata;
    const r = rotearConexaoMeta([c("a"), c("b")], meta.phone_number_id, meta.display_phone_number);
    expect(r.tipo).toBe("ok");
  });
  it("número desconhecido", () => {
    const r = rotearConexaoMeta(
      [c("a", { meta_phone_number_id: "999", numero: "5511900000000" })],
      ID,
      "5521988887777",
    );
    expect(r.tipo).toBe("erro");
  });
});

describe("mapa de erros da Meta", () => {
  it.each([
    [131047, "sem_modelo"],
    [131026, "falhou"],
    [131049, "erro"],
    [131050, "falhou"],
    [131056, "erro"],
    [130429, "erro"],
    [131016, "erro"],
    [132000, "falhou"],
    [131042, "falhou"],
  ])("%i → %s", (codigo, status) => {
    expect(acaoDoErroMeta(codigo).status).toBe(status);
  });
  it("efeitos colaterais", () => {
    expect(acaoDoErroMeta(131026).marcarSemWhatsapp).toBe(true);
    expect(acaoDoErroMeta(131050).suprimirMarketing).toBe(true);
    expect(acaoDoErroMeta(131049).esperarMs).toBe(24 * 3600_000);
    expect(acaoDoErroMeta(132012).alerta).toBe("tecnico");
    expect(acaoDoErroMeta(131042).alerta).toBe("critico");
    expect(acaoDoErroMeta(null, 503)).toMatchObject({ status: "erro", maxTentativas: 3 });
  });
  it("lê o código do erro do envio", () => {
    expect(lerErroMeta('WhatsApp send failed (400): {"error":{"code":131026}}')).toEqual({
      codigo: 131026,
      httpStatus: 400,
    });
  });
  it("link do wa.me pronto", () => {
    expect(linkWaMe("+55 79 99999-0000", "Olá, Ana")).toBe(
      "https://wa.me/5579999990000?text=Ol%C3%A1%2C%20Ana",
    );
  });
  it("lembrete atrasado mais de 2h não sai", () => {
    const inicio = "2026-10-02T15:00:00Z";
    expect(lembretePerdeuOMomento(inicio, 24, new Date("2026-10-01T16:00:00Z"))).toBe(false);
    expect(lembretePerdeuOMomento(inicio, 24, new Date("2026-10-01T17:30:00Z"))).toBe(true);
  });
  it("estado da Meta vira estado do envio", () => {
    expect(traduzirEstado("delivered")?.envio).toBe("entregue");
    expect(traduzirEstado("failed")?.envio).toBe("falhou");
  });
});
