import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, Filter, Receipt, Scissors, UserRound, Wallet } from "lucide-react";
import { useState } from "react";

import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { LinhaDeOpcoes } from "@/components/ui/formulario/LinhaDeOpcoes";
import { GrupoDeLinhas } from "@/components/ui/formulario/LinhasDeConfiguracao";
import { brl, dataHoraLonga } from "@/lib/format";
import {
  listarHistoricoDeAtendimentos,
  listarHistoricoDeVendas,
  type AtendimentoDoHistorico,
  type VendaDoHistorico,
} from "@/lib/historico.functions";
import { PERIODOS, type PeriodoId } from "@/lib/historico-periodo";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import { Aviso } from "@/components/ui/aviso";
import { RepetirAtendimento } from "@/components/historico/RepetirAtendimento";

export const Route = createFileRoute("/barbeiro/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HistoricoPage,
});

const STATUS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "agendado", rotulo: "Agendado" },
  { valor: "finalizado", rotulo: "Finalizado" },
  { valor: "cancelado", rotulo: "Cancelado" },
  { valor: "nao_compareceu", rotulo: "Não compareceu" },
  { valor: "remarcado", rotulo: "Remarcado" },
] as const;
const ROTULO_DO_STATUS: Record<string, string> = {
  agendado: "Agendado",
  chegou: "Chegou",
  na_cadeira: "Em atendimento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  remarcado: "Remarcado",
  nao_compareceu: "Não compareceu",
};
const CANAIS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "manual", rotulo: "Manual" },
  { valor: "online", rotulo: "Online" },
] as const;
const FORMAS = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "fiado", rotulo: "Fiado" },
] as const;
const ROTULO_DA_FORMA: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  fiado: "Fiado",
};

type Aba = "atendimentos" | "vendas";

