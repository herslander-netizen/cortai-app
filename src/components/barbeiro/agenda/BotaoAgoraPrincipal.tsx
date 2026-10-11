import { CalendarClock, Crosshair, List, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { DURACAO, SUAVE } from "@/lib/motion";

import type { VisualizacaoAgenda } from "./CabecalhoAgenda";
import { solicitarAgora } from "./pilula-agora";
import { alturaDoTopoDaAgenda } from "./tempo";
import { useToqueLongo } from "./useToqueLongo";

/** Controle principal do pé da Agenda no celular e o botão "+" preservado em todas as larguras. */
export function BotaoAgoraPrincipal({
  visualizacao,
  onVisualizacao,
  ehHoje,
  onHoje,
  menuAberto,
  onAlternarMenu,
  onAgendarPorVoz,
  visivel = true,
}: {
  visualizacao: VisualizacaoAgenda;
  onVisualizacao: (visualizacao: VisualizacaoAgenda) => void;
  ehHoje: boolean;
  onHoje: () => void;
  menuAberto: boolean;
  onAlternarMenu: () => void;
  /** Segurar o "+" abre o agendamento por voz já ouvindo. Sem isto, o "+" só abre o menu. */
  onAgendarPorVoz?: () => void;
  visivel?: boolean;
}) {
  const celular = useMediaQuery("(max-width: 600px)");
  // Só com o menu fechado: com o menu aberto o "+" é o "X" e segurar não faz nada de especial.
  const toqueLongo = useToqueLongo(onAgendarPorVoz, { ativo: !menuAberto });
  const menosMovimento = useMenosMovimento();
  const levarAoAgoraQuandoForHoje = useRef(false);
  const proxima = visualizacao === "timeline" ? "lista" : "timeline";
  const IconeVisualizacao = proxima === "timeline" ? CalendarClock : List;

  const rolarLista = useCallback(() => {
    const primeiro = document.querySelector<HTMLElement>(
      "#agenda-painel-visualizacao .agenda-item",
    );
    const topo = document.getElementById("agenda-painel-visualizacao");
    const alvo = primeiro ?? topo;
    if (!alvo) return;
    window.scrollTo({
      top: window.scrollY + alvo.getBoundingClientRect().top - alturaDoTopoDaAgenda() - 8,
      behavior: menosMovimento ? "auto" : "smooth",
    });
  }, [menosMovimento]);

  const levarAoAgora = useCallback(
    (destino: VisualizacaoAgenda) => {
      if (destino === "lista") rolarLista();
      else solicitarAgora();
    },
    [rolarLista],
  );

  useEffect(() => {
    if (!ehHoje || !levarAoAgoraQuandoForHoje.current) return;
    levarAoAgoraQuandoForHoje.current = false;
    const quadro = window.requestAnimationFrame(() => levarAoAgora(visualizacao));
    return () => window.cancelAnimationFrame(quadro);
  }, [ehHoje, levarAoAgora, visualizacao]);

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

  function soltarFocoDoToque(evento: PointerEvent<HTMLButtonElement>) {
    evento.currentTarget.blur();
  }

  function teclasDaVisualizacao(evento: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key)) return;
    evento.preventDefault();
    const destino = evento.key === "Home" ? "timeline" : evento.key === "End" ? "lista" : proxima;
    onVisualizacao(destino);
  }

  if (!visivel) return null;

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
            className="agenda-botao-agora-ir"
            aria-label="Ir para agora"
            onClick={irParaAgora}
            onPointerUp={soltarFocoDoToque}
          >
            <Crosshair aria-hidden />
            <span>Agora</span>
          </Button>
          <span className="agenda-botao-agora-separador" aria-hidden />
          <Button
            id={`agenda-aba-${visualizacao}`}
            variant="ghost"
            size="icon"
            className="agenda-botao-agora-visualizacao"
            aria-label={`Mostrar ${proxima === "timeline" ? "Timeline" : "Lista"}`}
            onKeyDown={teclasDaVisualizacao}
            onClick={alternarVisualizacao}
            onPointerUp={soltarFocoDoToque}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={proxima}
                className="inline-flex"
                initial={menosMovimento ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  rotate: 0,
                  scale: 1,
                  transition: { duration: menosMovimento ? DURACAO.rapida : 0.11, ease: SUAVE },
                }}
                exit={{
                  opacity: 0,
                  rotate: menosMovimento ? 0 : -90,
                  scale: menosMovimento ? 1 : 0.8,
                  transition: { duration: menosMovimento ? 0 : 0.07, ease: SUAVE },
                }}
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
          aria-label={menuAberto ? "Fechar ações da agenda" : "Ações da agenda"}
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          aria-describedby={onAgendarPorVoz ? "agenda-fab-dica-voz" : undefined}
          data-acoes-agenda
          className="agenda-acao-redonda agenda-fab-toggle"
          data-aberto={menuAberto}
          data-segurando={toqueLongo.segurando || undefined}
          onClick={onAlternarMenu}
          {...toqueLongo.propriedades}
        >
          <Plus
            aria-hidden
            className={`agenda-fab-icone ${menuAberto ? "agenda-fab-icone-aberto" : ""}`}
          />
        </Button>
        {onAgendarPorVoz ? (
          <span id="agenda-fab-dica-voz" className="sr-only">
            Segure para agendar por voz.
          </span>
        ) : null}
      </div>
    </>
  );
}
