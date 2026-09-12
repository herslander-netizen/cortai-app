import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, Screen } from "@/components/layout/Screen";
import { getMarcaCliente } from "@/lib/marca.functions";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Início — Cortaí" },
      { name: "description", content: "Seu próximo corte e sua barbearia favorita no Cortaí." },
      { property: "og:title", content: "Início — Cortaí" },
      { property: "og:description", content: "Seu próximo corte em um toque." },
    ],
  }),
  component: InicioCliente,
});

function InicioCliente() {
  const { data } = useQuery({ queryKey: ["marca-cliente"], queryFn: () => getMarcaCliente() });
  return (
    <Screen title={data?.nome ?? "Olá"} subtitle={data?.texto_boas_vindas ?? "Sua barbearia, no seu tempo."}>
      {data?.logo_signed_url ? (
        <img src={data.logo_signed_url} alt={`Logo ${data.nome}`} className="mb-6 h-20 w-20 rounded-lg object-contain" />
      ) : null}
      <EmptyState text="Nada por aqui ainda." />
    </Screen>
  );
}
