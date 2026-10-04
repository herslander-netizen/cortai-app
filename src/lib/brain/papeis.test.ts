import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ia/acoes.server", () => ({ ACOES_DO_AGENTE: {} }));
import { acaoPermitida, type ContextoDoCerebro } from "./acoes.server";

const base = { tenantId: "t1", ator: "5511999999999" };
const cliente: ContextoDoCerebro = { ...base, canal: "whatsapp", telefoneCliente: base.ator };
const prof: ContextoDoCerebro = { ...base, canal: "whatsapp", papel: "profissional", profissionalId: "p1" };
const dono: ContextoDoCerebro = { ...base, canal: "whatsapp", papel: "dono" };
const painel: ContextoDoCerebro = { ...base, canal: "painel" };
const site: ContextoDoCerebro = { ...base, canal: "site" };

describe("permissões por papel no WhatsApp", () => {
  it("cliente agenda, remarca e cancela, mas não vê agenda da equipe nem indicadores", () => {
    for (const a of ["criar_agendamento", "reagendar_agendamento", "cancelar_agendamento", "consultar_disponibilidade", "encaminhar_humano"])
      expect(acaoPermitida(a, cliente)).toBe(true);
    for (const a of ["minha_agenda", "consultar_fila", "avisar_atraso", "consultar_movimento", "registrar_nota"])
      expect(acaoPermitida(a, cliente)).toBe(false);
  });
  it("profissional vê a própria agenda e avisa atraso, sem indicadores do negócio", () => {
    for (const a of ["minha_agenda", "consultar_fila", "avisar_atraso", "criar_agendamento"])
      expect(acaoPermitida(a, prof)).toBe(true);
    expect(acaoPermitida("consultar_movimento", prof)).toBe(false);
    expect(acaoPermitida("encaminhar_humano", prof)).toBe(false);
  });
  it("dono vê indicadores e agenda do negócio, não avisa atraso como profissional", () => {
    expect(acaoPermitida("consultar_movimento", dono)).toBe(true);
    expect(acaoPermitida("minha_agenda", dono)).toBe(true);
    expect(acaoPermitida("avisar_atraso", dono)).toBe(false);
  });
  it("ações da equipe no WhatsApp não vazam para painel nem site", () => {
    for (const a of ["minha_agenda", "consultar_fila", "avisar_atraso"]) {
      expect(acaoPermitida(a, painel)).toBe(false);
      expect(acaoPermitida(a, site)).toBe(false);
    }
    expect(acaoPermitida("criar_agendamento", site)).toBe(false);
  });
  it("não existe ação de pagamento em nenhum papel", () => {
    for (const ctx of [cliente, prof, dono, painel, site])
      expect(acaoPermitida("confirmar_pagamento", ctx)).toBe(false);
  });
});
