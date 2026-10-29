import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { useSucessoDoBotao } from "@/hooks/useSucessoDoBotao";
import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import { FUSOS_DA_BARBEARIA, FUSO_BARBEARIA } from "@/lib/horarios";
import { getConfiguracaoInicial, salvarHorarios } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { EscalaDaEquipe } from "@/components/barbeiro/EscalaDaEquipe";
import { InterruptorFilaDeChegada } from "@/components/barbeiro/InterruptorFilaDeChegada";
import { InterruptorListaDeEspera } from "@/components/barbeiro/InterruptorListaDeEspera";

export const Route = createFileRoute("/barbeiro/horarios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Horários — Painel do negócio | Cortaí" },
      { name: "description", content: "Defina os dias e horários em que seu negócio atende." },
      { property: "og:title", content: "Horários — Cortaí" },
      { property: "og:description", content: "Dias e horários de funcionamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HorariosPage,
});

function HorariosPage() {
  const salvar = useServerFn(salvarHorarios);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });
  const [horarios, setHorarios] = useState<HorarioSugerido[]>(horariosPadrao());
  const [fuso, setFuso] = useState<string>(FUSO_BARBEARIA);
  const [iniciado, setIniciado] = useState(false);
  const [estado, setEstado] = useState<"pronto" | "salvando" | "salvo">("pronto");
  const salvou = useSucessoDoBotao();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!data || iniciado) return;
    setHorarios(data.horarios);
    setFuso(data.tenant.fuso);
    setIniciado(true);
  }, [data, iniciado]);

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Horários"
      subtitle="Quando o negócio atende. Vale para a agenda e para a fila."
    >
      {isLoading || (data && !iniciado) ? (
        <EsqueletoFormulario campos={6} onTentarDeNovo={() => void refetch()} />
      ) : null}
      {isError && !data ? (
        <div
          role="alert"
          className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5"
        >
          <p className="text-sm text-paper">Não conseguimos carregar os horários.</p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {data && iniciado ? (
        <>
          <label className="mt-2 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-mute">
              Fuso horário do negócio
            </span>
            <select
              className="field-control mt-2 w-full"
              value={fuso}
              onChange={(e) => setFuso(e.target.value)}
            >
              {FUSOS_DA_BARBEARIA.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-mute">
              Usado na agenda, nos horários oferecidos ao cliente e nos lembretes enviados.
            </span>
          </label>

          <InterruptorFilaDeChegada />
          <InterruptorListaDeEspera />

          <div className="mt-6" data-guia="horarios-editor">
            <EditorDeHorarios
              horarios={horarios}
              onChange={setHorarios}
              segmento={data?.tenant.segmento ?? "outro"}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            type="button"
            className="mt-8 w-full"
            disabled={estado === "salvando"}
            loading={estado === "salvando"}
            success={salvou.sucesso}
            onClick={async () => {
              setEstado("salvando");
              setErro(null);
              try {
                await salvar({ data: { horarios, fuso } });
                await refetch();
                setEstado("salvo");
                salvou.confirmar();
              } catch (e) {
                setEstado("pronto");
                setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
              }
            }}
          >
            {estado === "salvo" ? "Horários salvos" : "Salvar horários"}
          </Button>
          {erro ? (
            <p className="mt-3 text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
          <EscalaDaEquipe />
        </>
      ) : null}
    </Screen>
  );
}
