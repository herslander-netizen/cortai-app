import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Lock } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { brl } from "@/lib/format";
import { aviso } from "@/lib/avisos";
import { escolherPlanoDaBarbearia, getPlanosDaBarbearia } from "@/lib/planos.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barbeiro/plano")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Plano da barbearia — Cortaí Gestão" },
      { name: "description", content: "Escolha o plano e veja exatamente o que está liberado para a sua barbearia." },
      { property: "og:title", content: "Plano da barbearia — Cortaí" },
      { property: "og:description", content: "O plano decide o que aparece no painel da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanoPage,
});

function limite(valor: number | null) {
  return valor == null ? "sem limite" : String(valor);
}

function PlanoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const escolher = useServerFn(escolherPlanoDaBarbearia);
  const [salvando, setSalvando] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["planos-da-barbearia"],
    queryFn: () => getPlanosDaBarbearia(),
    staleTime: 300_000,
  });

  async function selecionar(chave: string) {
    if (!data?.podeTrocar || chave === data.atual) return;
    setSalvando(chave);
    try {
      const r = await escolher({ data: { chave } });
      aviso.ok(`Plano ${r.plano} aplicado. Seus dados continuam como estavam.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["planos-da-barbearia"] }),
        queryClient.invalidateQueries({ queryKey: ["capacidades"] }),
        queryClient.invalidateQueries({ queryKey: ["implantacao"] }),
      ]);
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não consegui trocar o plano agora.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <Screen title="Plano da barbearia" subtitle="O plano decide o que aparece no painel, no menu e na configuração.">
      {isLoading || !data ? (
        <EsqueletoLista linhas={3} />
      ) : (
        <div className="space-y-3">
          {data.planos.map((plano) => {
            const atual = plano.chave === data.atual;
            const incluidos = plano.recursos.filter((r) => r.liberado);
            const fora = plano.recursos.filter((r) => !r.liberado);
            return (
              <article
                key={plano.chave}
                className={`card p-5 ${atual ? "border-gold" : ""}`}
                aria-current={atual ? "true" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-paper">{plano.nome}</h2>
                    {plano.descricao ? <p className="mt-1 text-xs text-mute">{plano.descricao}</p> : null}
                  </div>
                  {atual ? (
                    <span className="rounded-full border border-gold px-2.5 py-1 text-[10px] font-bold uppercase text-gold">
                      Plano atual
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm font-semibold text-paper">
                  {plano.precoMensalCentavos > 0 ? `${brl(plano.precoMensalCentavos)} / mês` : "Sem cobrança"}
                  {plano.diasTeste > 0 ? <span className="text-xs font-normal text-mute"> · {plano.diasTeste} dias de teste</span> : null}
                </p>

                <ul className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-mute">
                  <li>Profissionais: {limite(plano.limites.profissionais)}</li>
                  <li>Clientes: {limite(plano.limites.clientes)}</li>
                  <li>Agendamentos/mês: {limite(plano.limites.agendamentosMes)}</li>
                  <li>Unidades: {limite(plano.limites.unidades)}</li>
                </ul>

                <div className="mt-4 space-y-1">
                  {incluidos.map((r) => (
                    <p key={r.chave} className="flex items-center gap-2 text-xs text-paper">
                      <Check size={13} className="text-gold" /> {r.rotulo}
                    </p>
                  ))}
                  {fora.length ? (
                    <div className="mt-2 border-t border-line pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-mute2">
                        Disponíveis em outros planos
                      </p>
                      {fora.map((r) => (
                        <p key={r.chave} className="mt-1 flex items-center gap-2 text-xs text-mute2">
                          <Lock size={12} /> {r.rotulo}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>

                {atual ? (
                  <Button variant="ghost" type="button" className="btn-secondary mt-5 w-full py-3" onClick={() => void navigate({ to: "/barbeiro/configurar" })}>
                    Continuar a configuração
                  </Button>
                ) : (
                  <Button variant="ghost"
                    type="button"
                    className="btn-primary mt-5 w-full py-3"
                    disabled={!data.podeTrocar || salvando !== null}
                    onClick={() => void selecionar(plano.chave)}
                  >
                    {salvando === plano.chave ? "Aplicando…" : `Escolher ${plano.nome}`}
                  </Button>
                )}
              </article>
            );
          })}
          {!data.podeTrocar ? (
            <p className="text-xs text-mute2">
              Só quem pode alterar os dados da barbearia troca o plano. Fale com o responsável.
            </p>
          ) : null}
          <p className="text-xs text-mute2">
            Trocar de plano não apaga nada: clientes, agendamentos e serviços continuam salvos.
          </p>
        </div>
      )}
    </Screen>
  );
}
