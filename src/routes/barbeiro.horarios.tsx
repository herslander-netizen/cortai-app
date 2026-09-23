import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { EditorDeHorarios } from "@/components/onboarding/EditorDeHorarios";
import { horariosPadrao, type HorarioSugerido } from "@/lib/ia/assistente";
import { FUSOS_DA_BARBEARIA, FUSO_BARBEARIA } from "@/lib/horarios";
import { getConfiguracaoInicial, salvarHorarios } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/barbeiro/horarios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Horários — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Defina os dias e horários em que sua barbearia atende." },
      { property: "og:title", content: "Horários — Cortaí" },
      { property: "og:description", content: "Dias e horários de funcionamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HorariosPage,
});

function HorariosPage() {
  const salvar = useServerFn(salvarHorarios);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });
  const [horarios, setHorarios] = useState<HorarioSugerido[]>(horariosPadrao());
  const [fuso, setFuso] = useState<string>(FUSO_BARBEARIA);
  const [iniciado, setIniciado] = useState(false);
  const [estado, setEstado] = useState<"pronto" | "salvando" | "salvo">("pronto");
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
      subtitle="Quando a barbearia atende. Vale para a agenda e para a fila."
    >
      {isLoading ? <Carregando /> : null}
      <label className="mt-2 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-mute">Fuso horário da barbearia</span>
        <select
          className="mt-2 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper outline-none focus:border-gold"
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

      <div className="mt-6" data-guia="horarios-editor">
        <EditorDeHorarios horarios={horarios} onChange={setHorarios} />
      </div>

      <button
        type="button"
        className="btn-primary mt-8 w-full py-3.5"
        disabled={estado === "salvando"}
        onClick={async () => {
          setEstado("salvando");
          setErro(null);
          try {
            await salvar({ data: { horarios, fuso } });
            await refetch();
            setEstado("salvo");
          } catch (e) {
            setEstado("pronto");
            setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
          }
        }}
      >
        {estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Horários salvos" : "Salvar horários"}
      </button>
      {erro ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </Screen>
  );
}
