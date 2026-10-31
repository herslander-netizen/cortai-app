import { useBuscaDaLista } from "./busca-da-lista";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import { getAgendaPeriodo, type AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";
import { termos } from "@/lib/segmentos";

import { corDaCategoria, glifoDoEstado } from "./cartao-figaro";
import { IconeDoEstado } from "./IconeDoEstado";
import { ProgressoDoAtendimento } from "./ListaAgenda";
import { diaNoFuso, estaAtrasado, hora, nomeDaAgenda, ROTULO_ESTADO } from "./tempo";

/** Dias por leitura: a lista abre com 60 dias e carrega mais ao chegar no fim. */
const DIAS_POR_BLOCO = 60;
/** Até onde a lista vai buscando (um ano a partir de hoje). */
const DIAS_NO_MAXIMO = 365;
/** Cancelados e faltas: escondidos até tocar em "Mostrar cancelados". */
const FORA_DA_LISTA = new Set(["cancelado", "nao_compareceu", "remarcado"]);

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export function tituloDoDia(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  const numero = data.getUTCDate();
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(data);
  const semana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(
    data,
  );
  // Figaro (`AgendaListDayHeader`): "d MMM" — "28 out.".
  const mesCurto = mes.slice(0, 3);
  return {
    curto: `${numero} de ${mes}`,
    abreviado: `${numero} ${mesCurto}.`,
    semana: semana.charAt(0).toUpperCase() + semana.slice(1),
  };
}

/** Busca por cliente, telefone (só os números), serviço ou profissional. */
export function correspondeABusca(item: AgendaItem, busca: string) {
  const termo = semAcento(busca.trim());
  if (!termo) return true;
  const digitos = termo.replace(/\D/g, "");
  if (digitos.length >= 3 && (item.telefone ?? "").replace(/\D/g, "").includes(digitos))
    return true;
  return [item.cliente, item.servico, item.profissional].some((campo) =>
    semAcento(campo).includes(termo),
  );
}

/** Valor curto como no Figaro ("R$ 50", e só mostra centavos quando há). */
function valorCurto(centavos: number) {
  return centavos % 100 === 0 ? brl(centavos).replace(/,00$/, "") : brl(centavos);
}

/** Domingo da semana do dia (a lista busca desde ele, para mostrar os dias desta semana que já passaram). */
export function inicioDaSemana(dia: string) {
  const data = new Date(`${dia}T12:00:00Z`);
  return new Date(data.getTime() - data.getUTCDay() * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Como no Figaro (`populatedAgendaDays`, foto do dono, 31/10): do primeiro dia com atendimento (desta semana, ou
 * hoje) até o último, passando por todos os dias do meio, inclusive os vazios ("Livre" + "Nada marcado"). Com busca,
 * só os dias que têm resultado.
 */
export function diasDaLista(
  grupos: { dia: string; itens: AgendaItem[] }[],
  hoje: string,
  comBusca: boolean,
) {
  if (comBusca || grupos.length === 0) return grupos;
  const porDia = new Map(grupos.map((g) => [g.dia, g.itens]));
  const primeiro = grupos[0]!.dia < hoje ? grupos[0]!.dia : hoje;
  const ultimo = grupos[grupos.length - 1]!.dia > hoje ? grupos[grupos.length - 1]!.dia : hoje;
  const dias: { dia: string; itens: AgendaItem[] }[] = [];
  for (let n = 0; n <= Math.min(diasEntre(primeiro, ultimo), DIAS_NO_MAXIMO); n += 1) {
    const dia = new Date(Date.parse(`${primeiro}T12:00:00Z`) + n * 86_400_000)
      .toISOString()
      .slice(0, 10);
    dias.push({ dia, itens: porDia.get(dia) ?? [] });
  }
  return dias;
}

/** Agrupa por dia (no fuso do negócio), já em ordem de horário. */
export function agruparPorDia(itens: AgendaItem[], fuso: string) {
  const grupos = new Map<string, AgendaItem[]>();
  for (const item of [...itens].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const dia = diaNoFuso(item.inicio, fuso);
    const lista = grupos.get(dia);
    if (lista) lista.push(item);
    else grupos.set(dia, [item]);
  }
  return [...grupos.entries()].map(([dia, doDia]) => ({ dia, itens: doDia }));
}

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
  const [comCancelados, setComCancelados] = useState(false);

  const periodo = useInfiniteQuery({ ...opcoesAgendaPeriodo(hoje), refetchInterval: 60_000 });

  const todos = useMemo(
    () =>
      (periodo.data?.pages ?? [])
        .flatMap((pagina) => pagina.itens)
        .filter((item) => !profissionalId || item.profissionalId === profissionalId),
    [periodo.data, profissionalId],
  );
  const cancelados = todos.filter((item) => FORA_DA_LISTA.has(item.status)).length;
  const visiveis = todos.filter(
    (item) => (comCancelados || !FORA_DA_LISTA.has(item.status)) && correspondeABusca(item, busca),
  );
  const grupos = diasDaLista(
    agruparPorDia(visiveis, periodo.data?.pages[0]?.fuso ?? fuso),
    hoje,
    Boolean(busca.trim()),
  );

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
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
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
  }, [hasNextPage]);

  return (
    <div className="agenda-lista-periodo" data-sem-gesto-dia>
      {!periodo.data && !periodo.isError ? (
        // Os pontinhos são só da linha do tempo (decisão do dono, 23/10): aqui o espaço fica reservado, sem
        // animação, e o leitor de tela ouve o estado.
        <div className="min-h-64" aria-busy role="status">
          <span className="sr-only">Carregando a lista</span>
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
        grupos.map(({ dia, itens }, g) => {
          const titulo = tituloDoDia(dia);
          const contam = itens.filter((item) => !FORA_DA_LISTA.has(item.status));
          const total = contam.reduce((soma, item) => soma + (item.valor_centavos ?? 0), 0);
          const ehHoje = dia === hoje;
          return (
            <section
              key={dia}
              className="agenda-lista-dia"
              aria-label={`${titulo.curto} ${titulo.semana}`}
            >
              <header className="agenda-lista-dia-titulo" data-hoje-dia={ehHoje || undefined}>
                <h3>
                  <strong>{titulo.abreviado}</strong>
                  <span>{titulo.semana}</span>
                  {ehHoje ? <span data-hoje>Hoje</span> : null}
                </h3>
                <span className="agenda-lista-dia-resumo">
                  {contam.length
                    ? `${contam.length} ${contam.length === 1 ? "atendimento" : "atendimentos"} · ${valorCurto(total)}`
                    : "Livre"}
                </span>
              </header>
              {itens.length === 0 ? (
                <div className="agenda-lista-linha">
                  <span aria-hidden />
                  <p className="agenda-lista-vazio">
                    <CalendarX aria-hidden />
                    Nada marcado
                  </p>
                </div>
              ) : null}
              <ul>
                {itens.map((item, i) => {
                  const nome = nomeDaAgenda(item.cliente, discreto);
                  const atrasado = ehHoje && estaAtrasado(item, agora);
                  const estado =
                    item.status === "na_cadeira"
                      ? termos(segmento).statusAtendimento
                      : (ROTULO_ESTADO[item.status] ?? item.status);
                  const cascata = g === 0 && i < 6;
                  return (
                    <li
                      key={item.id}
                      className={`agenda-lista-linha ${cascata ? "mov-item-cascata" : ""}`}
                      style={cascata ? { animationDelay: `${i * 30}ms` } : undefined}
                    >
                      <span className="agenda-lista-hora" aria-hidden>
                        <strong>{hora(item.inicio, fuso)}</strong>
                        <span>{item.duracaoMin} min</span>
                      </span>
                      <div className="min-w-0">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`${titulo.curto} ${hora(item.inicio, fuso)}, ${nome}, ${item.servico}, ${estado}`}
                          aria-pressed={selecionado === item.id}
                          className={`agenda-lista-cartao agenda-timeline-${item.status} ${item.confirmadoEm && item.status === "agendado" ? "agenda-timeline-confirmado" : ""} ${item.encaixe && item.status === "agendado" ? "agenda-timeline-encaixe" : ""} ${selecionado === item.id ? "agenda-lista-cartao-selecionado" : ""}`}
                          style={{
                            ["--cor-categoria" as string]: corDaCategoria(item.categoriaIndice),
                          }}
                          onClick={() => onAbrir(item)}
                        >
                          {/* Figaro (`AgendaListRow`): serviço em destaque, cliente embaixo e a linha de
                              detalhes (categoria, profissional, valor) separada por bolinhas. */}
                          <span className="agenda-lista-cartao-topo">
                            <strong className={item.status === "cancelado" ? "line-through" : ""}>
                              {item.servico}
                            </strong>
                            <IconeDoEstado glifo={glifoDoEstado(item, atrasado)} />
                          </span>
                          <span className="agenda-lista-servico">{nome}</span>
                          <span className="agenda-lista-detalhe">
                            {[
                              item.categoria?.trim() || null,
                              mostrarProfissional ? item.profissional : null,
                              item.valor_centavos ? brl(item.valor_centavos) : null,
                              atrasado ? "Atrasado" : null,
                            ]
                              .filter((parte): parte is string => Boolean(parte))
                              .map((parte, k) => (
                                <Fragment key={k}>
                                  {k > 0 ? <i aria-hidden className="agenda-lista-ponto" /> : null}
                                  {parte}
                                </Fragment>
                              ))}
                          </span>
                          {ehHoje && item.status === "na_cadeira" ? (
                            <ProgressoDoAtendimento item={item} agora={agora} />
                          ) : null}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      {cancelados > 0 ? (
        <Button
          variant="ghost"
          className="mt-2 min-h-12 w-full"
          aria-expanded={comCancelados}
          onClick={() => setComCancelados((v) => !v)}
        >
          {comCancelados ? "Esconder cancelados" : `Mostrar cancelados (${cancelados})`}
        </Button>
      ) : null}
      {hasNextPage ? (
        <Button
          variant="ghost"
          className="mt-2 min-h-12 w-full"
          loading={isFetchingNextPage}
          onClick={() => void buscarMais.current()}
        >
          Ver mais dias
        </Button>
      ) : null}
      <div ref={fim} aria-hidden />
      {grupos.length > 0 ? (
        <p className="mt-3 text-center text-xs text-mute" role="note">
          Toque no cartão para ver opções, remarcar ou cancelar
        </p>
      ) : null}
    </div>
  );
}
