import { ArrowDown, ArrowUp, CalendarClock, List, Plus } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";

import { usePilulaAgora } from "./pilula-agora";
import type { VisualizacaoAgenda } from "./CabecalhoAgenda";

const OPCOES = [
  { id: "timeline" as const, rotulo: "Timeline", Icone: CalendarClock },
  { id: "lista" as const, rotulo: "Lista", Icone: List },
];

function PilulaAgora({ fuso }: { fuso: string | undefined }) {
  const { lado, ir } = usePilulaAgora();
  const agora = useAgora();
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).format(agora);
  const aparece = Boolean(ir) && (lado === "acima" || lado === "abaixo");
  const Seta = lado === "acima" ? ArrowUp : ArrowDown;
  return (
    <Button
      variant="outline"
      className="agenda-faixa-agora"
      data-aparece={aparece}
      aria-hidden={!aparece || undefined}
      tabIndex={aparece ? undefined : -1}
      aria-label={`Voltar para agora, ${hora}`}
      onClick={() => ir?.()}
    >
      <Seta aria-hidden />
      Agora {hora}
    </Button>
  );
}

/** Faixa do pé da Agenda: seletor (só celular), pílula "Agora" e o "+". Fica fora do deslize de dia. */
export function FaixaOperacao({
  visivel,
  visualizacao,
  onVisualizacao,
  onTeclasVisualizacao,
  mostrarAgora,
  fuso,
  menuAberto,
  onAlternarMenu,
}: {
  visivel: boolean;
  visualizacao: VisualizacaoAgenda;
  onVisualizacao: (v: VisualizacaoAgenda) => void;
  onTeclasVisualizacao: (e: KeyboardEvent<HTMLDivElement>) => void;
  mostrarAgora: boolean;
  fuso: string | undefined;
  menuAberto: boolean;
  onAlternarMenu: () => void;
}) {
  const anterior = useRef(visualizacao);
  const [esmaecendo, setEsmaecendo] = useState<VisualizacaoAgenda | null>(null);

  useEffect(() => {
    if (anterior.current === visualizacao) return;
    setEsmaecendo(anterior.current);
    anterior.current = visualizacao;
    const timer = window.setTimeout(() => setEsmaecendo(null), 120);
    return () => window.clearTimeout(timer);
  }, [visualizacao]);

  return (
    <>
      {visivel ? (
        <div className="agenda-faixa-operacao">
          <div
            className="agenda-faixa-seletor"
            role="group"
            aria-label="Visualização da agenda"
            onKeyDown={onTeclasVisualizacao}
          >
            {OPCOES.map(({ id, rotulo, Icone }) => {
              const ativo = visualizacao === id;
              return (
                <Button
                  key={id}
                  id={`agenda-aba-${id}`}
                  variant="ghost"
                  size="icon"
                  className={`relative h-12 w-12 rounded-full transition-opacity duration-120 ease-[var(--ease-saida)] motion-reduce:transition-none ${esmaecendo === id ? "opacity-50" : "opacity-100"} ${ativo ? "text-paper" : "text-mute"}`}
                  aria-label={rotulo}
                  aria-pressed={ativo}
                  tabIndex={ativo ? 0 : -1}
                  onClick={() => onVisualizacao(id)}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-ink3 transition-opacity duration-120 motion-reduce:transition-none ${ativo ? "opacity-100" : "opacity-0"}`}
                  />
                  <Icone className="relative" />
                </Button>
              );
            })}
          </div>
          {mostrarAgora ? <PilulaAgora fuso={fuso} /> : null}
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
