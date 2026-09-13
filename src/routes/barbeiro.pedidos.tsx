import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { brl } from "@/lib/format";
import { confirmarPagamento, getPedidosPagamento } from "@/lib/pedidos.functions";
import { useContextoBarbearia } from "@/hooks/useContextoBarbearia";

export const Route = createFileRoute("/barbeiro/pedidos")({
  head: () => ({ meta: [
    { title: "Pedidos e pagamentos — Cortaí Gestão" },
    { name: "description", content: "Atendimentos aguardando confirmação de pagamento e histórico recente." },
    { property: "og:title", content: "Pedidos e pagamentos — Cortaí Gestão" },
    { property: "og:description", content: "Confirme o pagamento dos atendimentos com segurança." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PedidosPage,
});

const FORMAS = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "credito", rotulo: "Crédito da carteira" },
  { valor: "fiado", rotulo: "Fiado" },
] as const;

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function PedidosPage() {
  const contexto = useContextoBarbearia();
  const podeConfirmar = contexto.pode("confirmar_pagamento");
  const query = useQuery({ queryKey: ["pedidos-pagamento"], queryFn: () => getPedidosPagamento(), enabled: podeConfirmar, retry: false });
  const confirmar = useServerFn(confirmarPagamento);
  const cliente = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [forma, setForma] = useState<(typeof FORMAS)[number]["valor"]>("pix");
  const [erro, setErro] = useState("");
  const [status, setStatus] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (contexto.carregando) return <Screen title="Pedidos"><Carregando texto="Carregando…" /></Screen>;
  if (!podeConfirmar) {
    return <Screen title="Pedidos" subtitle="Confirmação de pagamento dos atendimentos."><p className="rounded-xl border border-line bg-ink2 p-5 text-sm text-mute">Seu acesso não inclui a confirmação de pagamentos.</p></Screen>;
  }

  const itens = query.data ?? [];
  const pendentes = itens.filter((i) => !i.pagoEm);
  const recentes = itens.filter((i) => i.pagoEm).slice(0, 15);

  async function enviar(id: string) {
    setErro("");
    setStatus("");
    setEnviando(true);
    try {
      await confirmar({ data: { agendamentoId: id, formaPagamento: forma } });
      await query.refetch();
      await cliente.invalidateQueries({ queryKey: ["painel-hoje"] });
      setSelecionado(null);
      setStatus("Pagamento confirmado.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível confirmar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Screen title="Pedidos" subtitle="Atendimentos aguardando confirmação de pagamento.">
      {query.isLoading ? <Carregando texto="Carregando atendimentos…" /> : (
        <>
          {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}
          {erro ? <p className="mb-4 text-sm text-red-400" role="alert">{erro}</p> : null}

          {pendentes.length === 0 ? <EmptyState text="Nenhum pagamento pendente por aqui." /> : (
            <ul className="space-y-2">
              {pendentes.map((item) => (
                <li key={item.id} className="rounded-xl border border-line bg-ink2 px-4 py-3.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-paper">{item.cliente}</p>
                      <p className="mt-0.5 truncate text-xs text-mute">{item.servico} · {item.profissional}</p>
                      <p className="mt-0.5 text-[11px] text-mute2">{quando(item.inicio)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gold">{brl(item.valorCentavos)}</p>
                  </div>
                  {selecionado === item.id ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="text-xs text-mute">Confira e escolha a forma de pagamento.</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {FORMAS.map((f) => (
                          <button key={f.valor} type="button" aria-pressed={forma === f.valor} onClick={() => setForma(f.valor)}
                            className={`rounded-lg border px-3 py-2 text-xs ${forma === f.valor ? "border-gold text-gold" : "border-line text-mute"}`}>{f.rotulo}</button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="rounded-lg border border-line px-3 py-2 text-xs text-paper" onClick={() => setSelecionado(null)}>Cancelar</button>
                        <button type="button" disabled={enviando} className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60" onClick={() => void enviar(item.id)}>
                          {enviando ? "Confirmando…" : `Confirmar ${brl(item.valorCentavos)}`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="mt-3 w-full rounded-lg border border-line py-2.5 text-xs font-semibold text-paper" onClick={() => { setSelecionado(item.id); setForma((item.formaPagamento as typeof forma) ?? "pix"); }}>
                      Confirmar pagamento
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {recentes.length ? (
            <>
              <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-mute2">Confirmados recentemente</h2>
              <ul className="mt-3 divide-y divide-line">
                {recentes.map((item) => (
                  <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-paper">{item.cliente}</p>
                      <p className="mt-0.5 truncate text-[11px] text-mute2">{quando(item.pagoEm as string)} · {item.formaPagamento ?? "—"}</p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-sage">{brl(item.valorCentavos)}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
