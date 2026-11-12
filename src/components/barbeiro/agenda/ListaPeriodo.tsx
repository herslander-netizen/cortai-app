import { useBuscaDaLista } from "./busca-da-lista";

export {
  agruparPorDia,
  correspondeABusca,
  diasDaLista,
  inicioDaSemana,
  tituloDoDia,
} from "./lista-periodo-regras";
import { infiniteQueryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDown, Eye, EyeOff, Hand } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useAgora } from "@/hooks/useAgora";
import { getProximoDiaDaAgenda } from "@/lib/agenda-proximo.functions";
import { esperaDoDia } from "@/lib/lista-espera-agenda";
import { getEsperaDaAgenda } from "@/lib/lista-espera-agenda.functions";
import { getAgendaPeriodo, type AgendaItem } from "@/lib/barbeiro.functions";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";

import { FolhaDaEspera } from "./EsperaNaLista";
import { DiaDaLista } from "./DiaDaLista";
import { useMostrarCancelados } from "./useMostrarCancelados";
import {
  agruparPorDia,
  correspondeABusca,
  diasDaLista,
  diasEntre,
  DIAS_NO_MAXIMO,
  inicioDaSemana,
  tituloDoDia,
  valorCurto,
} from "./lista-periodo-regras";
import { OndaDaLista } from "./HorarioDaLista";
import { DIAS_INICIAIS, proximaJanelaDaLista, janelaDaLista } from "./janela-da-lista";

/** Dias por leitura: a lista abre com 60 dias e carrega mais ao chegar no fim. */
const DIAS_POR_BLOCO = 60;
/** Cancelados e faltas: escondidos até tocar em "Mostrar cancelados". */
const FORA_DA_LISTA = new Set(["cancelado", "nao_compareceu", "remarcado"]);

/**
 * Consulta da lista de períodos, compartilhada com a pré-busca da Agenda: ao trocar da linha do tempo para
 * os cartões, os dados já estão prontos e a lista não passa por um carregando.
 */
export function opcoesAgendaPeriodo(hoje: string) {
  return infiniteQueryOptions({
    queryKey: ["agenda-periodo", hoje],
    initialPageParam: inicioDaSemana(hoje),
    queryFn: ({ pageParam }) => getAgendaPeriodo({ data: { de: pageParam, dias: DIAS_POR_BLOCO } }),
    getNextPageParam: (ultima: { ate: string }) =>
      diasEntre(hoje, ultima.ate) < DIAS_NO_MAXIMO ? ultima.ate : undefined,
    staleTime: 15_000,
  });
}

/**
 * Modo lista do celular, como no vídeo do dono: os atendimentos de hoje em diante, separados por
 * dia e em ordem, para achar fácil o cliente e o dia marcado. Hoje mantém as ações da lista do dia.
 */
