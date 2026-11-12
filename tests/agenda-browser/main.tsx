import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { AgendaTimeline } from "../../src/components/barbeiro/AgendaTimeline";
import { ListaAgenda } from "../../src/components/barbeiro/agenda/ListaAgenda";
import { TrocaDeVisualizacao } from "../../src/components/barbeiro/agenda/TrocaDeVisualizacao";
import { SegmentoProvider } from "../../src/lib/segmento-contexto";
import type { AgendaItem } from "../../src/lib/barbeiro.functions";
import "../../src/styles.css";

/**
 * Bancada VISUAL isolada que importa os componentes de produção.
 * NÃO monta o AgendaOperacional, backend, autenticação ou dados reais.
 */
declare global {
  interface Window {
    __agendaLab?: {
      latencias: number[];
      erros: string[];
    };
  }
}
window.__agendaLab = { latencias: [], erros: [] };

const DIA_FIXO = "2099-10-09";

function criarItens(qtd: number): AgendaItem[] {
  return Array.from({ length: qtd }, (_, i) => {
    const inicio = new Date(Date.UTC(2099, 9, 9, 8, 0) + Math.floor(i / 2) * 15 * 60_000);
    const fim = new Date(inicio.getTime() + 30 * 60_000);
    return {
      id: `agenda-fixture-${i}`,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: i % 11 === 0 ? "chegou" : i % 17 === 0 ? "na_cadeira" : "agendado",
      forma_pagamento: null,
      valor_centavos: 3500,
      clienteId: `cliente-ficticio-${i}`,
      cliente: `Cliente fictício ${i + 1}`,
      telefone: null,
      ficha: null,
      servico: "Atendimento de teste",
      duracaoMin: 30,
      profissional: "Profissional Teste",
      profissionalId: "profissional-teste",
      arrivedAt: null,
      startedAt: null,
      finishedAt: null,
    } satisfies AgendaItem;
  });
}

function BancadaAgenda() {
  const [visao, setVisao] = useState<"timeline" | "lista">("timeline");
  const [dia, setDia] = useState(DIA_FIXO);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(40);
  const cliqueEm = useRef<number | null>(null);
  const itens = useMemo(() => criarItens(quantidade), [quantidade]);

  useLayoutEffect(() => {
    if (cliqueEm.current === null) return;
    const inicio = cliqueEm.current;
    cliqueEm.current = null;
    requestAnimationFrame(() => {
      // Tempo observável até um quadro que contém o modo solicitado.
      window.__agendaLab?.latencias.push(performance.now() - inicio);
    });
  }, [visao]);

  function alternar() {
    cliqueEm.current = performance.now();
    setVisao((atual) => (atual === "timeline" ? "lista" : "timeline"));
  }

  return (
    <SegmentoProvider segmento="barbearia">
      <main className="mx-auto min-h-screen max-w-6xl bg-ink text-paper" data-testid="laboratorio">
        <header className="sticky top-0 z-40 bg-ink p-3 shadow-sm">
          <h1 className="text-base font-bold">Flow · Bancada isolada de Agenda</h1>
          <p className="text-xs" data-testid="dia-atual">Dia: {dia}</p>
          <p className="text-xs" data-testid="modo-atual">Modo: {visao}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="alternar-visualizacao"
              aria-label="Alternar Timeline e Cartões"
              className="rounded-lg border border-current px-3 py-2"
              onClick={alternar}
            >
              {visao === "timeline" ? "Ir para Cartões" : "Ir para Timeline"}
            </button>
            <button type="button" data-testid="dia-seguinte"
              className="rounded-lg border px-3 py-2"
              onClick={() => setDia("2099-10-10")}>
              Dia seguinte
            </button>
            <button type="button" data-testid="dia-anterior"
              className="rounded-lg border px-3 py-2"
              onClick={() => setDia(DIA_FIXO)}>
              Voltar ao dia
            </button>
            <button type="button" data-testid="volume"
              className="rounded-lg border px-3 py-2"
              onClick={() => setQuantidade((n) => (n === 40 ? 120 : 40))}>
              {quantidade} itens
            </button>
          </div>
          <p className="text-xs" data-testid="selecionado">{selecionado ?? "Nenhum cartão selecionado"}</p>
        </header>
        <section id="agenda-painel-visualizacao" aria-label="Área da agenda">
          <TrocaDeVisualizacao chave={visao}>
            {visao === "timeline" ? (
              <div data-testid="timeline" className="min-h-72">
                <AgendaTimeline
                  dia={dia}
                  fuso="America/Sao_Paulo"
                  agora={Date.parse("2099-10-09T11:00:00Z")}
                  itens={itens}
                  horarios={[]}
                  selecionado={selecionado}
                  onSelecionar={setSelecionado}
                  diaCompleto
                />
              </div>
            ) : (
              <div data-testid="cartoes" className="px-2 pb-20">
                <ListaAgenda
                  itens={itens}
                  fuso="America/Sao_Paulo"
                  ehHoje={false}
                  selecionado={selecionado}
                  novos={new Set()}
                  online
                  mostrarProfissional={false}
                  onAbrir={setSelecionado}
                  onFalta={() => {}}
                />
              </div>
            )}
          </TrocaDeVisualizacao>
        </section>
      </main>
    </SegmentoProvider>
  );
}
createRoot(document.getElementById("root")!).render(<BancadaAgenda />);
