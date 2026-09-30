import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { EditorDeServicos, type ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { getConfiguracaoInicial, salvarServicos } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barbeiro/servicos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Serviços — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Defina serviços, duração e preços do seu negócio." },
      { property: "og:title", content: "Serviços — Cortaí" },
      { property: "og:description", content: "Cortes, duração e preços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ServicosPage,
});

function ServicosPage() {
  const salvar = useServerFn(salvarServicos);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });
  const [servicos, setServicos] = useState<ServicoEditavel[]>([]);
  const [iniciado, setIniciado] = useState(false);
  const [estado, setEstado] = useState<"pronto" | "salvando" | "salvo">("pronto");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!data || iniciado) return;
    setServicos(
      data.servicos
        .filter((s) => s.ativo)
        .map((s) => ({
          id: s.id,
          nome: s.nome,
          categoria: s.categoria,
          duracaoMin: s.duracaoMin,
          precoCentavos: s.precoCentavos,
           profissionalIds: s.profissionalIds,
          retornoDias: s.retornoDias,
        })),
    );
    setIniciado(true);
  }, [data, iniciado]);

  return (
    <Screen voltarPara="/barbeiro/mais" title="Serviços" subtitle="O que você oferece e por quanto.">
      {isLoading ? <Carregando /> : null}
      <div data-guia="servicos-editor">
        <EditorDeServicos servicos={servicos} onChange={setServicos} segmento={data?.tenant.segmento ?? "outro"} />
      </div>

      <Button variant="ghost"
        type="button"
        className="btn-primary mt-8 w-full py-3.5"
        disabled={estado === "salvando" || servicos.filter((s) => s.nome.trim().length >= 2).length === 0}
        onClick={async () => {
          setEstado("salvando");
          setErro(null);
          try {
            await salvar({
              data: {
                servicos: servicos
                  .filter((s) => s.nome.trim().length >= 2)
                  .map((s) => ({
                    ...(s.id ? { id: s.id } : {}),
                    nome: s.nome.trim(),
                    duracaoMin: s.duracaoMin,
                    precoCentavos: s.precoCentavos,
                    categoria: s.categoria,
                    ...(s.profissionalIds !== undefined ? { profissionalIds: s.profissionalIds } : {}),
          ...(s.retornoDias !== undefined ? { retornoDias: s.retornoDias } : {}),
                  })),
              },
            });
            setIniciado(false);
            await refetch();
            setEstado("salvo");
          } catch (e) {
            setEstado("pronto");
            setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
          }
        }}
      >
        {estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Serviços salvos" : "Salvar serviços"}
      </Button>
      {erro ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
    </Screen>
  );
}