export function ListaPeriodo({
  hoje,
  fuso,
  profissionalId,
  mostrarProfissional,
  discreto,
  selecionado,
  onAbrir,
}: {
  hoje: string;
  fuso: string;
  profissionalId: string | null;
  mostrarProfissional: boolean;
  discreto: boolean;
  selecionado: string | null;
  onAbrir: (item: AgendaItem) => void;
}) {
  const agora = useAgora();
  const segmento = useSegmentoDoPainel();
  const { texto: busca } = useBuscaDaLista();
  // Preferência compartilhada com a linha do tempo (dono, 06/11): escondidos por padrão nos dois modos.
  const [comCancelados, setComCancelados] = useMostrarCancelados();

  const periodo = useInfiniteQuery({ ...opcoesAgendaPeriodo(hoje), refetchInterval: 60_000 });
  // "Ver mais dias" só quando há atendimento depois do que já foi carregado (dono, 06/11: "aparece sem ser
  // necessário"). Enquanto confere, fica escondido; se a conferência falhar, aparece (nunca esconde dados).
  const ateCarregado = periodo.data?.pages.at(-1)?.ate ?? null;
  const proximo = useQuery({
    queryKey: ["agenda-proximo-dia", ateCarregado, profissionalId],
    queryFn: () => getProximoDiaDaAgenda({ data: { depoisDe: ateCarregado!, profissionalId } }),
    enabled: Boolean(periodo.hasNextPage && ateCarregado),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const proximoDia = proximo.data?.dia ?? null;
  // Lista de espera na Agenda (dono, 06/11): só leitura; se não der para ler, a espera simplesmente não aparece.
  const espera = useQuery({
    queryKey: ["agenda-espera"],
    queryFn: () => getEsperaDaAgenda(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const [diaDaEspera, setDiaDaEspera] = useState<string | null>(null);
  const haMais = Boolean(periodo.hasNextPage) && (proximo.isError || proximoDia !== null);

  const todos = useMemo(
    () =>
      (periodo.data?.pages ?? [])
        .flatMap((pagina) => pagina.itens)
        .filter((item) => !profissionalId || item.profissionalId === profissionalId),
    [periodo.data, profissionalId],
  );
  // Não reconstruir filtros, ordenação e até 365 agrupamentos a cada tick do
  // relógio ou re-render dos controles. Na entrada dos Cards esses cálculos
  // estavam competindo com a animação na thread principal do Android.
  const cancelados = useMemo(
    () => todos.filter((item) => FORA_DA_LISTA.has(item.status)).length,
    [todos],
  );
  const visiveis = useMemo(
    () =>
      todos.filter(
        (item) => (comCancelados || !FORA_DA_LISTA.has(item.status)) && correspondeABusca(item, busca),
      ),
    [todos, comCancelados, busca],
  );
  const grupos = useMemo(
    () =>
      diasDaLista(
        agruparPorDia(visiveis, periodo.data?.pages[0]?.fuso ?? fuso),
        hoje,
        Boolean(busca.trim()),
      ),
    [visiveis, periodo.data?.pages, fuso, hoje, busca],
  );

  // Os dados dos 60 dias continuam em cache. Montar todos os Cards no primeiro
  // toque, porém, bloqueava o primeiro quadro da animação. Criar só a janela
  // inicial e acrescentar as seguintes quando a pessoa se aproxima do fim.
  const [limiteVisivel, setLimiteVisivel] = useState(DIAS_INICIAIS);
  const diasVisiveis = useMemo(
    () => janelaDaLista(grupos, limiteVisivel),
    [grupos, limiteVisivel],
  );
  const temDiasAbaixo = limiteVisivel < grupos.length;
  const gatilhoMaisDias = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = gatilhoMaisDias.current;
    if (!elemento || !temDiasAbaixo) return;
    if (typeof IntersectionObserver === "undefined") {
      setLimiteVisivel(grupos.length);
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((entrada) => entrada.isIntersecting)) return;
        setLimiteVisivel((atual) => proximaJanelaDaLista(atual, grupos.length));
      },
      { rootMargin: "700px 0px" },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [temDiasAbaixo, grupos.length]);

  // Ao mudar a busca ou filtro, recomeçar a janela no topo dos novos resultados.
  useEffect(() => setLimiteVisivel(DIAS_INICIAIS), [busca, profissionalId, comCancelados]);

  // Carrega o próximo bloco de dias quando o fim da lista aparece **por rolagem**. O observador lê o estado por
  // referência (recriá-lo a cada carregamento puxava bloco após bloco). Se a lista cabe na tela não há o que
  // rolar: nada é buscado sozinho, e "Ver mais dias" cobre esse caso (sem pontinhos encadeados).
  const fim = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = periodo;
  const carregando = useRef(false);
  carregando.current = isFetchingNextPage;
  const buscarMais = useRef(fetchNextPage);
  buscarMais.current = fetchNextPage;
  useEffect(() => {
    const el = fim.current;
    if (!el || !haMais || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting) || carregando.current) return;
        if (document.documentElement.scrollHeight <= window.innerHeight + 8) return;
        void buscarMais.current();
      },
      { rootMargin: "400px 0px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [haMais]);

  return (
    <div className="agenda-lista-periodo" data-sem-gesto-dia>
      {!periodo.data && !periodo.isError ? (
        // Evitar um painel vazio entre Timeline e Cards enquanto os dados chegam.
        // Esqueleto ilustrativo, sem criar atendimentos fictícios.
        <div className="min-h-64" aria-busy role="status">
          <span className="sr-only">Carregando a lista</span>
          <div className="space-y-3 pt-2 motion-safe:animate-pulse" aria-hidden="true">
            {[0, 1, 2].map((indice) => (
              <div key={indice} className="agenda-lista-linha">
                <div className="flex flex-col items-end gap-2 pt-4">
                  <span className="h-3 w-10 rounded-full bg-[var(--mute)] opacity-30" />
                  <span className="h-2 w-7 rounded-full bg-[var(--mute)] opacity-20" />
                </div>
                <div className="agenda-lista-cartao agenda-lista-cartao min-h-[78px] gap-2">
                  <span className="h-3 w-2/3 rounded-full bg-[var(--mute)] opacity-30" />
                  <span className="h-2.5 w-1/2 rounded-full bg-[var(--mute)] opacity-20" />
                  <span className="h-2 w-3/4 rounded-full bg-[var(--mute)] opacity-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !periodo.data ? (
        <div className="py-8 text-center text-sm text-mute" role="alert">
          Não deu para carregar a lista.{" "}
          <Button variant="link" className="h-auto p-0" onClick={() => void periodo.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : grupos.length === 0 ? (
        <p className="py-8 text-center text-sm text-mute" role="status">
          {busca.trim()
            ? `Nada encontrado para “${busca.trim()}”.`
            : "Nenhum atendimento marcado de hoje em diante."}
        </p>
      ) : (
        diasVisiveis.map(({ dia, itens }, g) => {
          const titulo = tituloDoDia(dia);
          const contam = itens.filter((item) => !FORA_DA_LISTA.has(item.status));
          const total = contam.reduce((soma, item) => soma + (item.valor_centavos ?? 0), 0);
          const ehHoje = dia === hoje;
          return (
            <Fragment key={dia}>
              {g > 0 ? <OndaDaLista /> : null}
              <DiaDaLista
                dia={dia}
                itens={itens}
                titulo={titulo}
                resumo={
                  contam.length
                    ? `${contam.length} ${contam.length === 1 ? "atendimento" : "atendimentos"} · ${valorCurto(total)}`
                    : "Livre"
                }
                ehHoje={ehHoje}
                primeiro={g === 0}
                fuso={fuso}
                agora={agora}
                comBusca={Boolean(busca.trim())}
                segmento={segmento}
                discreto={discreto}
                mostrarProfissional={mostrarProfissional}
                selecionado={selecionado}
                naEspera={esperaDoDia(espera.data?.pessoas ?? [], dia, hoje).length}
                onEspera={() => setDiaDaEspera(dia)}
                ofertas={espera.data?.ofertasPorAgendamento}
                onAbrir={onAbrir}
              />
            </Fragment>
          );
        })
      )}

      {temDiasAbaixo && periodo.data ? (
        <div ref={gatilhoMaisDias} className="h-px" aria-hidden="true" />
      ) : null}

      {/* Fim da lista (dono, 31/10 e 06/11): "Ver mais dias" discreto na onda, o filtro de cancelados como chip e a
          dica como legenda. */}
      {haMais ? (
        // Discreto, na mesma onda que separa os dias (dono, 06/11: "esse botão azul é feio").
        <OndaDaLista>
          <Button
            variant="text"
            size="sm"
            className="agenda-lista-onda-acao"
            loading={isFetchingNextPage}
            onClick={() => void buscarMais.current()}
          >
            {proximoDia ? `Ver mais · ${tituloDoDia(proximoDia).abreviado}` : "Ver mais dias"}
            <ChevronDown aria-hidden />
          </Button>
        </OndaDaLista>
      ) : null}
      <div ref={fim} aria-hidden />
      {diaDaEspera ? (
        <FolhaDaEspera
          aberta
          onAberta={(aberta) => {
            if (!aberta) setDiaDaEspera(null);
          }}
          tituloDoDia={`${tituloDoDia(diaDaEspera).semana}, ${tituloDoDia(diaDaEspera).abreviado}`}
          pessoas={esperaDoDia(espera.data?.pessoas ?? [], diaDaEspera, hoje)}
          fuso={fuso}
        />
      ) : null}
      {cancelados > 0 || grupos.length > 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 pb-2">
          {cancelados > 0 ? (
            <Chip
              selecionado={comCancelados}
              aria-label={
                comCancelados
                  ? "Esconder cancelados"
                  : `Mostrar ${cancelados} ${cancelados === 1 ? "cancelado" : "cancelados"}`
              }
              onClick={() => setComCancelados(!comCancelados)}
            >
              {comCancelados ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              Cancelados · {cancelados}
            </Chip>
          ) : null}
          {grupos.length > 0 ? (
            <p
              className="flex items-center gap-1.5 text-[12px] leading-4 text-[var(--figaro-hint,var(--mute))]"
              role="note"
            >
              <Hand aria-hidden className="size-3.5 shrink-0" />
              Toque no cartão para remarcar ou cancelar
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
