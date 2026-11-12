import { describe, expect, it } from "vitest";

import {
  campanhaDoRascunho,
  diaValido,
  lerValorEmCentavos,
  novoRascunhoCampanha,
  validarPassoCampanha,
} from "@/lib/campanhas-rascunho";

function completo() {
  return {
    ...novoRascunhoCampanha("2026-11-12"),
    nome: "Promoção de retorno",
    codigo: "volte20",
    percentual: "20",
    compraMinima: "50,00",
    limiteGlobal: "100",
  };
}

describe("Criação segura do rascunho de campanhas", () => {
  it("rejeita moedas ambíguas ou malformadas", () => {
    expect(lerValorEmCentavos("20")).toBe(2000);
    expect(lerValorEmCentavos("20,5")).toBe(2050);
    expect(lerValorEmCentavos("R$ 1.234,56")).toBe(123456);
    expect(lerValorEmCentavos("10abc")).toBeNull();
    expect(lerValorEmCentavos("-20")).toBeNull();
    expect(lerValorEmCentavos("1,234")).toBeNull();
    expect(lerValorEmCentavos("R$")).toBeNull();
  });

  it("rejeita datas impossíveis sem normalização silenciosa", () => {
    expect(diaValido("2026-02-29")).toBe(false);
    expect(diaValido("2024-02-29")).toBe(true);
    expect(diaValido("2026-13-01")).toBe(false);
    expect(diaValido("2026-11-31")).toBe(false);
    expect(diaValido("2026-11-12")).toBe(true);
  });

  it("valida cada etapa independentemente", () => {
    const rascunho = completo();
    expect(validarPassoCampanha(rascunho, 0)).toEqual([]);
    expect(validarPassoCampanha(rascunho, 1)).toEqual([]);
    expect(validarPassoCampanha(rascunho, 2)).toEqual([]);
    expect(validarPassoCampanha({ ...rascunho, codigo: "xx" }, 0).length).toBeGreaterThan(0);
    expect(validarPassoCampanha({ ...rascunho, percentual: "0" }, 1).length).toBeGreaterThan(0);
    expect(validarPassoCampanha({ ...rascunho, limitePorCliente: "-1" }, 1).length).toBeGreaterThan(0);
    expect(validarPassoCampanha({ ...rascunho, ultimoDia: "2026-11-10" }, 2).length).toBeGreaterThan(0);
  });

  it("converte período de dias locais para UTC com fim exclusivo", () => {
    const r = campanhaDoRascunho(completo(), "America/Maceio");
    expect(r.valida).toBe(true);
    if (!r.valida) return;
    expect(r.campanha.inicioEm).toBe("2026-11-12T03:00:00.000Z");
    expect(r.campanha.fimEm).toBe("2026-11-19T03:00:00.000Z");
    expect(r.campanha.codigo).toBe("VOLTE20");
    expect(r.campanha.beneficio).toEqual({ tipo: "percentual", percentual: 20 });
    expect(r.campanha.compraMinimaCentavos).toBe(5000);
  });

  it("permite valor fixo e limita a configuração inválida", () => {
    const r = campanhaDoRascunho({
      ...completo(),
      tipoDesconto: "valor_fixo",
      valorFixo: "10,50",
      limitePorCliente: "",
    }, "America/Maceio");
    expect(r.valida).toBe(true);
    if (!r.valida) return;
    expect(r.campanha.beneficio).toEqual({ tipo: "valor_fixo", valorCentavos: 1050 });
    expect(r.campanha.limitePorCliente).toBeNull();
    expect(r.campanha.servicosIds).toEqual([]);
  });

  it("não aceita entrada final vazia ou potencialmente negativa", () => {
    const r = campanhaDoRascunho({ ...completo(), compraMinima: "-20" }, "America/Maceio");
    expect(r.valida).toBe(false);
    expect(r.campanha).toBeNull();
    const b = campanhaDoRascunho({ ...completo(), nome: "" }, "America/Maceio");
    expect(b.valida).toBe(false);
  });
});
