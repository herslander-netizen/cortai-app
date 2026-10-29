import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Fragment, useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl, dataCurta } from "@/lib/format";
import { getClientesCRM, type ClienteCRM } from "@/lib/crescimento.functions";
import { EsqueletoLista, EsqueletoMetricas } from "@/components/layout/Esqueleto";
import { useDebounce } from "@/hooks/useMovimento";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { agruparPorLetra } from "@/components/barbeiro/agenda/ficha-regras";
import { AvatarDeIniciais } from "@/components/ui/avatar-iniciais";
import {
  contarClientesCRM,
  filtrarClientesCRM,
  SEGMENTOS_CLIENTES,
  type SegmentoClientesCRM,
} from "@/lib/segmentacao-clientes";

export const Route = createFileRoute("/barbeiro/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Flow" },
      {
        name: "description",
        content: "Frequência, gasto médio, preferências e quem precisa voltar.",
      },
      { property: "og:title", content: "Clientes — Flow" },
      {
        property: "og:description",
        content: "Seu CRM, com dados reais de cada cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientesPage,
});

/** Selos de estado como a `FigarooStatusPill` (spec 1 §2.4): pares de container e texto do tema. */
const ROTULOS: Record<ClienteCRM["status"], { texto: string; classe: string }> = {
  novo: {
    texto: "Novo",
    classe: "bg-[var(--figaro-primary-container)] text-[var(--figaro-on-primary-container)]",
  },
  recorrente: {
    texto: "Recorrente",
    classe: "bg-[var(--figaro-success-container)] text-[var(--figaro-on-success-container)]",
  },
  em_retorno: {
    texto: "Em retorno",
    classe: "bg-[var(--figaro-warning-container)] text-[var(--figaro-on-warning-container)]",
  },
  inativo: {
    texto: "Inativo",
    classe: "bg-[var(--figaro-surface-container-highest)] text-[var(--figaro-on-surface-variant)]",
  },
};

function whatsappLink(telefone: string, nome: string, barbearia = true, servico?: string | null) {
  const numero = telefone.replace(/\D/g, "");
  const texto = encodeURIComponent(
    barbearia
      ? `Olá, ${nome}! Faz um tempinho desde seu último corte. Quer marcar um horário?`
      : `Olá, ${nome}! Já está na hora de ${servico ? `repetir ${servico.toLocaleLowerCase("pt-BR")}` : "voltar"}. Quer marcar um horário?`,
  );
  return `https://wa.me/55${numero}?text=${texto}`;
}

