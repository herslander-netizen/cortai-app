import { Crosshair, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useMenosMovimento } from "@/hooks/useMovimento";
import { useTecladoAberto } from "@/hooks/useTecladoAberto";
import { DURACAO, SUAVE } from "@/lib/motion";

import type { VisualizacaoAgenda } from "./CabecalhoAgenda";
import { solicitarAgora } from "./pilula-agora";
import { alturaDoTopoDaAgenda } from "./tempo";
import { useToqueLongo } from "./useToqueLongo";

/**
 * Ícones do botão de visualização, como no Figaro (vídeo do dono, 26/10; spec 2-agenda §1.4): o botão mostra para
 * onde vai — na grade, `icon_agenda_list`; na lista, `icon_agenda_schedule`. Medidas tiradas do vídeo (grade de 24).
 */
function IconeListaFigaro() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor">
      {[6.1, 12, 17.9].map((y) => (
        <g key={y}>
          <circle cx="4.5" cy={y} r="1.7" />
          <rect x="8.4" y={y - 1.3} width="13.1" height="2.6" rx="1.3" />
        </g>
      ))}
    </svg>
  );
}

function IconeAgendaFigaroDoPe() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6.2 4.3h11.6" />
      <path d="M4.2 8h15.6" />
      <rect x="2.6" y="11.2" width="18.8" height="10" rx="3" />
    </svg>
  );
}

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
  filtro,
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
  /** Figaro: a foto do profissional no fim da barra, para trocar a agenda na tela. */
  filtro?: ReactNode;
}) {
  // Teclado aberto (busca na Lista): os botões de baixo não sobem com ele (dono, 29/10).
  useTecladoAberto();
  const celular = useMediaQuery("(max-width: 600px)");
  // Só com o menu fechado: com o menu aberto o "+" é o "X" e segurar não faz nada de especial.
  const toqueLongo = useToqueLongo(onAgendarPorVoz, { ativo: !menuAberto });
  const menosMovimento = useMenosMovimento();
  const levarAoAgoraQuandoForHoje = useRef(false);
  // Evita que toques duplicados durante a animação usem o mesmo estado antigo.
  const ultimaAlternanciaRef = useRef(0);
  const proxima = visualizacao === "timeline" ? "lista" : "timeline";

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
    const agora = Date.now();
    // Toques duplicados podem chegar antes de React atualizar visualizacao.
    if (agora - ultimaAlternanciaRef.current < 300) return;
    ultimaAlternanciaRef.current = agora;
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
            {/* Figaro (vídeo do dono, 26/10): "Agora" (volta para hoje e rola até agora). */}
            <span>Agora</span>
          </Button>
          <span className="agenda-botao-agora-separador" aria-hidden />
          <Button
            id={`agenda-aba-${visualizacao}`}
            variant="ghost"
            size="icon"
            type="button"
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
                {proxima === "lista" ? <IconeListaFigaro /> : <IconeAgendaFigaroDoPe />}
              </motion.span>
            </AnimatePresence>
          </Button>
          {filtro ? (
            <>
              <span className="agenda-botao-agora-separador" aria-hidden />
              {filtro}
            </>
          ) : null}
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
          style={{ filter: "none" }}
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
