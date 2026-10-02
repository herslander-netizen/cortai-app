import { CalendarClock, Crosshair, List, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { DURACAO, SUAVE } from "@/lib/motion";

import type { VisualizacaoAgenda } from "./CabecalhoAgenda";
import { solicitarAgora } from "./pilula-agora";

/** Controle principal do pé da Agenda no celular e o botão "+" preservado em todas as larguras. */
export function BotaoAgoraPrincipal({
  visualizacao,
  onVisualizacao,
  ehHoje,
  onHoje,
  menuAberto,
  onAlternarMenu,
}: {
  visualizacao: VisualizacaoAgenda;
  onVisualizacao: (visualizacao: VisualizacaoAgenda) => void;
  ehHoje: boolean;
  onHoje: () => void;
  menuAberto: boolean;
  onAlternarMenu: () => void;
}) {
  const celular = useMediaQuery("(max-width: 600px)");
  const menosMovimento = useMenosMovimento();
  const levarAoAgoraQuandoForHoje = useRef(false);
  const proxima = visualizacao === "timeline" ? "lista" : "timeline";
  const IconeVisualizacao = proxima === "timeline" ? CalendarClock : List;

  useEffect(() => {
    if (!ehHoje || !levarAoAgoraQuandoForHoje.current) return;
    levarAoAgoraQuandoForHoje.current = false;
    const quadro = window.requestAnimationFrame(() => levarAoAgora(visualizacao));
    return () => window.cancelAnimationFrame(quadro);
  }, [ehHoje, visualizacao]);

  function rolarLista() {
    const primeiro = document.querySelector<HTMLElement>(
      '#agenda-painel-visualizacao .agenda-item',
    );
    const topo = document.getElementById("agenda-painel-visualizacao");
    const alvo = primeiro ?? topo;
    if (!alvo) return;
    alvo.scrollIntoView({
      block: primeiro ? "start" : "start",
      behavior: menosMovimento ? "auto" : "smooth",
    });
    if (primeiro) {
      const cabecalho = document.querySelector<HTMLElement>(".agenda-cabecalho-unico");
      window.scrollBy({
        top: -(cabecalho?.offsetHeight ?? 0) - 8,
        behavior: menosMovimento ? "auto" : "smooth",
      });
    }
  }

  function levarAoAgora(destino: VisualizacaoAgenda) {
    if (destino === "lista") rolarLista();
    else solicitarAgora();
  }

  function irParaAgora() {
    if (!ehHoje) {
      levarAoAgoraQuandoForHoje.current = true;
      onHoje();
      return;
    }
    levarAoAgora(visualizacao);
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
        <div
          className="agenda-botao-agora-principal"
          role="group"
          aria-label="Agora e visualização da agenda"
        >
          <Button
            variant="ghost"
            className="agenda-botao-agora-ir active:translate-y-0 active:bg-transparent"
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
            className="agenda-botao-agora-visualizacao active:translate-y-0"
            aria-label={`Mostrar ${proxima === "timeline" ? "Timeline" : "Lista"}`}
            onKeyDown={teclasDaVisualizacao}
            onClick={alternarVisualizacao}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={proxima}
                className="inline-flex"
                initial={menosMovimento ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={menosMovimento ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.8 }}
                transition={
                  menosMovimento
                    ? { duration: DURACAO.rapida, ease: SUAVE }
                    : { duration: proxima === "timeline" ? 0.11 : 0.1, ease: SUAVE }
                }
              >
                <IconeVisualizacao aria-hidden />
              </motion.span>
            </AnimatePresence>
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
