import { CalendarClock, Crosshair, List, Plus } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mobile";

import type { VisualizacaoAgenda } from "./CabecalhoAgenda";
import { solicitarAgora } from "./pilula-agora";

/** Controle principal do pé da Agenda no celular e o botão "+" preservado em todas as larguras. */
export function BotaoAgoraPrincipal({
  visualizacao,
  onVisualizacao,
  menuAberto,
  onAlternarMenu,
}: {
  visualizacao: VisualizacaoAgenda;
  onVisualizacao: (visualizacao: VisualizacaoAgenda) => void;
  menuAberto: boolean;
  onAlternarMenu: () => void;
}) {
  const celular = useMediaQuery("(max-width: 600px)");
  const anterior = useRef(visualizacao);
  const [esmaecendo, setEsmaecendo] = useState(false);
  const proxima = visualizacao === "timeline" ? "lista" : "timeline";
  const IconeVisualizacao = visualizacao === "timeline" ? CalendarClock : List;

  useEffect(() => {
    if (anterior.current === visualizacao) return;
    anterior.current = visualizacao;
    setEsmaecendo(true);
    const timer = window.setTimeout(() => setEsmaecendo(false), 120);
    return () => window.clearTimeout(timer);
  }, [visualizacao]);

  function irParaAgora() {
    solicitarAgora();
    if (visualizacao !== "timeline") onVisualizacao("timeline");
  }

  function alternarVisualizacao() {
    onVisualizacao(proxima);
  }

  function teclasDaVisualizacao(evento: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key)) return;
    evento.preventDefault();
    const destino = evento.key === "Home" ? "timeline" : evento.key === "End" ? "lista" : proxima;
    onVisualizacao(destino);
  }

  return (
    <>
      {celular ? (
        <div className="agenda-botao-agora-principal" role="group" aria-label="Agora e visualização da agenda">
          <Button
            variant="ghost"
            className="agenda-botao-agora-ir"
            aria-label="Ir para agora"
            onClick={irParaAgora}
          >
            <Crosshair aria-hidden />
            <span>Agora</span>
          </Button>
          <span className="agenda-botao-agora-separador" aria-hidden />
          <Button
            id={`agenda-aba-${visualizacao}`}
            variant="ghost"
            size="icon"
            className={`agenda-botao-agora-visualizacao transition-opacity duration-120 ease-[var(--ease-saida)] motion-reduce:transition-none ${esmaecendo ? "opacity-50" : "opacity-100"}`}
            aria-label={`Alternar para ${proxima === "timeline" ? "Timeline" : "Lista"}`}
            aria-pressed={visualizacao === "lista"}
            onKeyDown={teclasDaVisualizacao}
            onClick={alternarVisualizacao}
          >
            <IconeVisualizacao aria-hidden />
          </Button>
        </div>
      ) : null}
      <div className="agenda-acao-fixa">
        <Button
          size="lg"
          variant="primary"
          aria-label="Ações da agenda"
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          className={`agenda-acao-redonda agenda-fab-toggle ${menuAberto ? "pointer-events-none invisible" : ""}`}
          data-aberto={menuAberto}
          tabIndex={menuAberto ? -1 : undefined}
          aria-hidden={menuAberto || undefined}
          onClick={onAlternarMenu}
        >
          <Plus aria-hidden className="agenda-fab-icone" />
        </Button>
      </div>
    </>
  );
}