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

  it("regras avançadas indisponíveis mostram aviso, sem bloquear a lista básica", () => {
    const regras = readFileSync("src/components/barbeiro/espera/RegrasDaLista.tsx", "utf8");
    expect(regras).toContain("Atualização necessária");
    expect(regras).toContain("A lista continua funcionando com as regras padrão");
    expect(regras).toContain("disabled={!rascunho || !regras.data.disponivel}");
  });

  it("a rota fica abaixo de 300 linhas", () => {
    expect(rota.split("\n").length).toBeLessThanOrEqual(300);
  });

  it("o cliente vê a posição e a regra de verdade (uma pessoa por vez, com prazo)", () => {
    const cliente = readFileSync("src/routes/app.espera.tsx", "utf8");
    expect(cliente).not.toContain("Quem responder primeiro");
    expect(cliente).toContain("Sua posição");
    expect(cliente).toContain("setPrazoMin(r.prazoMin ?? PRAZO_DA_OFERTA_MIN)");
    expect(cliente).toContain('loading={acao.estaEm("fila")}');
  });

  it("as regras da lista ficam numa gaveta padrão na própria tela e gravam pelo banco", () => {
    const regras = readFileSync("src/components/barbeiro/espera/RegrasDaLista.tsx", "utf8");
    const servidor = readFileSync("src/lib/regras-espera.functions.ts", "utf8");
    expect(rota).toContain("<RegrasDaLista />");
    expect(regras).toContain("<FolhaPadrao");
    for (const texto of ["Prazo para responder", "Não oferecer com menos de", "Profissional"])
      expect(regras).toContain(texto);
    expect(servidor).toContain('rpc("definir_regras_lista_espera"');
    expect(servidor).toContain("PRAZOS_DA_ESPERA = [10, 15, 30, 60]");
    expect(servidor).not.toContain("as never");
  });
});
