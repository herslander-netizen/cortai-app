import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight, Undo2 } from "lucide-react";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { BuscaDeComandas } from "@/components/comanda/BuscaDeComandas";
import { RegistrarGanhoExtra } from "@/components/financeiro/RegistrarGanhoExtra";
import { brl, dataCurta, hora } from "@/lib/format";
import { CATEGORIAS_DESPESA, FAIXAS_IDADE_FIADO, classificarIdadeFiado, rotuloCategoriaSaida, rotuloIdadeFiado, type CategoriaDespesa } from "@/lib/financeiro-analise";
import {
  abrirOuFecharCaixa,
  estornarPagamento,
  getCaixa,
  getFiados,
  quitarFiado,
  registrarMovimentoDeCaixa,
} from "@/lib/financeiro.functions";

export const Route = createFileRoute("/barbeiro/caixa")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "comanda_caixa"),
  ssr: false,
  head: () => ({
    meta: [
      { title: "Caixa do dia — Painel do negócio | Flow" },
      {
        name: "description",
        content: "Entradas, saídas, fiado em aberto e origem de cada movimentação.",
      },
      { property: "og:title", content: "Caixa do dia — Flow" },
      {
        property: "og:description",
        content: "Todo valor com cliente, profissional e comanda de origem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CaixaPage,
});

function Linha({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="surface px-3 py-3">
      <p className="text-xs uppercase text-mute2">{rotulo}</p>
      <p className={`mt-1 text-sm font-semibold ${cor ?? "text-paper"}`}>{valor}</p>
    </div>
  );
}

type CaixaDados = {
  sessao: { id: string; saldo_inicial_centavos: number; aberto_em: string | null } | null;
  ultimoFechamento: {
    id: string;
    saldo_inicial_centavos: number;
    saldo_informado_centavos: number;
    saldo_esperado_centavos: number;
    diferenca_calculada_centavos: number;
    aberto_em: string;
    fechado_em: string;
  } | null;
  movimentos: any[];
  profissionais: { id: string; nome: string }[];
  resumo: {
    liquido: number;
    entradas: number;
    saidas: number;
    pix: number;
    dinheiro: number;
    cartao: number;
    fiado: number;
    dinheiroEsperadoCentavos: number | null;
  };
};

function CaixaPage() {
  const caixa = useQuery<CaixaDados>({
    queryKey: ["caixa"],
    queryFn: async () => (await getCaixa()) as CaixaDados,
    retry: false,
  });
  const fiados = useQuery({ queryKey: ["fiados"], queryFn: () => getFiados(), retry: false });
  const abrirFechar = useServerFn(abrirOuFecharCaixa);
  const registrar = useServerFn(registrarMovimentoDeCaixa);
  const quitar = useServerFn(quitarFiado);
  const estornar = useServerFn(estornarPagamento);
  const [motivoEstorno, setMotivoEstorno] = useState("");
  const queryClient = useQueryClient();

  const [valorCaixa, setValorCaixa] = useState("");
  const [saida, setSaida] = useState({
    tipo: "saida" as "saida" | "sangria" | "despesa",
    categoria: "outros" as CategoriaDespesa,
    descricao: "",
    valor: "",
    formaPagamento: "dinheiro" as "dinheiro" | "pix" | "cartao",
  });
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  async function executar(fn: () => Promise<unknown>, sucesso: string) {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      await fn();
      setAviso(sucesso);
      await Promise.all([caixa.refetch(), fiados.refetch()]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui registrar agora.");
    } finally {
      setOcupado(false);
    }
  }

  const sessaoAberta = Boolean(caixa.data?.sessao);
  const resumoIdadeFiado = FAIXAS_IDADE_FIADO.map((faixa) => {
    const itens = (fiados.data ?? []).filter(
      (f: any) => classificarIdadeFiado(Number(f.idade_dias ?? 0)) === faixa.rotulo,
    );
    return {
      rotulo: faixa.rotulo,
      quantidade: itens.length,
      saldoCentavos: itens.reduce(
        (total: number, f: any) => total + Number(f.saldo_centavos ?? 0),
        0,
      ),
    };
  });
  const saldoTotalFiadoCentavos = (fiados.data ?? []).reduce(
    (total: number, f: any) => total + Number(f.saldo_centavos ?? 0),
    0,
  );

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Caixa do dia"
      subtitle="Toda entrada mostra de onde veio."
    >
      {caixa.isLoading ? <EsqueletoPainel onTentarDeNovo={() => void caixa.refetch()} /> : null}
      {caixa.isError ? (
        <p className="text-sm text-mute">Você não tem acesso ao caixa deste negócio.</p>
      ) : null}

      {caixa.data ? (
        <>
          <section className="surface-card p-4 md:max-w-3xl md:p-5">
            <p className="text-xs text-mute">{sessaoAberta ? "Caixa aberto" : "Caixa fechado"}</p>
            <p className="mt-2 text-[30px] font-bold leading-none text-paper">
              {brl(caixa.data.resumo.liquido)}
            </p>
            <p className="mt-1 text-xs text-mute2">
              Movimentação líquida de hoje: entradas menos saídas em todas as formas de pagamento.
            </p>
            {sessaoAberta && caixa.data.sessao ? (
              <div className="surface mt-4 p-3">
                <p className="text-xs text-mute2">Dinheiro esperado na gaveta</p>
                <p className="mt-1 text-xl font-semibold text-paper">
                  {brl(caixa.data.resumo.dinheiroEsperadoCentavos ?? caixa.data.sessao.saldo_inicial_centavos)}
                </p>
                <p className="mt-1 text-xs text-mute2">
                  Saldo inicial {brl(caixa.data.sessao.saldo_inicial_centavos)}
                  {caixa.data.sessao.aberto_em ? ` · aberto às ${hora(caixa.data.sessao.aberto_em)}` : ""}.
                  Pix e cartão não entram na contagem física.
                </p>
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Linha rotulo="Entradas" valor={brl(caixa.data.resumo.entradas)} cor="text-sage" />
              <Linha rotulo="Saídas" valor={brl(caixa.data.resumo.saidas)} cor="text-brick" />
              <Linha rotulo="Pix" valor={brl(caixa.data.resumo.pix)} />
              <Linha rotulo="Dinheiro recebido" valor={brl(caixa.data.resumo.dinheiro)} />
              <Linha rotulo="Cartão recebido" valor={brl(caixa.data.resumo.cartao)} />
              <Linha
                rotulo="Fiado em aberto"
                valor={brl(caixa.data.resumo.fiado)}
                cor="text-brick"
              />
            </div>
            <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="flex min-w-0 flex-col gap-1 text-xs text-mute">
                {sessaoAberta ? "Dinheiro contado ao fechar" : "Saldo inicial para troco"}
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorCaixa}
                  onChange={(e) => setValorCaixa(e.target.value)}
                />
              </label>
              <Button
                variant="outline"
                disabled={ocupado || (sessaoAberta && !valorCaixa.trim()) || (!sessaoAberta && !valorCaixa.trim())}
                onClick={() =>
                  void executar(
                    () =>
                      abrirFechar({
                        data: {
                          acao: sessaoAberta ? "fechar" : "abrir",
                          valorCentavos: Math.round(Number(valorCaixa || 0) * 100),
                        },
                      }),
                    sessaoAberta ? "Caixa fechado e diferença registrada." : "Caixa aberto.",
                  ).then(() => setValorCaixa(""))
                }
              >
                {sessaoAberta ? "Fechar caixa" : "Abrir caixa"}
              </Button>
            </div>
          </section>

          {!sessaoAberta && caixa.data.ultimoFechamento ? (
            <section className="surface-card mt-4 p-4 md:max-w-3xl" aria-label="Resumo do último fechamento">
              <h2 className="text-sm font-semibold text-paper">Último fechamento de hoje</h2>
              <p className="mt-1 text-xs text-mute2">
                {dataCurta(caixa.data.ultimoFechamento.fechado_em)} · {hora(caixa.data.ultimoFechamento.fechado_em)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Linha rotulo="Dinheiro esperado" valor={brl(caixa.data.ultimoFechamento.saldo_esperado_centavos)} />
                <Linha rotulo="Dinheiro contado" valor={brl(caixa.data.ultimoFechamento.saldo_informado_centavos)} />
                <Linha
                  rotulo="Diferença"
                  valor={brl(caixa.data.ultimoFechamento.diferenca_calculada_centavos)}
                  cor={caixa.data.ultimoFechamento.diferenca_calculada_centavos < 0 ? "text-brick" : caixa.data.ultimoFechamento.diferenca_calculada_centavos > 0 ? "text-sage" : "text-paper"}
                />
              </div>
              <p className="mt-3 text-xs text-mute2">
                {caixa.data.ultimoFechamento.diferenca_calculada_centavos < 0
                  ? `Faltaram ${brl(Math.abs(caixa.data.ultimoFechamento.diferenca_calculada_centavos))} na gaveta.`
                  : caixa.data.ultimoFechamento.diferenca_calculada_centavos > 0
                    ? `Sobrou ${brl(caixa.data.ultimoFechamento.diferenca_calculada_centavos)} na gaveta.`
                    : "A contagem bateu com o valor esperado."}
              </p>
            </section>
          ) : null}

          <BuscaDeComandas />

          <section className="surface-card mt-5 p-4 md:max-w-3xl md:p-5">
            <h2 className="text-sm font-semibold text-paper">Registrar saída</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex min-w-0 flex-col gap-1 text-xs text-mute">
                Tipo
                <select
                  className="field-control"
                  value={saida.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value as typeof saida.tipo;
                    setSaida((atual) => ({
                      ...atual,
                      tipo,
                      formaPagamento: tipo === "sangria" ? "dinheiro" : atual.formaPagamento,
                    }));
                  }}
                  aria-label="Tipo de saída"
                >
                  <option value="saida">Saída</option>
                  <option value="sangria">Sangria (dinheiro)</option>
                  <option value="despesa">Despesa</option>
                </select>
              </label>
              {saida.tipo === "despesa" ? (
                <label className="flex min-w-0 flex-col gap-1 text-xs text-mute">
                  Categoria
                  <select
                    className="field-control"
                    value={saida.categoria}
                    onChange={(e) =>
                      setSaida({ ...saida, categoria: e.target.value as CategoriaDespesa })
                    }
                    aria-label="Categoria da despesa"
                  >
                    {CATEGORIAS_DESPESA.map((categoria) => (
                      <option key={categoria.valor} value={categoria.valor}>
                        {categoria.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="flex min-w-0 flex-col gap-1 text-xs text-mute">
                Forma de pagamento
                <select
                  className="field-control"
                  value={saida.formaPagamento}
                  disabled={saida.tipo === "sangria"}
                  onChange={(e) => setSaida({ ...saida, formaPagamento: e.target.value as typeof saida.formaPagamento })}
                  aria-label="Forma de pagamento da saída"
                >
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-mute">
                Descrição
                <input
                  className="field-control"
                  placeholder="Ex.: compra de material"
                  value={saida.descricao}
                  onChange={(e) => setSaida({ ...saida, descricao: e.target.value })}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs text-mute">
                Valor (R$)
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={saida.valor}
                  onChange={(e) => setSaida({ ...saida, valor: e.target.value })}
                />
              </label>
            </div>
            <Button
              variant="outline"
              className="mt-3 w-full"
              disabled={ocupado || saida.descricao.trim().length < 3 || Number(saida.valor) <= 0}
              onClick={() =>
                void executar(async () => {
                  await registrar({
                    data: {
                      tipo: saida.tipo,
                      categoria: saida.tipo === "despesa" ? saida.categoria : undefined,
                      descricao: saida.descricao.trim(),
                      valorCentavos: Math.round(Number(saida.valor) * 100),
                      formaPagamento: saida.formaPagamento,
                    },
                  });
                  setSaida({ tipo: "saida", categoria: "outros", descricao: "", valor: "", formaPagamento: "dinheiro" });
                }, "Saída registrada.")
              }
            >
              Registrar saída
            </Button>
          </section>

          <RegistrarGanhoExtra profissionais={caixa.data.profissionais ?? []} />

          <h2 className="mt-8 text-sm font-semibold text-paper">Movimentações de hoje</h2>
          {caixa.data.movimentos.length === 0 ? (
            <div className="mt-3">
              <EmptyState text="Nenhuma movimentação hoje." />
            </div>
          ) : null}
          <ul className="mt-2">
            {caixa.data.movimentos.map((m: any) => {
              const cliente = m.comandas?.clientes?.nome ?? m.clientes?.nome;
              const profissional = m.comandas?.profissionais?.nome ?? m.profissionais?.nome;
              const aberto = detalhe === m.id;
              return (
                <li key={m.id} className="border-b border-line">
                  <Button
                    variant="ghost"
                    type="button"
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-4 text-left"
                    onClick={() => setDetalhe(aberto ? null : m.id)}
                    aria-expanded={aberto}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-paper">{m.descricao}</span>
                      <span className="mt-0.5 block truncate text-xs text-mute2">
                        {[
                          cliente,
                          profissional ? `Profissional: ${profissional}` : null,
                          m.comandas?.numero ? `Comanda #${m.comandas.numero}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className="mt-0.5 block text-xs text-mute2">
                        {dataCurta(m.criado_em)} · {hora(m.criado_em)}
                        {m.forma_pagamento ? ` · ${m.forma_pagamento}` : ""}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-semibold ${m.tipo === "entrada" ? "text-sage" : "text-brick"}`}
                    >
                      {m.tipo === "entrada" ? "+" : "−"} {brl(m.valor_centavos)}
                    </span>
                    <ChevronRight size={16} className="text-mute2" />
                  </Button>
                  {aberto ? (
                    <dl className="grid grid-cols-2 gap-2 pb-4 text-xs text-mute">
                      <div>
                        <dt className="text-mute2">Tipo</dt>
                        <dd className="capitalize text-paper">{m.tipo}</dd>
                      </div>
                      <div>
                        <dt className="text-mute2">Categoria</dt>
                        <dd className="capitalize text-paper">
                          {m.tipo === "saida" || m.tipo === "despesa"
                            ? rotuloCategoriaSaida(String(m.categoria ?? ""), String(m.tipo))
                            : ({
                                ganho_extra_gorjeta: "Gorjeta",
                                ganho_extra_servico_extra: "Serviço extra",
                                ganho_extra_outro: "Outro ganho",
                              } as Record<string, string>)[String(m.categoria)] ?? m.categoria}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-mute2">Cliente</dt>
                        <dd className="text-paper">{cliente ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-mute2">Profissional</dt>
                        <dd className="text-paper">{profissional ?? "—"}</dd>
                      </div>
                    </dl>
                  ) : null}
                  {aberto &&
                  m.tipo === "entrada" &&
                  m.pagamento_id &&
                  m.pagamentos?.status === "confirmado" ? (
                    <div className="flex gap-2 pb-4">
                      <input
                        value={motivoEstorno}
                        onChange={(e) => setMotivoEstorno(e.target.value)}
                        placeholder="Motivo do estorno"
                        className="h-12 min-w-0 flex-1 surface px-3 text-sm text-paper"
                      />
                      <Button
                        variant="outline"
                        className="h-12"
                        disabled={ocupado || motivoEstorno.trim().length < 3}
                        onClick={() =>
                          executar(async () => {
                            await estornar({
                              data: { pagamentoId: m.pagamento_id, motivo: motivoEstorno },
                            });
                            setMotivoEstorno("");
                          }, "Estorno registrado.")
                        }
                      >
                        <Undo2 size={16} strokeWidth={1.75} /> Estornar
                      </Button>
                    </div>
                  ) : null}
                  {m.pagamentos?.status === "estornado" && m.tipo === "entrada" ? (
                    <p className="flex items-center gap-1.5 pb-3 text-xs text-brick">
                      <Undo2 size={14} strokeWidth={1.75} /> Estornado
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-paper">Fiado em aberto</h2>
            <Link to="/barbeiro/comissoes" className="text-xs text-gold">
              Comissões
            </Link>
          </div>
          {fiados.isLoading ? (
            <p className="mt-3 text-sm text-mute2">Carregando fiados…</p>
          ) : null}
          {fiados.isError ? (
            <p className="mt-3 text-sm text-brick" role="alert">
              Não foi possível carregar os fiados agora. Tente novamente.
            </p>
          ) : null}
          {fiados.data && fiados.data.length === 0 ? (
            <div className="mt-3">
              <EmptyState text="Ninguém está devendo." />
            </div>
          ) : null}
          {fiados.data && fiados.data.length > 0 ? (
            <section className="surface-card mt-3 p-4 md:max-w-3xl">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-mute">Saldo a receber</p>
                <p className="text-lg font-semibold text-paper">{brl(saldoTotalFiadoCentavos)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {resumoIdadeFiado.map((faixa) => (
                  <div key={faixa.rotulo} className="surface min-w-0 p-3">
                    <p className="text-xs text-mute">{faixa.rotulo}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-paper">
                      {brl(faixa.saldoCentavos)}
                    </p>
                    <p className="mt-1 text-xs text-mute2">
                      {faixa.quantidade} {faixa.quantidade === 1 ? "fiado" : "fiados"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-mute2">
                Faixas calculadas desde o lançamento. Não indicam atraso contratual, pois ainda não há
                vencimento individual registrado para cada fiado.
              </p>
            </section>
          ) : null}
          <ul className="mt-2">
            {(fiados.data ?? []).map((f: any) => (
              <li
                key={f.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{f.clientes?.nome ?? "Cliente"}</p>
                  <p className="mt-0.5 text-xs text-mute2">
                    Comanda #{f.comandas?.numero} · desde {dataCurta(f.criado_em)}
                  </p>
                  <p className="mt-0.5 text-xs text-mute2">
                    {rotuloIdadeFiado(Number(f.idade_dias ?? 0))} · {classificarIdadeFiado(Number(f.idade_dias ?? 0))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-brick">{brl(f.saldo_centavos)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() =>
                      void executar(async () => {
                        // Sai da lista na hora; volta se o servidor recusar.
                        const anterior = fiados.data;
                        if (anterior) {
                          queryClient.setQueryData(
                            ["fiados"],
                            (anterior as any[]).filter((x) => x.id !== f.id),
                          );
                        }
                        try {
                          await quitar({
                            data: {
                              fiadoId: f.id,
                              valorCentavos: f.saldo_centavos,
                              forma: "dinheiro",
                              saldoEsperadoCentavos: f.saldo_centavos,
                            },
                          });
                        } catch (e) {
                          if (anterior) queryClient.setQueryData(["fiados"], anterior);
                          throw e;
                        }
                      }, "Fiado quitado e lançado no caixa.")
                    }
                  >
                    Quitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {aviso ? <p className="mt-5 text-sm text-sage">{aviso}</p> : null}
          {erro ? (
            <p className="mt-3 text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
