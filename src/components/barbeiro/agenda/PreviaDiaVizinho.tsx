import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect } from "react";
import type { Ref } from "react";

import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import type { AgendaDia } from "@/lib/barbeiro.functions";
import { EsqueletoAgenda, EsqueletoTimeline } from "@/components/layout/Esqueleto";

import { useVizinhoDoGesto } from "./gesto-dia";
import { MarcaDoLimiteDoDia } from "./SemanaDoTopo";
import { dataEditorial, hora, nomeDaAgenda, somarDias } from "./tempo";
import { opcoesAgendaDia } from "./useAgendaDia";

const ENCERRADOS = new Set(["cancelado", "remarcado"]);
const nada = () => {};

export type FormatoDaPrevia = "lista" | "timeline";

/** Prévia só de leitura do dia que entra pela lateral, no mesmo formato da Agenda. */
export function PreviaDiaVizinho({
  dia,
  visualizacao = "lista",
  profissionalId,
  discreto,
  diaCompleto = false,
  ref,
}: {
  dia: string;
  visualizacao?: FormatoDaPrevia;
  profissionalId: string | null;
  discreto: boolean;
  diaCompleto?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const queryClient = useQueryClient();
  // A prévia do vizinho aquece os dados antes da conclusão do gesto.
  // Mantém a consulta reutilizável para que a troca do dia não comece do zero.
  // Espera o dia principal assentar antes de aquecer os vizinhos: na abertura eles disputavam a rede com ele.
  useEffect(() => {
    const id = window.setTimeout(() => {
      void queryClient.prefetchQuery({
        ...opcoesAgendaDia(dia),
        staleTime: 15_000,
      });
    }, 2_000);
    return () => window.clearTimeout(id);
  }, [dia, queryClient]);
  const consulta = useQuery({
    ...opcoesAgendaDia(dia),
    refetchOnMount: false,
    staleTime: 15_000,
  });
  const { data } = consulta;
  const timeline = visualizacao === "timeline";
  // Mesma regra do dia aberto: na grade aparecem também os cancelados e remarcados (riscados); só a lista os
  // esconde. Escondê-los na prévia fazia o cartão riscado surgir ao assentar (vídeo do dono, 31/10).
  const itens = (data?.itens ?? [])
    .filter((i) => timeline || !ENCERRADOS.has(i.status))
    .filter((i) => !profissionalId || i.profissionalId === profissionalId)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return (
    <div ref={ref} className="agenda-previa-vizinho" aria-hidden="true" data-formato={visualizacao}>
      <strong className="agenda-previa-data">{dataEditorial(dia)}</strong>
      {!data ? (
        timeline ? (
          <EsqueletoTimeline onTentarDeNovo={() => void consulta.refetch()} />
        ) : (
          <EsqueletoAgenda linhas={4} onTentarDeNovo={() => void consulta.refetch()} />
        )
      ) : itens.length === 0 ? (
        <p className="mt-4 text-sm text-mute">Agenda livre</p>
      ) : timeline ? (
        <div className="mt-3">
          <AgendaTimeline
            previa
            dia={dia}
            fuso={data.fuso}
            itens={itens}
            horarios={data.horarios ?? []}
            selecionado={null}
            onSelecionar={nada}
            discreto={discreto}
            diaCompleto={diaCompleto}
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {itens.map((i) => (
            <li key={i.id} className="surface grid grid-cols-[56px_minmax(0,1fr)] gap-3 p-3">
              <span className="font-bold tabular-nums">{hora(i.inicio, data.fuso)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {nomeDaAgenda(i.cliente, discreto)}
                </span>
                <span className="block truncate text-xs text-mute">{i.servico}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Único ponto que redesenha durante o gesto: lê o vizinho do estado externo. */
/** Mantém os dois vizinhos montados antes do gesto; o toque só revela a página pronta. */
export function PreviaDoGesto({
  diaAtual,
  refAnterior,
  refProximo,
  ...props
}: {
  diaAtual: string;
  visualizacao?: FormatoDaPrevia;
  profissionalId: string | null;
  discreto: boolean;
  diaCompleto?: boolean;
  refAnterior?: Ref<HTMLDivElement>;
  refProximo?: Ref<HTMLDivElement>;
}) {
  return (
    <>
      <PreviaDiaVizinho
        dia={somarDias(diaAtual, -1)}
        {...(refAnterior ? { ref: refAnterior } : {})}
        {...props}
      />
      <PreviaDiaVizinho
        dia={somarDias(diaAtual, 1)}
        {...(refProximo ? { ref: refProximo } : {})}
        {...props}
      />
    </>
  );
}

/**
 * Dias vizinhos dentro da grade da Agenda (carrossel do celular): a coluna do dia anterior à
 * esquerda e a do próximo à direita, só com cartões e expediente. Ficam fora da vista até o
 * gesto lateral deslizar as camadas (`useGestoDia`).
 */
export function CamadasVizinhas({
  diaAtual,
  profissionalId,
  discreto,
  diaCompleto = false,
  mostrarProfissional = false,
  horariosDaSemana,
}: {
  diaAtual: string;
  profissionalId: string | null;
  discreto: boolean;
  diaCompleto?: boolean;
  /** Mesmo critério do dia aberto: senão o nome do profissional aparece de repente quando o dia assenta. */
  mostrarProfissional?: boolean;
  /** Horário semanal do negócio (o mesmo em todo dia): o vizinho já entra com as listras do fechado. */
  horariosDaSemana?: AgendaDia["horarios"] | undefined;
}) {
  // Os vizinhos estão fora da tela: na troca de dia o commit urgente renderiza só o dia que entra
  // e as duas camadas se atualizam logo depois, em prioridade baixa (menos trabalho no quadro do
  // soltar do dedo).
  const diaDasCamadas = useDeferredValue(diaAtual);
  return (
    <>
      <CamadaVizinha
        lado="anterior"
        dia={somarDias(diaDasCamadas, -1)}
        profissionalId={profissionalId}
        discreto={discreto}
        diaCompleto={diaCompleto}
        mostrarProfissional={mostrarProfissional}
        horariosDaSemana={horariosDaSemana}
      />
      <CamadaVizinha
        lado="proximo"
        dia={somarDias(diaDasCamadas, 1)}
        profissionalId={profissionalId}
        discreto={discreto}
        diaCompleto={diaCompleto}
        mostrarProfissional={mostrarProfissional}
        horariosDaSemana={horariosDaSemana}
      />
    </>
  );
}

function CamadaVizinha({
  lado,
  dia,
  profissionalId,
  discreto,
  diaCompleto,
  mostrarProfissional,
  horariosDaSemana,
}: {
  lado: "anterior" | "proximo";
  dia: string;
  profissionalId: string | null;
  discreto: boolean;
  diaCompleto: boolean;
  mostrarProfissional: boolean;
  horariosDaSemana: AgendaDia["horarios"] | undefined;
}) {
  const { data } = useQuery({
    ...opcoesAgendaDia(dia),
    refetchOnMount: false,
    staleTime: 15_000,
  });
  // Sem o dia carregado a página entra mesmo assim, com horas e linhas (como no modelo). Os mesmos atendimentos do
  // dia aberto, cancelados e remarcados inclusive: senão o cartão riscado surgia ao assentar e o vizinho se
  // rearrumava (vídeo do dono, 31/10).
  const itens = (data?.itens ?? [])
    .filter((i) => !profissionalId || i.profissionalId === profissionalId)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  // Bloqueios e intervalo do dia com a mesma regra do dia aberto (`bloqueiosDoDia` em AgendaOperacional): os da
  // equipe toda valem para qualquer filtro. Sem isso eles só apareciam quando o dia assentava.
  const nomeDoProf = (id: string | null) =>
    id ? (data?.profissionais?.find((p) => p.id === id)?.nome ?? null) : null;
  const bloqueios = (data?.bloqueiosDoDia ?? [])
    .filter((b) => !b.profissional_id || !profissionalId || b.profissional_id === profissionalId)
    .map((b) => ({
      id: b.id,
      inicio: b.inicio,
      fim: b.fim,
      motivo: b.motivo,
      profissional: nomeDoProf(b.profissional_id),
    }));
  return (
    <div className="agenda-dia-vizinha" data-lado={lado} aria-hidden="true">
      <MarcaDoLimiteDoDia className="agenda-dia-vizinha-pontos" />
      <AgendaTimeline
        previa
        emCamada
        dia={dia}
        fuso={data?.fuso}
        itens={itens}
        // Sem os dados do vizinho ainda, o horário semanal do dia aberto (é o mesmo): as listras do fechado não
        // aparecem do nada quando ele carrega (vídeo do dono, 31/10).
        horarios={data?.horarios ?? horariosDaSemana ?? []}
        bloqueiosDoDia={bloqueios}
        intervaloPersonalizado={data?.intervaloPersonalizado ?? null}
        selecionado={null}
        onSelecionar={nada}
        discreto={discreto}
        diaCompleto={diaCompleto}
        mostrarProfissional={mostrarProfissional}
      />
      {/* Os pontos do fim também vêm com a página: não podem aparecer do nada quando ela assenta. */}
      <MarcaDoLimiteDoDia className="agenda-dia-vizinha-pontos-fim" />
    </div>
  );
}
