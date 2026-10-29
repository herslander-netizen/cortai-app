import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { ExclusaoPermanente } from "@/components/seguranca/ExclusaoPermanente";
import { Aviso } from "@/components/ui/aviso";
import { useAcao } from "@/hooks/useAcao";
import {
  atualizarIndicacao,
  getIndicacoes,
  registrarIndicacao,
  salvarConfigIndicacao,
} from "@/lib/crescimento.functions";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/barbeiro/indicacoes")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "indicacoes"),
  head: () => ({
    meta: [
      { title: "Indicações — Flow" },
      {
        name: "description",
        content: "Cliente que traz cliente: código, recompensa e acompanhamento.",
      },
      { property: "og:title", content: "Indicações — Flow" },
      { property: "og:description", content: "Acompanhe quem indicou e quem já virou cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IndicacoesPage,
});

function IndicacoesPage() {
  const salvarConfig = useServerFn(salvarConfigIndicacao);
  const registrar = useServerFn(registrarIndicacao);
  const atualizar = useServerFn(atualizarIndicacao);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["indicacoes"],
    queryFn: () => getIndicacoes(),
  });
  const acao = useAcao();

  const [ativa, setAtiva] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [recompensa, setRecompensa] = useState("");
  const [novo, setNovo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAtiva(data.tenant.ativa);
    setCodigo(data.tenant.codigo ?? data.tenant.slug);
    setRecompensa(data.tenant.recompensa ?? "");
  }, [data]);

  const link = `${typeof window === "undefined" ? "" : window.location.origin}/b/${data?.tenant.slug ?? ""}?indicacao=${codigo}`;

  return (
    <Screen voltarPara="/barbeiro/mais" title="Indicações" subtitle="Cliente que traz cliente.">
      {isLoading ? <EsqueletoLista onTentarDeNovo={() => void refetch()} /> : null}

      <div className="surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-paper">Programa de indicação</p>
            <p className="mt-0.5 text-xs text-mute2">
              A recompensa é registrada aqui e entregue no negócio.
            </p>
          </div>
          <Switch
            checked={ativa}
            onCheckedChange={setAtiva}
            aria-label="Programa de indicação ativo"
            className="h-7 w-12 shrink-0 data-[state=checked]:bg-[var(--figaro-primary)] data-[state=unchecked]:bg-[var(--figaro-surface-container-highest)]"
          />
        </div>

        <label className="mt-5 block">
          <span className="text-xs text-mute2">Código de indicação</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
            className="field-control mt-1 w-full"
            placeholder="meu-negocio"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs text-mute2">Recompensa para quem indica</span>
          <input
            value={recompensa}
            onChange={(e) => setRecompensa(e.target.value)}
            className="field-control mt-1 w-full"
            placeholder="Ex.: 1 barba grátis"
          />
        </label>

        <Button
          loading={acao.estaEm("config")}
          success={acao.concluiu("config")}
          variant="primary"
          type="button"
          className="mt-5 w-full disabled:opacity-60"
          disabled={acao.ocupado}
          onClick={() =>
            acao.executar("config", () => salvarConfig({ data: { ativa, codigo, recompensa } }), {
              sucesso: "Programa de indicações salvo.",
              aoConcluir: async () => {
                await refetch();
              },
            })
          }
        >
          Salvar programa
        </Button>

        <div className="mt-5 pt-4">
          <p className="break-all text-xs text-mute">{link}</p>
          <Button
            variant="ghost"
            type="button"
            className="mt-2 flex items-center gap-2 text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
            }}
          >
            <Copy size={14} /> Copiar link de indicação
          </Button>
          {copiado ? <p className="mt-2 text-xs text-sage">Link copiado.</p> : null}
        </div>
      </div>

      {aviso ? (
        <Aviso tom="info" className="mt-4">
          {aviso}
        </Aviso>
      ) : null}

      <h2 className="mb-3 mt-8 text-sm font-semibold text-paper">Registrar indicação</h2>
      <div className="flex gap-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          className="field-control min-w-0 flex-1"
          placeholder="Nome de quem foi indicado"
        />
        <Button
          loading={acao.estaEm("registrar")}
          success={acao.concluiu("registrar")}
          variant="primary"
          type="button"
          className="shrink-0 px-4 disabled:opacity-60"
          disabled={acao.ocupado || novo.trim().length < 2}
          onClick={() =>
            acao.executar(
              "registrar",
              () => registrar({ data: { indicadorClienteId: null, indicadoNome: novo.trim() } }),
              {
                sucesso: "Indicação registrada.",
                aoConcluir: async () => {
                  setNovo("");
                  await refetch();
                },
              },
            )
          }
        >
          Adicionar
        </Button>
      </div>

      <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Acompanhamento</h2>
      {data && data.itens.length === 0 ? (
        <EmptyState text="Nenhuma indicação registrada ainda." />
      ) : null}
      <ul className="space-y-2">
        {(data?.itens ?? []).map((i) => (
          <li key={i.id}>
            <Card density="default">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{i.indicado}</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {i.indicador
                      ? `Indicado por ${i.indicador}`
                      : "Indicação registrada no negócio"}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${i.status === "convertido" ? "text-sage" : "text-mute2"}`}
                  >
                    {i.status === "convertido" ? "Virou cliente" : "Ainda sem histórico"}
                    {i.recompensa ? ` · ${i.recompensa}` : ""}
                    {i.recompensaEntregue ? " · recompensa entregue" : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-4">
                {i.status !== "convertido" ? (
                  <Button
                    loading={acao.estaEm(`converter-${i.id}`)}
                    success={acao.concluiu(`converter-${i.id}`)}
                    variant="ghost"
                    type="button"
                    className="text-xs disabled:opacity-60"
                    disabled={acao.ocupado}
                    onClick={() =>
                      acao.executar(
                        `converter-${i.id}`,
                        () => atualizar({ data: { id: i.id, acao: "converter" } }),
                        {
                          sucesso: `${i.indicado} marcado como cliente.`,
                          aoConcluir: async () => {
                            await refetch();
                          },
                        },
                      )
                    }
                  >
                    Marcar como cliente
                  </Button>
                ) : null}
                {!i.recompensaEntregue ? (
                  <Button
                    loading={acao.estaEm(`recompensar-${i.id}`)}
                    success={acao.concluiu(`recompensar-${i.id}`)}
                    variant="ghost"
                    type="button"
                    className="text-xs disabled:opacity-60"
                    disabled={acao.ocupado}
                    onClick={() =>
                      acao.executar(
                        `recompensar-${i.id}`,
                        () => atualizar({ data: { id: i.id, acao: "recompensar" } }),
                        {
                          sucesso: "Recompensa registrada.",
                          aoConcluir: async () => {
                            await refetch();
                          },
                        },
                      )
                    }
                  >
                    Recompensa entregue
                  </Button>
                ) : null}
                <ExclusaoPermanente
                  titulo="Excluir indicação permanentemente"
                  descricao={`A indicação de ${i.indicado} será apagada e não poderá ser recuperada.`}
                  onExcluir={async () => {
                    await atualizar({ data: { id: i.id, acao: "remover" } });
                  }}
                  onSucesso={() => {
                    setAviso("Indicação excluída permanentemente.");
                    refetch();
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
