import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { getCarteira, type Movimento } from "@/lib/carteira.functions";

export const Route = createFileRoute("/app/carteira")({
  head: () => ({
    meta: [
      { title: "Minha carteira — Cortaí" },
      { name: "description", content: "Saldo, créditos, cartão de fidelidade e extrato da sua barbearia." },
      { property: "og:title", content: "Minha carteira — Cortaí" },
      { property: "og:description", content: "Seu saldo, seu cartão de fidelidade e cada lançamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CarteiraPage,
});

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function rotuloMovimento(m: Movimento) {
  if (m.descricao) return m.descricao;
  const mapa: Record<string, string> = {
    debito: "Corte usando crédito",
    credito: "Créditos adicionados",
    fiado: "Lançado no fiado",
    pagamento: "Pagamento recebido",
    fidelidade: "Selo de fidelidade",
    ajuste: "Ajuste",
  };
  return mapa[m.tipo] ?? m.tipo;
}

function Delta({ m }: { m: Movimento }) {
  if (m.creditos_delta !== 0 && m.tipo === "fidelidade") {
    return (
      <span className="shrink-0 text-sm font-semibold text-gold">
        {m.creditos_delta > 0 ? `+${m.creditos_delta} selo` : `${m.creditos_delta} selo`}
      </span>
    );
  }
  if (m.creditos_delta !== 0) {
    const positivo = m.creditos_delta > 0;
    return (
      <span className={`shrink-0 text-sm font-semibold ${positivo ? "text-sage" : "text-paper"}`}>
        {positivo ? "+" : "−"}
        {Math.abs(m.creditos_delta)} {Math.abs(m.creditos_delta) === 1 ? "crédito" : "créditos"}
      </span>
    );
  }
  const positivo = m.centavos_delta >= 0;
  return (
    <span className={`shrink-0 text-sm font-semibold ${positivo ? "text-sage" : "text-brick"}`}>
      {positivo ? "+" : "−"}
      {brl(Math.abs(m.centavos_delta))}
    </span>
  );
}

function CartaoFidelidade({ progresso, alvo }: { progresso: number; alvo: number }) {
  const feitos = Math.min(progresso, alvo);
  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-paper">Cartão de fidelidade</h2>
        <span className="text-xs text-mute">
          {feitos} de {alvo}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: alvo }, (_, i) => {
          const cheio = i < feitos;
          const ultima = i === alvo - 1;
          return (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                cheio ? "border-gold bg-gold" : "border-line2 bg-ink2"
              }`}
            >
              {ultima ? (
                <Star size={13} className={cheio ? "text-ink" : "text-gold"} fill="currentColor" />
              ) : null}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-mute">
        {feitos >= alvo
          ? "Cartão completo: seu próximo corte é por conta da casa."
          : `Faltam ${alvo - feitos} ${alvo - feitos === 1 ? "corte" : "cortes"} para o corte grátis.`}
      </p>
    </div>
  );
}

function CarteiraPage() {
  const [clienteId, setClienteId] = useState<string | undefined>(undefined);
  const { data, isLoading } = useQuery({
    queryKey: ["carteira", clienteId],
    queryFn: () => getCarteira({ data: clienteId ? { clienteId } : {} }),
  });

  const saldo = data?.carteira.saldo_centavos ?? 0;
  const negativo = saldo < 0;
  const rotulo = data?.tenant.rotulo_carteira ?? "Minha carteira";

  return (
    <Screen title={rotulo} subtitle={data?.cliente.nome ?? ""}>
      {data && data.clientes.length > 1 ? (
        <label className="mb-6 block">
          <span className="text-xs text-mute2">Entrando como</span>
          <select
            className="mt-1 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper"
            value={data.cliente.id}
            onChange={(e) => setClienteId(e.target.value)}
          >
            {data.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}

      {data ? (
        <>
          <div className="flex overflow-hidden rounded-lg border border-line bg-ink2">
            <div className={`w-[9px] shrink-0 ${negativo ? "bg-brick" : "barber-pole"}`} aria-hidden="true" />
            <div className="flex-1 px-5 py-6">
              <p className="text-xs text-mute">{negativo ? "Em aberto (fiado)" : "Saldo disponível"}</p>
              <p
                className={`mt-1 text-[36px] font-bold leading-none ${negativo ? "text-brick" : "text-paper"}`}
              >
                {brl(Math.abs(saldo))}
              </p>
              <p className="mt-3 text-xs text-mute">
                {data.carteira.saldo_creditos > 0
                  ? `${data.carteira.saldo_creditos} ${
                      data.carteira.saldo_creditos === 1 ? "crédito" : "créditos"
                    } de corte na carteira`
                  : "Nenhum crédito de corte na carteira"}
              </p>
              {negativo ? (
                <p className="mt-1 text-xs text-brick">
                  Limite de fiado: {brl(data.cliente.limite_fiado_centavos)}
                </p>
              ) : null}
            </div>
          </div>

          {data.fidelidade.alvo ? (
            <CartaoFidelidade progresso={data.carteira.fidelidade_progresso} alvo={data.fidelidade.alvo} />
          ) : null}

          <h2 className="mb-2 mt-8 text-sm font-semibold text-paper">Extrato</h2>
          {data.movimentos.length === 0 ? (
            <EmptyState text="Nenhum lançamento por enquanto." />
          ) : (
            <ul>
              {data.movimentos.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-4 border-b border-line py-4">
                  <div>
                    <p className="text-sm text-paper">{rotuloMovimento(m)}</p>
                    <p className="mt-0.5 text-xs text-mute2">{dataCurta(m.criado_em)}</p>
                  </div>
                  <Delta m={m} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Screen>
  );
}
