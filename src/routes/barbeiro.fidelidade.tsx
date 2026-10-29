import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { useAcao } from "@/hooks/useAcao";
import { brl } from "@/lib/format";
import {
  getClientesFidelidade,
  getConfigFidelidade,
  salvarFidelidade,
} from "@/lib/fidelidade.functions";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/Screen";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/barbeiro/fidelidade")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "fidelidade"),
  head: () => ({
    meta: [
      { title: "Voltaí — Flow" },
      {
        name: "description",
        content:
          "Defina quantos cortes valem um grátis e veja o desconto real antes de vender no prejuízo.",
      },
      { property: "og:title", content: "Voltaí — Flow" },
      {
        property: "og:description",
        content: "Desconto real e ticket efetivo do seu cartão de fidelidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FidelidadePage,
});

function aviso(alvo: number): { texto: string; classe: string } {
  if (alvo <= 5)
    return {
      texto: "o desconto passa de 16%, só vale se sua margem for alta",
      classe: "text-brick",
    };
  if (alvo >= 16)
    return {
      texto: "acima de 15 o cliente costuma desistir antes de completar",
      classe: "text-brick",
    };
  return { texto: "faixa saudável", classe: "text-mute2" };
}

function FidelidadePage() {
  const salvar = useServerFn(salvarFidelidade);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fidelidade"],
    queryFn: () => getConfigFidelidade(),
  });

  const elegiveis = useQuery({
    queryKey: ["fidelidade-clientes"],
    queryFn: () => getClientesFidelidade(),
  });

  const [alvo, setAlvo] = useState(10);
  const [ativo, setAtivo] = useState(false);
  const acao = useAcao();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (data) {
      setAlvo(data.alvo);
      setAtivo(data.ativo);
    }
  }, [data]);

  const preco = data?.precoBaseCentavos ?? 0;
  const descontoReal = 100 / (alvo + 1);
  const ticketEfetivo = (preco * alvo) / (alvo + 1);
  const a = aviso(alvo);

  return (
    <Screen voltarPara="/barbeiro/mais" title="Voltaí" subtitle="Seu cliente corta. Ganha. Volta.">
      {isLoading ? <EsqueletoFormulario campos={4} onTentarDeNovo={() => void refetch()} /> : null}

      <Card density="default" className="flex items-center justify-between gap-4">
        <div className="pr-4">
          <p className="text-sm text-paper">Voltaí do Flow</p>
          <p className="mt-0.5 text-xs text-mute2">
            Desligado, o cliente não vê cartão, selos nem promessa de corte grátis. Desligar não
            zera o progresso já acumulado, e cada cliente pode ter uma exceção na própria ficha.
          </p>
        </div>
        <Switch
          checked={ativo}
          onCheckedChange={(valor) => {
            setAtivo(valor);
            setOk(false);
          }}
          aria-label="Programa de fidelidade ativo"
          className="h-7 w-12 shrink-0 data-[state=checked]:bg-[var(--figaro-primary)] data-[state=unchecked]:bg-[var(--figaro-surface-container-highest)]"
        />
      </Card>

      <Card density="default" className="mt-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-paper">Cortes até o grátis</p>
          <p className="text-2xl font-bold text-[var(--figaro-primary,var(--primary))]">{alvo}</p>
        </div>
        <input
          type="range"
          min={4}
          max={20}
          step={1}
          value={alvo}
          aria-label="Cortes até o corte grátis"
          onChange={(e) => {
            setAlvo(Number(e.target.value));
            setOk(false);
          }}
          className="mt-4 w-full accent-[var(--figaro-primary,var(--primary))]"
        />
        <div className="mt-1 flex justify-between text-xs text-mute2">
          <span>4</span>
          <span>20</span>
        </div>
        <p className={`mt-3 text-xs ${a.classe}`}>{a.texto}</p>
      </Card>

      <Card density="default">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mute">Desconto real</span>
          <span className="text-xl font-bold text-paper">
            {descontoReal.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-mute">Ticket efetivo</span>
          <span className="text-xl font-bold text-paper">{brl(ticketEfetivo)}</span>
        </div>
        <p className="mt-4 text-xs text-mute2">
          O cliente paga {alvo} e leva {alvo + 1}. Sobre o preço de {brl(preco)}, cada corte sai por{" "}
          {brl(ticketEfetivo)}.
        </p>
      </Card>

      {data && data.clientesComProgresso > 0 ? (
        <p className="mt-4 text-xs text-mute">
          {data.clientesComProgresso}{" "}
          {data.clientesComProgresso === 1 ? "cliente já tem selos" : "clientes já têm selos"}{" "}
          acumulados. Mudar a meta não apaga o que eles já juntaram.
        </p>
      ) : null}

      <Button
        loading={acao.estaEm("fidelidade")}
        success={acao.concluiu("fidelidade")}
        variant="primary"
        type="button"
        className="mt-6 w-full"
        disabled={acao.ocupado}
        onClick={() =>
          acao.executar("fidelidade", () => salvar({ data: { ativo, alvo } }), {
            sucesso: "Cartão fidelidade salvo.",
            aoConcluir: async () => {
              setOk(true);
              await refetch();
            },
          })
        }
      >
        Salvar
      </Button>
      {ok ? <p className="mt-3 text-center text-sm text-sage">Configuração salva.</p> : null}

      <h2 className="mb-1 mt-10 text-sm font-semibold text-paper">Progresso dos clientes</h2>
      {elegiveis.data && elegiveis.data.clientes.length === 0 ? (
        <EmptyState text="Ninguém acumulou selos ainda." />
      ) : null}
      <ul className="space-y-2">
        {(elegiveis.data?.clientes ?? []).map((c) => (
          <li key={c.id}>
            <Card density="default">
              <div className="flex items-baseline justify-between gap-4">
                <Link
                  to="/barbeiro/clientes/$id"
                  params={{ id: c.id }}
                  className="truncate text-sm font-medium text-[var(--figaro-primary,var(--primary))] underline underline-offset-2"
                >
                  {c.nome}
                </Link>
                <p className={`shrink-0 text-xs ${c.elegivel ? "text-sage" : "text-mute2"}`}>
                  {c.elegivel
                    ? "Corte grátis liberado"
                    : `${c.progresso} de ${elegiveis.data?.alvo ?? alvo}`}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))]">
                <div
                  className={`h-full rounded-full ${c.elegivel ? "bg-sage" : "bg-[var(--figaro-primary,var(--primary))]"}`}
                  style={{
                    width: `${Math.min(100, Math.round((c.progresso / Math.max(1, elegiveis.data?.alvo ?? alvo)) * 100))}%`,
                  }}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
