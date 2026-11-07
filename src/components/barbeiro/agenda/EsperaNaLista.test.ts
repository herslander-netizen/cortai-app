import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Lista de espera dentro da lista da Agenda (dono, 06/11/2026). */
const ler = (f: string) => readFileSync(`src/components/barbeiro/agenda/${f}`, "utf8");
const dia = ler("DiaDaLista.tsx");
const espera = ler("EsperaNaLista.tsx");
const horario = ler("HorarioDaLista.tsx");
const lista = ler("ListaPeriodo.tsx");

describe("lista de espera na Agenda", () => {
  it("mostra 'N na espera' discreto na onda do dia, e some durante a busca", () => {
    expect(dia.replace(/\s+/g, " ")).toContain(
      "naEspera > 0 && !comBusca ? ( <EsperaNaOnda total={naEspera} onAbrir={onEspera} />",
    );
    expect(espera).toContain("<OndaDaLista>");
    expect(espera).toContain("na espera ›");
  });

  it("a gaveta é a padrão, só leitura, e leva à tela da lista pelo link oficial", () => {
    expect(espera).toContain("<FolhaPadrao");
    expect(espera).toContain("LINKS_DE_TELA.espera");
    expect(espera).toContain("expira em ${minutosParaExpirar");
    expect(espera).not.toMatch(/ofertarVaga|converterFilaEmAgendamento|removerDaFila/);
  });

  it("a linha da oferta só aparece em horário liberado (cancelou, faltou ou remarcou)", () => {
    expect(horario).toContain(
      'const LIBERADOS = new Set(["cancelado", "nao_compareceu", "remarcado"]);',
    );
    expect(horario).toContain("ofertas?.[item.id] && LIBERADOS.has(item.status)");
  });

  it("a leitura da espera é só consulta e não muda nada", () => {
    const funcao = readFileSync("src/lib/lista-espera-agenda.functions.ts", "utf8");
    expect(funcao).toContain("requireSupabaseAuth");
    expect(funcao).toContain('.eq("tenant_id", tenantId)');
    expect(funcao).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
    expect(lista).toContain("getEsperaDaAgenda()");
  });
});

describe("gaveta da lista de espera x botão +", () => {
  it("o botão + da Agenda some enquanto qualquer gaveta está aberta (07/11/2026)", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toMatch(
      /body:has\(\[role="dialog"\]\[data-state="open"\]\) \.agenda-acao-fixa \{\s*opacity: 0;\s*pointer-events: none;/,
    );
  });
});