function ClientesPage() {
  const consulta = useQuery({
    queryKey: ["clientes-crm"],
    queryFn: () => getClientesCRM(),
  });
  const { data, isLoading } = consulta;
  const [busca, setBusca] = useState("");
  const [soHoraDeVoltar, setSoHoraDeVoltar] = useState(false);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<SegmentoClientesCRM>("todos");
  const segmentoClientes = data?.tenant.segmento ?? "outro";
  const ehBarbearia = segmentoClientes === "barbearia";
  const buscaAdiada = useDebounce(busca, 250);

  const clientes = data?.clientes ?? [];
  const lista = filtrarClientesCRM(clientes, {
    busca: buscaAdiada,
    segmento: segmentoSelecionado,
    soHoraDeVoltar,
  });
  const contagens = contarClientesCRM(clientes);
  const totalHoraDeVoltar = clientes.filter((c) => c.horaDeVoltar).length;

  return (
    <Screen title="Clientes" subtitle="Histórico, frequência e quem está na hora de voltar.">
      {data && data.trazerDeVolta.length > 0 ? (
        <section
          data-guia="clientes-retorno"
          className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5"
        >
          <p className="text-xs font-semibold uppercase text-gold">Voltaí</p>
          <p className="mt-1 text-sm font-semibold text-paper">
            {ehBarbearia ? "Seu cliente corta. Ganha. Volta." : "Cliente vem. Ganha. Volta."}
          </p>
          <p className="mt-1 text-xs text-mute2">
            Quem passou do intervalo habitual e merece um chamado.
          </p>
          <ul className="mt-4 space-y-3">
            {data.trazerDeVolta.slice(0, 5).map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <Link
                    to="/barbeiro/clientes/$id"
                    params={{ id: c.id }}
                    className="block truncate text-[15px] font-semibold leading-5 text-paper"
                  >
                    {c.nome}
                  </Link>
                  <p className="mt-0.5 text-xs text-mute">
                    {c.diasDesdeUltima} dias sem vir · costuma voltar a cada{" "}
                    {c.intervaloMedioDias ?? 30} dias
                  </p>
                </div>
                {c.telefone ? (
                  <a
                    href={whatsappLink(c.telefone, c.nome, ehBarbearia, c.retornoServico)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Chamar ${c.nome} no WhatsApp`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]"
                  >
                    <MessageCircle size={16} />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Resumo dos clientes">
        <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-3">
          <p className="text-xs text-mute2">Ativos</p>
          <p className="mt-1 text-lg font-bold text-paper">
            {data?.clientes.filter((c) => c.status !== "inativo").length ?? "—"}
          </p>
        </div>
        <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-3">
          <p className="text-xs text-mute2">Inativos</p>
          <p className="mt-1 text-lg font-bold text-paper">
            {data?.clientes.filter((c) => c.status === "inativo").length ?? "—"}
          </p>
        </div>
        <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-3">
          <p className="text-xs text-mute2">Voltaí</p>
          <p className="mt-1 text-lg font-bold text-[var(--figaro-primary,var(--primary))]">
            {data?.trazerDeVolta.length ?? "—"}
          </p>
        </div>
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar cliente"
        className="field-control mt-6 w-full"
      />
      <section className="mt-4" aria-label="Segmentação de clientes">
        <p className="text-xs font-semibold text-mute2">Segmento de clientes</p>
        <div
          role="group"
          aria-label="Filtrar clientes por segmento"
          className="mt-2 flex flex-wrap gap-2"
        >
          {SEGMENTOS_CLIENTES.map((opcao) => (
            <Chip
              key={opcao.valor}
              selecionado={segmentoSelecionado === opcao.valor}
              onClick={() => setSegmentoSelecionado(opcao.valor)}
            >
              {opcao.texto} ({contagens[opcao.valor]})
            </Chip>
          ))}
          {/* Filtro extra no mesmo grupo de chips (FilterChip com ícone, como no Figaro). */}
          <Chip selecionado={soHoraDeVoltar} onClick={() => setSoHoraDeVoltar((v) => !v)}>
            <CalendarClock aria-hidden /> Hora de voltar
            {totalHoraDeVoltar ? ` (${totalHoraDeVoltar})` : ""}
          </Chip>
        </div>
      </section>

      {isLoading ? (
        <EsqueletoLista linhas={6} onTentarDeNovo={() => void consulta.refetch()} />
      ) : null}
      {consulta.isError ? (
        <div className="surface mt-4 p-5">
          <p className="text-sm text-paper">Não conseguimos carregar seus clientes agora.</p>
          <Button variant="outline" className="mt-4" onClick={() => void consulta.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {data && lista.length === 0 ? <EmptyState text="Nenhum cliente encontrado." /> : null}
      {/* Lista como no Figaro (`ClientGroup` + `FigarooListRow`): grupos por letra, avatar de 40 dp, nome em
          15/20 SemiBold, apoio em bodyMedium e o estado num selo. */}
      <div data-guia="clientes-lista" className="mt-4 space-y-4">
        {agruparPorLetra(lista).map(({ letra, itens }) => (
          <section key={letra} aria-label={`Clientes com ${letra}`}>
            <h2 className="px-4 pb-2 text-sm font-semibold text-mute2">{letra}</h2>
            <GrupoDeLinhas>
              {itens.map((c) => {
                const rotulo = ROTULOS[c.status];
                const visitas =
                  c.visitas > 0
                    ? `${c.visitas} ${c.visitas === 1 ? "visita" : "visitas"} · última em ${c.ultimaVisita ? dataCurta(c.ultimaVisita) : "—"}`
                    : "Ainda sem atendimentos";
                const frequencia = c.intervaloMedioDias
                  ? `a cada ${c.intervaloMedioDias} dias`
                  : null;
                const retorno =
                  c.horaDeVoltar && c.retornoEm
                    ? `Retorno sugerido: ${dataCurta(c.retornoEm)}${c.retornoServico ? ` (${c.retornoServico})` : ""}`
                    : null;
                return (
                  <Fragment key={c.id}>
                    <LinhaDeConfiguracao
                      para="/barbeiro/clientes/$id"
                      parametros={{ id: c.id }}
                      lider={<AvatarDeIniciais nome={c.nome} />}
                      titulo={
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate">{c.nome}</span>
                          <span
                            className={`inline-flex min-h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold leading-4 ${rotulo.classe}`}
                          >
                            {rotulo.texto}
                          </span>
                        </span>
                      }
                      suporte={
                        <>
                          <span className="block truncate">
                            {[visitas, frequencia].filter(Boolean).join(" · ")}
                          </span>
                          {c.gastoMedioCentavos > 0 || c.servicoPreferido ? (
                            <span className="block truncate text-mute2">
                              {[
                                c.gastoMedioCentavos > 0
                                  ? `${brl(c.gastoMedioCentavos)} em média`
                                  : null,
                                c.servicoPreferido,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </>
                      }
                      fim={
                        c.saldoCentavos < 0 ? (
                          <span className="font-semibold text-brick">
                            {brl(Math.abs(c.saldoCentavos))}
                          </span>
                        ) : c.creditos > 0 ? (
                          <span className="text-xs">
                            {c.creditos} {c.creditos === 1 ? "crédito" : "créditos"}
                          </span>
                        ) : undefined
                      }
                    />
                    {retorno ? (
                      <li className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-xs text-mute">
                        <span className="min-w-0 truncate">{retorno}</span>
                        {c.telefone ? (
                          <a
                            href={whatsappLink(c.telefone, c.nome, ehBarbearia, c.retornoServico)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-12 shrink-0 items-center gap-1.5 font-semibold text-[var(--figaro-primary,var(--primary))]"
                            aria-label={`Chamar ${c.nome} no WhatsApp`}
                          >
                            <MessageCircle size={15} aria-hidden /> Chamar
                          </a>
                        ) : null}
                      </li>
                    ) : null}
                  </Fragment>
                );
              })}
            </GrupoDeLinhas>
          </section>
        ))}
      </div>
    </Screen>
  );
}
