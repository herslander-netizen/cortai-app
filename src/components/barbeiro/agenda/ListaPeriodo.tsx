import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgora } from "@/hooks/useAgora";
import { getAgendaPeriodo, type AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { useSegmentoDoPainel } from "@/lib/segmento-contexto";
import { termos } from "@/lib/segmentos";

import { corDaCategoria, glifoDoEstado } from "./cartao-figaro";
import { IconeDoEstado } from "./IconeDoEstado";
import { ProgressoDoAtendimento } from "./ListaAgenda";
import { MarcaDoLimiteDoDia } from "./SemanaDoTopo";
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
  return { curto: `${numero} de ${mes}`, semana: semana.charAt(0).toUpperCase() + semana.slice(1) };
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
  const [busca, setBusca] = useState("");
  const [comCancelados, setComCancelados] = useState(false);

  const periodo = useInfiniteQuery({
    queryKey: ["agenda-periodo", hoje],
    initialPageParam: hoje,
    queryFn: ({ pageParam }) => getAgendaPeriodo({ data: { de: pageParam, dias: DIAS_POR_BLOCO } }),
    getNextPageParam: (ultima) =>
      diasEntre(hoje, ultima.ate) < DIAS_NO_MAXIMO ? ultima.ate : undefined,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

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
  const grupos = agruparPorDia(visiveis, periodo.data?.pages[0]?.fuso ?? fuso);

  // Carrega o próximo bloco de dias quando o fim da lista aparece.
  const fim = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = periodo;
  useEffect(() => {
    const el = fim.current;
    if (!el || !hasNextPage || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "400px 0px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="agenda-lista-periodo" data-sem-gesto-dia>
      <label className="agenda-lista-busca">
        <Search aria-hidden className="size-4 shrink-0 text-mute" />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente, telefone ou serviço"
          aria-label="Buscar atendimento"
          className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </label>

      {!periodo.data && !periodo.isError ? (
        <MarcaDoLimiteDoDia className="my-6" carregando />
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
              <header className="agenda-lista-dia-titulo">
                <h3>
                  <strong>{titulo.curto}</strong>
                  {ehHoje ? (
                    <>
                      <span data-hoje className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink">
                        Hoje
                      </span>
                      <span>{titulo.semana}</span>
                    </>
                  ) : (
                    <span>{titulo.semana}</span>
                  )}
                </h3>
                <span className="agenda-lista-dia-resumo">
                  {contam.length} {contam.length === 1 ? "atendimento" : "atendimentos"}
                  {` · ${brl(total)}`}
                </span>
              </header>
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
                          <span className="agenda-lista-cartao-topo">
                            <strong className={item.status === "cancelado" ? "line-through" : ""}>
                              {nome}
                            </strong>
                            <IconeDoEstado glifo={glifoDoEstado(item, atrasado)} />
                          </span>
                          <span className="agenda-lista-servico">{item.servico}</span>
                          <span className="agenda-lista-detalhe">
                            {[
                              mostrarProfissional ? item.profissional : null,
                              item.valor_centavos ? brl(item.valor_centavos) : null,
                              atrasado ? "Atrasado" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
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
      <div ref={fim} aria-hidden />
      {isFetchingNextPage ? <MarcaDoLimiteDoDia className="my-4" carregando /> : null}
      {grupos.length > 0 ? (
        <p className="mt-3 text-center text-xs text-mute" role="note">
          Toque no cartão para ver opções, remarcar ou cancelar
        </p>
      ) : null}
    </div>
  );
}
