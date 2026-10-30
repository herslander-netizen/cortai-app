import { describe, expect, it } from "vitest";

import { agrupar, tipoDoFiltro, type Notificacao } from "./notificacoes";

const aviso = (id: string, criado_em: string, tipo = "agendamento_novo"): Notificacao => ({
  id,
  tipo,
  titulo: id,
  corpo: null,
  link: null,
  lida_em: null,
  criado_em,
});

describe("grupos do sininho como no Figaro", () => {
  // 30/10/2026 10:00 em São Paulo (13:00 UTC).
  const agora = new Date("2026-10-30T13:00:00Z");
  const fuso = "America/Sao_Paulo";

  it("separa Hoje, Ontem, Esta semana e datas por extenso, no fuso do negócio", () => {
    const grupos = agrupar(
      [
        aviso("a", "2026-10-30T12:00:00Z"),
        // 00:30 de 30/10 em São Paulo = 03:30 UTC: ainda é hoje no negócio.
        aviso("b", "2026-10-30T03:30:00Z"),
        // 23:30 de 29/10 em São Paulo = 02:30 UTC do dia 30: é ontem no negócio.
        aviso("c", "2026-10-30T02:30:00Z"),
        aviso("d", "2026-10-26T15:00:00Z"),
        aviso("e", "2026-10-18T15:00:00Z"),
        aviso("f", "2025-12-20T15:00:00Z"),
      ],
      agora,
      fuso,
    );
    expect(grupos.map((g) => [g.rotulo, g.itens.map((i) => i.id).join("")])).toEqual([
      ["Hoje", "ab"],
      ["Ontem", "c"],
      ["Esta semana", "d"],
      ["18 de outubro", "e"],
      ["20 de dezembro de 2025", "f"],
    ]);
  });

  it("classifica os filtros Agendamentos e Clientes pelo tipo", () => {
    expect(tipoDoFiltro("agendamento_novo")).toBe("agendamentos");
    expect(tipoDoFiltro("agendamento_cancelado")).toBe("agendamentos");
    expect(tipoDoFiltro("lembrete")).toBe("agendamentos");
    expect(tipoDoFiltro("cliente_chegou")).toBe("agendamentos");
    expect(tipoDoFiltro("cliente_novo")).toBe("clientes");
    expect(tipoDoFiltro("avaliacao_nova")).toBe("clientes");
    expect(tipoDoFiltro("whatsapp_falhou")).toBeNull();
  });
});