function HistoricoPage() {
  const [aba, setAba] = useState<Aba>("atendimentos");
  const [periodo, setPeriodo] = useState<PeriodoId>("ultimos30");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [status, setStatus] = useState<(typeof STATUS)[number]["valor"]>("todos");
  const [canal, setCanal] = useState<(typeof CANAIS)[number]["valor"]>("todos");
  const [profissionalId, setProfissionalId] = useState("todos");
  const [servicoId, setServicoId] = useState("todos");
  const [forma, setForma] = useState<(typeof FORMAS)[number]["valor"]>("todas");

  const personalizadoPronto = periodo !== "personalizado" || (de !== "" && ate !== "");
  const base = {
    periodo,
    ...(periodo === "personalizado" ? { de, ate } : {}),
  };
  const atendimentos = useInfiniteQuery({
    queryKey: ["historico-atendimentos", base, status, canal, profissionalId, servicoId],
    enabled: aba === "atendimentos" && personalizadoPronto,
    initialPageParam: 0,
    retry: false,
    queryFn: ({ pageParam }) =>
      listarHistoricoDeAtendimentos({
        data: {
          ...base,
          pagina: pageParam,
          status: status === "todos" ? [] : [status],
          ...(canal === "todos" ? {} : { canal }),
          ...(profissionalId === "todos" ? {} : { profissionalId }),
          ...(servicoId === "todos" ? {} : { servicoId }),
        },
      }),
    getNextPageParam: (ultima, todas) => (ultima.temMais ? todas.length : undefined),
  });
  const vendas = useInfiniteQuery({
    queryKey: ["historico-vendas", base, forma],
    enabled: aba === "vendas" && personalizadoPronto,
    initialPageParam: 0,
    retry: false,
    queryFn: ({ pageParam }) =>
      listarHistoricoDeVendas({
        data: { ...base, pagina: pageParam, ...(forma === "todas" ? {} : { forma }) },
      }),
    getNextPageParam: (ultima, todas) => (ultima.temMais ? todas.length : undefined),
  });
  const ativa = aba === "atendimentos" ? atendimentos : vendas;
  const opcoes = atendimentos.data?.pages[0];
  const profissionais = [
    { valor: "todos", rotulo: "Todos" },
    ...(opcoes?.profissionais ?? []).map((p) => ({ valor: p.id, rotulo: p.nome })),
  ];
  const servicos = [
    { valor: "todos", rotulo: "Todos" },
    ...(opcoes?.servicos ?? []).map((s) => ({ valor: s.id, rotulo: s.nome })),
  ];

  const itensAtendimento: AtendimentoDoHistorico[] =
    atendimentos.data?.pages.flatMap((p) => p.itens) ?? [];
  const itensVenda: VendaDoHistorico[] = vendas.data?.pages.flatMap((p) => p.itens) ?? [];
  const agora = Date.now();
  const total =
    aba === "atendimentos"
      ? itensAtendimento
          .filter((a) => a.status === "finalizado")
          .reduce((s, a) => s + a.valorCentavos, 0)
      : itensVenda.reduce((s, v) => s + v.valorCentavos, 0);
  const vazio = aba === "atendimentos" ? itensAtendimento.length === 0 : itensVenda.length === 0;

  const filtrosAtivos =
    aba === "atendimentos"
      ? [
          status !== "todos",
          canal !== "todos",
          profissionalId !== "todos",
          servicoId !== "todos",
        ].filter(Boolean).length
      : forma !== "todas"
        ? 1
        : 0;
  const limpar = () => {
    setStatus("todos");
    setCanal("todos");
    setProfissionalId("todos");
    setServicoId("todos");
    setForma("todas");
  };

  return (
    <Screen
      title="Histórico"
      subtitle="Atendimentos e vendas de qualquer período."
      voltarPara="/barbeiro/financeiro"
    >
      <OpcoesConectadas
        rotulo="Tipo de histórico"
        className="mb-4"
        valor={aba}
        opcoes={[
          { valor: "atendimentos", texto: "Atendimentos" },
          { valor: "vendas", texto: "Vendas" },
        ]}
        onChange={setAba}
      />

      <GrupoDeLinhas>
        <li>
          <LinhaDeOpcoes
            icone={CalendarRange}
            titulo="Período"
            tituloDaFolha="Período"
            opcoes={PERIODOS.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            valor={periodo}
            aoEscolher={setPeriodo}
          />
        </li>
        {periodo === "personalizado" ? (
          <li className="flex flex-wrap items-center gap-3 px-6 py-4">
            <label className="flex flex-1 flex-col gap-1 text-xs text-mute">
              De
              <input
                type="date"
                value={de}
                max={ate || undefined}
                onChange={(e) => setDe(e.target.value)}
                className="min-h-12 rounded-[12px] border-0 bg-[var(--figaro-surface-container,var(--ink2))] px-3 text-sm text-paper"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-mute">
              Até
              <input
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(e) => setAte(e.target.value)}
                className="min-h-12 rounded-[12px] border-0 bg-[var(--figaro-surface-container,var(--ink2))] px-3 text-sm text-paper"
              />
            </label>
            <p className="w-full text-xs text-mute">Escolha um período de até 1 ano.</p>
          </li>
        ) : null}
        {aba === "atendimentos" ? (
          <>
            <li>
              <LinhaDeOpcoes
                icone={Filter}
                titulo="Situação"
                tituloDaFolha="Situação"
                opcoes={STATUS}
                valor={status}
                aoEscolher={setStatus}
              />
            </li>
            <li>
              <LinhaDeOpcoes
                icone={Receipt}
                titulo="Canal"
                tituloDaFolha="Canal"
                opcoes={CANAIS}
                valor={canal}
                aoEscolher={setCanal}
              />
            </li>
            <li>
              <LinhaDeOpcoes
                icone={UserRound}
                titulo="Profissional"
                tituloDaFolha="Profissional"
                opcoes={profissionais}
                valor={profissionalId}
                aoEscolher={setProfissionalId}
              />
            </li>
            <li>
              <LinhaDeOpcoes
                icone={Scissors}
                titulo="Serviço"
                tituloDaFolha="Serviço"
                opcoes={servicos}
                valor={servicoId}
                aoEscolher={setServicoId}
              />
            </li>
          </>
        ) : (
          <li>
            <LinhaDeOpcoes
              icone={Wallet}
              titulo="Forma de pagamento"
              tituloDaFolha="Forma de pagamento"
              opcoes={FORMAS}
              valor={forma}
              aoEscolher={setForma}
            />
          </li>
        )}
      </GrupoDeLinhas>
      {filtrosAtivos > 0 ? (
        <Button variant="ghost" className="mt-2 min-h-11 self-start" onClick={limpar}>
          Limpar filtros ({filtrosAtivos})
        </Button>
      ) : null}

      {!personalizadoPronto ? (
        <p className="mt-6 text-sm text-mute">Escolha as duas datas para ver o histórico.</p>
      ) : ativa.isLoading ? (
        <EsqueletoLista onTentarDeNovo={() => void ativa.refetch()} />
      ) : ativa.isError ? (
        <div className="mt-6 space-y-3">
          <Aviso tom="acao">
            {ativa.error instanceof Error
              ? ativa.error.message
              : "Não consegui carregar o histórico agora."}
          </Aviso>
          <Button variant="outline" className="min-h-11" onClick={() => void ativa.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : vazio ? (
        <p className="mt-6 text-sm text-mute">
          {filtrosAtivos > 0
            ? "Nenhum resultado com esses filtros."
            : aba === "atendimentos"
              ? "Nenhum atendimento neste período."
              : "Nenhuma venda neste período."}
        </p>
      ) : (
        <>
          <section className="mt-6 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
            <p className="text-xs text-mute">
              {aba === "atendimentos" ? "Receita dos atendimentos finalizados" : "Total recebido"}
            </p>
            <p className="mt-1 text-[28px] font-bold leading-tight text-paper">{brl(total)}</p>
            {ativa.hasNextPage ? (
              <p className="mt-2 text-xs text-mute">Soma só do que já foi carregado.</p>
            ) : null}
          </section>
          <ul className="mt-3 space-y-2">
            {aba === "atendimentos"
              ? itensAtendimento.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-paper">
                        {a.clienteNome ?? "Sem cliente"}
                      </span>
                      <span className="block truncate text-xs text-mute">
                        {[a.servico, a.profissional].filter(Boolean).join(" · ") || "—"}
                      </span>
                      <span className="block text-xs text-mute">
                        {dataHoraLonga(a.inicio)} · {ROTULO_DO_STATUS[a.status] ?? a.status}
                        {new Date(a.inicio).getTime() > agora ? " · Futuro" : ""}
                        {a.online ? " · Online" : ""}
                      </span>
                      {a.clienteNome &&
                      !["cancelado", "nao_compareceu", "remarcado", "estornado"].includes(a.status) ? (
                        <div className="mt-2">
                          <RepetirAtendimento agendamentoId={a.id} />
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-paper">
                      {brl(a.valorCentavos)}
                    </span>
                  </li>
                ))
              : itensVenda.map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-paper">
                        {v.clienteNome ?? v.descricao ?? "Venda"}
                      </span>
                      <span className="block truncate text-xs text-mute">
                        {[v.profissional, v.forma ? (ROTULO_DA_FORMA[v.forma] ?? v.forma) : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                      <span className="block text-xs text-mute">{dataHoraLonga(v.criadoEm)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-paper">
                      {brl(v.valorCentavos)}
                    </span>
                  </li>
                ))}
          </ul>
          {ativa.hasNextPage ? (
            <Button
              variant="outline"
              className="mt-4 min-h-12 w-full"
              disabled={ativa.isFetchingNextPage}
              onClick={() => void ativa.fetchNextPage()}
            >
              {ativa.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
            </Button>
          ) : null}
        </>
      )}
    </Screen>
  );
}
