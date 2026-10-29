import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { getCarteira, type Movimento } from "@/lib/carteira.functions";
import { EsqueletoFicha } from "@/components/layout/Esqueleto";
import { useContextoCliente } from "@/lib/contexto-cliente";

export const Route = createFileRoute("/app/carteira")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Minha carteira — Flow" },
      {
        name: "description",
        content: "Saldo, créditos, cartão de fidelidade e extrato do seu negócio de beleza favorito.",
      },
      { property: "og:title", content: "Minha carteira — Flow" },
      {
        property: "og:description",
        content: "Seu saldo, seu cartão de fidelidade e cada lançamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
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
    debito: "Atendimento usando crédito",
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
          ? "Cartão completo: seu próximo atendimento é por conta da casa."
          : `Faltam ${alvo - feitos} ${alvo - feitos === 1 ? "atendimento" : "atendimentos"} para o atendimento grátis.`}
      </p>
    </div>
  );
}

function CarteiraPage() {
  const { b } = Route.useSearch();
  const slug = useContextoCliente(b);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["carteira", slug],
    queryFn: () => getCarteira({ data: slug ? { slug } : {} }),
  });

  const saldo = data?.carteira.saldo_centavos ?? 0;
  const negativo = saldo < 0;
  const rotulo = data?.tenant.rotulo_carteira ?? "Minha carteira";

  return (
    <Screen title={rotulo} subtitle={data?.cliente.nome ?? ""}>
      {isLoading ? <EsqueletoFicha onTentarDeNovo={() => void refetch()} /> : null}

      {data ? (
        <>
          <Card density="default" className="flex min-h-[118px] overflow-hidden rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-0">
            <div
              className={`w-1.5 shrink-0 ${negativo ? "bg-brick" : "barber-pole"}`}
              aria-hidden="true"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4">
              <p className="text-xs text-mute">
                {negativo ? "Em aberto (fiado)" : "Saldo disponível"}
              </p>
              <p
                className={`mt-1.5 text-[32px] font-bold leading-none ${negativo ? "text-brick" : "text-paper"}`}
              >
                {brl(Math.abs(saldo))}
              </p>
              <p className="mt-2.5 text-xs leading-relaxed text-mute">
                {data.carteira.saldo_creditos > 0
                  ? `${data.carteira.saldo_creditos} ${
                      data.carteira.saldo_creditos === 1 ? "crédito" : "créditos"
                    } de corte na carteira`
                  : "Nenhum crédito de atendimento na carteira"}
              </p>
              {negativo ? (
                <p className="mt-1 text-xs text-brick">
                  Limite de fiado: {brl(data.cliente.limite_fiado_centavos)}
                </p>
              ) : null}
            </div>
          </Card>

          {data.fidelidade.alvo ? (
            <CartaoFidelidade
              progresso={data.carteira.fidelidade_progresso}
              alvo={data.fidelidade.alvo}
            />
          ) : null}

          <h2 className="mb-1 mt-8 text-xs font-semibold uppercase text-mute">Extrato</h2>
          {data.movimentos.length === 0 ? (
            <EmptyState text="Nenhum lançamento por enquanto." />
          ) : (
            <ul className="space-y-2">
              {data.movimentos.map((m) => (
                <li key={m.id}>
                  <Card density="default" className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-paper">{rotuloMovimento(m)}</p>
                    <p className="mt-0.5 text-xs text-mute2">{dataCurta(m.criado_em)}</p>
                  </div>
                  <Delta m={m} />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Screen>
  );
}
