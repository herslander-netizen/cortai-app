import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { salvarPacoteEAtualizarLista } from "./pacotes-salvamento";

describe("Pacotes — salvar uma vez e atualizar sem falso erro de gravação", () => {
  it("retorna sucesso imediatamente após gravar, mesmo se atualizar a lista demora", async () => {
    const gravar = vi.fn(async () => ({ ok: true, id: "pacote-ficticio" }));
    const atualizar = vi.fn(() => new Promise<void>(() => {}));
    const { resultado, atualizacao } = await salvarPacoteEAtualizarLista(gravar, atualizar);
    expect(resultado).toEqual({ ok: true, id: "pacote-ficticio" });
    expect(gravar).toHaveBeenCalledTimes(1);
    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizacao).toBeInstanceOf(Promise);
    // O refresh pendente não deixa a criação esperando indefinidamente.
  });

  it("falha no cache não é tratada como falha da RPC já confirmada", async () => {
    const gravar = vi.fn(async () => ({ ok: true }));
    const atualizar = vi.fn(async () => {
      throw new Error("falha de rede na atualização da lista");
    });
    const { resultado, atualizacao } = await salvarPacoteEAtualizarLista(gravar, atualizar);
    expect(resultado).toEqual({ ok: true });
    expect(await atualizacao).toBe(false);
    expect(gravar).toHaveBeenCalledTimes(1);
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it("falha na gravação mantém erro e não tenta atualizar a lista", async () => {
    const gravar = vi.fn(async () => {
      throw new Error("salvamento não confirmado");
    });
    const atualizar = vi.fn(async () => {});
    await expect(salvarPacoteEAtualizarLista(gravar, atualizar)).rejects.toThrow(
      "salvamento não confirmado",
    );
    expect(gravar).toHaveBeenCalledTimes(1);
    expect(atualizar).not.toHaveBeenCalled();
  });

  it("captura exceção síncrona do refresh sem transformar em falha de gravação", async () => {
    const gravar = vi.fn(async () => "salvo");
    const atualizar = vi.fn(() => {
      throw new Error("cache indisponível");
    });
    const { resultado, atualizacao } = await salvarPacoteEAtualizarLista(gravar, atualizar);
    expect(resultado).toBe("salvo");
    expect(await atualizacao).toBe(false);
  });

  it("a tela bloqueia dois toques no mesmo tick e diferencia erro de cache", () => {
    const tela = readFileSync("src/routes/barbeiro.pacotes.tsx", "utf8");
    expect(tela).toContain("if (salvandoRef.current || !rascunho");
    expect(tela).toContain("salvandoRef.current = true");
    expect(tela).toContain("salvandoRef.current = false");
    expect(tela).toContain("salvarPacoteEAtualizarLista(");
    expect(tela).toContain("Pacote salvo, mas a lista não atualizou");
    expect(tela).toContain("void atualizacao.then");
  });
});
