import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Tela da lista de espera mais leve (dono, 06/11/2026). */
const rota = readFileSync("src/routes/barbeiro.fila.tsx", "utf8");
const pessoa = readFileSync("src/components/barbeiro/espera/PessoaDaEspera.tsx", "utf8");

describe("lista de espera da equipe", () => {
  it("cada pessoa tem um único menu ⋯ (sem setas e botões soltos na linha)", () => {
    expect(rota).not.toMatch(/ArrowUp|ArrowDown|>\s*Agendar\s*</);
    expect(pessoa).toContain("<DropdownMenu>");
    for (const acao of [
      "Agendar",
      "Editar preferência",
      "Subir na lista",
      "Descer na lista",
      "Tirar da lista",
    ])
      expect(pessoa).toContain(acao);
  });

  it("agrupa pelo dia pedido e mostra o prazo da oferta", () => {
    expect(rota).toContain("agruparPorDiaDesejado(itens)");
    expect(pessoa).toContain("expira em ${minutosParaExpirar");
  });

  it("tirar da lista continua com desfazer de 5 s", () => {
    expect(rota).toContain("comDesfazer(`${cliente} saiu da lista.`");
    expect(rota).toContain("}, 5000);");
  });

  it("a rota fica abaixo de 300 linhas", () => {
    expect(rota.split("\n").length).toBeLessThanOrEqual(300);
  });

  it("o cliente vê a posição e a regra de verdade (uma pessoa por vez, com prazo)", () => {
    const cliente = readFileSync("src/routes/app.espera.tsx", "utf8");
    expect(cliente).not.toContain("Quem responder primeiro");
    expect(cliente).toContain("Sua posição");
    expect(cliente).toContain("{PRAZO_DA_OFERTA_MIN} minutos");
    expect(cliente).toContain('loading={acao.estaEm("fila")}');
  });
});
