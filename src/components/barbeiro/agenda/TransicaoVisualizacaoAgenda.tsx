import { Activity, useRef, type ReactNode } from "react";

type Visualizacao = "lista" | "timeline" | "semana";
const VISOES: Visualizacao[] = ["lista", "timeline", "semana"];

/**
 * Mantém cada visualização já visitada em memória, sem sobrepô-las na tela.
 * React Activity oculta a anterior com display:none e suspende seus efeitos,
 * preservando os cartões e o estado interno para a próxima alternância.
 *
 * A grade de 24h não recebe transform/opacity: animar esse contêiner inteiro
 * obriga o Chrome Android a compor uma superfície grande. O controle do pé
 * mantém sua microanimação independente da montagem do conteúdo.
 */
export function TransicaoVisualizacaoAgenda({
  visualizacao,
  children,
}: {
  visualizacao: Visualizacao;
  children: ReactNode;
}) {
  const renderizadas = useRef<Partial<Record<Visualizacao, ReactNode>>>({});
  // Guardar somente as visões visitadas; ao reabrir, receber props atualizadas.
  renderizadas.current[visualizacao] = children;

  return (
    <>
      {VISOES.map((visao) => (
        <Activity key={visao} mode={visao === visualizacao ? "visible" : "hidden"}>
          {renderizadas.current[visao] ? (
            <div data-visualizacao={visao} className="col-start-1 row-start-1 min-w-0">
              {renderizadas.current[visao]}
            </div>
          ) : null}
        </Activity>
      ))}
    </>
  );
}
