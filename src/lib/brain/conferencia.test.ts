import { describe, expect, it } from "vitest";
import {
  conferenciaLigada,
  itensDeProvasDoAgendamento,
  montarConferencia,
  motivoDoBloqueio,
  vereditoDe,
  type ItemDeConferencia,
} from "./conferencia";
import { novasEvidencias, registrarEvidencia } from "./execucao-direta";

const ok = (id: string): ItemDeConferencia => ({ id, rotulo: id, valor: "certo", estado: "ok" });
const atencao = (id: string): ItemDeConferencia => ({
  id,
  rotulo: id,
  valor: "talvez",
  estado: "atencao",
  detalhe: "confira",
});
const erro = (id: string, detalhe = "não dá"): ItemDeConferencia => ({
  id,
  rotulo: id,
  valor: "ruim",
  estado: "erro",
  detalhe,
});

describe("veredito da conferência (regra, não opinião do modelo)", () => {
  it("tudo ok → pronto", () => {
    const c = montarConferencia([ok("a"), ok("b")]);
    expect(c.veredito).toBe("pronto");
    expect(c.resumo).toBe("Tudo conferido: pode gravar.");
  });
  it("qualquer atenção sem erro → atenção", () => {
    expect(vereditoDe([ok("a"), atencao("b")])).toBe("atencao");
    expect(montarConferencia([atencao("b")]).resumo).toMatch(/Confira os pontos marcados/);
  });
  it("qualquer erro → bloqueado, mesmo com atenção e ok junto, e explica o primeiro motivo", () => {
    const c = montarConferencia([ok("a"), atencao("b"), erro("c", "Horário ocupado.")]);
    expect(c.veredito).toBe("bloqueado");
    expect(c.resumo).toBe("Não dá para gravar: Horário ocupado.");
    expect(motivoDoBloqueio(c)).toBe("Horário ocupado.");
  });
  it("sem itens, nada a conferir → pronto", () => {
    expect(vereditoDe([])).toBe("pronto");
  });
  it("o motivo do bloqueio nunca fica vazio", () => {
    expect(motivoDoBloqueio(montarConferencia([ok("a")]))).toMatch(/não passou/);
    expect(
      motivoDoBloqueio(
        montarConferencia([{ id: "x", rotulo: "Cliente", valor: "Sumiu", estado: "erro" }]),
      ),
    ).toBe("Cliente: Sumiu");
  });
});

describe("provas do turno para agendar", () => {
  const INICIO = "2026-10-12T15:00:00-03:00";
  const dados = { clienteId: "cli-1", servicoId: "srv-1", profissionalId: "pro-1", inicio: INICIO };
  const dono = { papel: "dono" };

  function completas() {
    const ev = novasEvidencias();
    registrarEvidencia(ev, "buscar_cliente_por_nome", {}, { clientes: [{ id: "cli-1" }] });
    registrarEvidencia(ev, "listar_servicos", {}, [{ id: "srv-1" }]);
    registrarEvidencia(
      ev,
      "consultar_disponibilidade",
      { servicoId: "srv-1" },
      { livres: [{ profissionalId: "pro-1", inicio: INICIO }] },
    );
    return ev;
  }

  it("com tudo provado, os três itens ficam ok", () => {
    const itens = itensDeProvasDoAgendamento(dados, dono, completas());
    expect(itens.map((i) => i.estado)).toEqual(["ok", "ok", "ok"]);
    expect(vereditoDe(itens)).toBe("pronto");
  });

  it("sem nenhuma consulta, os três viram atenção (a pessoa precisa conferir)", () => {
    const itens = itensDeProvasDoAgendamento(dados, dono, novasEvidencias());
    expect(itens.map((i) => i.estado)).toEqual(["atencao", "atencao", "atencao"]);
    expect(vereditoDe(itens)).toBe("atencao");
  });

  it("busca ambígua explica que havia mais de um cliente", () => {
    const ev = novasEvidencias();
    registrarEvidencia(
      ev,
      "buscar_cliente_por_nome",
      {},
      { clientes: [{ id: "cli-1" }, { id: "cli-2" }] },
    );
    const [cliente] = itensDeProvasDoAgendamento(dados, dono, ev);
    expect(cliente?.detalhe).toMatch(/mais de um cliente/);
  });

  it("horário a 1 minuto da consulta não conta; profissional logado usa o próprio id", () => {
    const ev = completas();
    const fora = itensDeProvasDoAgendamento(
      { ...dados, inicio: "2026-10-12T15:01:00-03:00" },
      dono,
      ev,
    );
    expect(fora[2]?.estado).toBe("atencao");
    const prof = itensDeProvasDoAgendamento(
      { ...dados, profissionalId: "outro" },
      { papel: "profissional", profissionalId: "pro-1" },
      ev,
    );
    expect(prof[2]?.estado).toBe("ok");
  });
});

describe("interruptor CORTAI_CONFERENCIA", () => {
  it("ligado por padrão; false/0/off/nao desligam", () => {
    expect(conferenciaLigada({})).toBe(true);
    expect(conferenciaLigada({ CORTAI_CONFERENCIA: "true" })).toBe(true);
    for (const v of ["false", "0", "OFF", " nao "])
      expect(conferenciaLigada({ CORTAI_CONFERENCIA: v })).toBe(false);
  });
});
