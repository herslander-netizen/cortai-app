import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Protege o defeito filmado em 08/11: dois portais independentes renderizavam
// cabeçalhos concorrentes no mesmo slot enquanto um ainda animava a saída.
const cabecalho = readFileSync("src/components/barbeiro/agenda/CabecalhoAgenda.tsx", "utf8");
const agenda = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
const transicao = readFileSync("src/components/barbeiro/agenda/TransicaoVerticalDoModoEdicao.tsx", "utf8");

describe("topo exclusivo da Agenda", () => {
  it("tem um único portal para o centro, alternado sem coexistência", () => {
    expect(agenda).not.toContain('<NaBarraDoTopo alvoId="topo-centro">');
    expect(cabecalho).toContain('useAlvoNoTopo("topo-centro", celular)');
    expect(cabecalho).toContain('<AnimatePresence initial={false} mode="wait">');
    expect(cabecalho).toContain('key="topo-edicao"');
    expect(cabecalho).toContain('key="topo-normal"');
    expect(cabecalho).toContain('<CabecalhoDeEdicao dia={dia} naBarra {...(onReagendar ? { onReagendar } : {})} />');
  });

  it("recolhe a semana e limpa busca/calendário durante edição", () => {
    expect(agenda).toContain('key="semana-topo"');
    expect(agenda).toContain('exit={{ height: 0, opacity: 0 }}');
    expect(agenda).toContain('if (edicao.rascunho) setCalAberto(false)');
    expect(cabecalho).toContain('if (emEdicao) {');
    expect(cabecalho).toContain("buscaDaLista.fechar();");
    expect(cabecalho).toContain("setCalendario(false);");
  });

  it("não confunde a barra normal com edição nem ignora movimento reduzido", () => {
    expect(cabecalho).toContain("marcarEdicao={false}");
    expect(transicao).toContain('data-edicao-ui={marcarEdicao ? "" : undefined}');
    expect(transicao).toContain("reduzirMovimento ? { duration: 0 }");
  });
});
