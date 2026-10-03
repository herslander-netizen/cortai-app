import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronRight, Undo2 } from "lucide-react";
import { EsqueletoPainel } from "@/components/layout/Esqueleto";
import { EmptyState, Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { brl, dataCurta, hora } from "@/lib/format";
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
      { title: "Caixa do dia — Painel do barbeiro | Cortaí" },
      {
        name: "description",
        content: "Entradas, saídas, fiado em aberto e origem de cada movimentação.",
      },
      { property: "og:title", content: "Caixa do dia — Cortaí" },
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

function CaixaPage() {
  const caixa = useQuery({ queryKey: ["caixa"], queryFn: () => getCaixa(), retry: false });
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
    descricao: "",
    valor: "",
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

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Caixa do dia"
      subtitle="Toda entrada mostra de onde veio."
    >
      {caixa.isLoading ? <EsqueletoPainel onTentarDeNovo={() => void caixa.refetch()} /> : null}
      {caixa.isError ? (
        <p className="text-sm text-mute">Você não tem acesso ao caixa desta barbearia.</p>
      ) : null}

      {caixa.data ? (
        <>
          <section className="surface-card p-4 md:max-w-3xl md:p-5">
            <p className="text-xs text-mute">{sessaoAberta ? "Caixa aberto" : "Caixa fechado"}</p>
            <p className="mt-2 text-[30px] font-bold leading-none text-paper">
              {brl(caixa.data.resumo.liquido)}
            </p>
            <p className="mt-1 text-xs text-mute2">
              Saldo inicial {brl(caixa.data.sessao?.saldo_inicial_centavos ?? 0)}
              {caixa.data.sessao?.aberto_em ? ` · desde ${hora(caixa.data.sessao.aberto_em)}` : ""}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Linha rotulo="Entradas" valor={brl(caixa.data.resumo.entradas)} cor="text-sage" />
              <Linha rotulo="Saídas" valor={brl(caixa.data.resumo.saidas)} cor="text-brick" />
              <Linha rotulo="Pix" valor={brl(caixa.data.resumo.pix)} />
              <Linha rotulo="Dinheiro" valor={brl(caixa.data.resumo.dinheiro)} />
              <Linha rotulo="Cartão" valor={brl(caixa.data.resumo.cartao)} />
              <Linha
                rotulo="Fiado em aberto"
                valor={brl(caixa.data.resumo.fiado)}
                cor="text-brick"
              />
            </div>
            <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder={sessaoAberta ? "Valor contado ao fechar" : "Saldo inicial"}
                value={valorCaixa}
                onChange={(e) => setValorCaixa(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={ocupado}
                onClick={() =>
                  void executar(
                    () =>
                      abrirFechar({
                        data: {
                          acao: sessaoAberta ? "fechar" : "abrir",
                          valorCentavos: Math.round(Number(valorCaixa || 0) * 100),
                        },
                      }),
                    sessaoAberta ? "Caixa fechado." : "Caixa aberto.",
                  )
                }
              >
                {sessaoAberta ? "Fechar caixa" : "Abrir caixa"}
              </Button>
            </div>
          </section>

          <section className="surface-card mt-5 p-4 md:max-w-3xl md:p-5">
            <h2 className="text-sm font-semibold text-paper">Registrar saída</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <select
                className="field-control"
                value={saida.tipo}
                onChange={(e) => setSaida({ ...saida, tipo: e.target.value as typeof saida.tipo })}
                aria-label="Tipo de saída"
              >
                <option value="saida">Saída</option>
                <option value="sangria">Sangria</option>
                <option value="despesa">Despesa</option>
              </select>
              <input
                className="field-control"
                placeholder="Descrição"
                value={saida.descricao}
                onChange={(e) => setSaida({ ...saida, descricao: e.target.value })}
              />
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Valor"
                value={saida.valor}
                onChange={(e) => setSaida({ ...saida, valor: e.target.value })}
              />
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
                      descricao: saida.descricao.trim(),
                      valorCentavos: Math.round(Number(saida.valor) * 100),
                    },
                  });
                  setSaida({ tipo: "saida", descricao: "", valor: "" });
                }, "Saída registrada.")
              }
            >
              Registrar
            </Button>
          </section>

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
                        <dd className="capitalize text-paper">{m.categoria}</dd>
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
          {(fiados.data ?? []).length === 0 ? (
            <div className="mt-3">
              <EmptyState text="Ninguém está devendo." />
            </div>
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
