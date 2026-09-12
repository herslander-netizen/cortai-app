import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, MapPin } from "lucide-react";
import { Signature } from "@/components/layout/Signature";
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
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col pb-28">
      <header className="px-5 pb-6 pt-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {data?.logo_signed_url ? (
              <img src={data.logo_signed_url} alt={`Logo ${data.nome}`} className="h-11 w-11 shrink-0 rounded-md object-contain" />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold leading-tight text-paper">{data?.nome ?? "Cortaí"}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mute"><Clock3 size={13} aria-hidden /> Agendamentos online</p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-mute"><MapPin size={13} className="shrink-0" aria-hidden /><span className="truncate">{data?.endereco ?? "Atendimento na barbearia"}</span></p>
            </div>
          </div>
          <span className="mt-1 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden /> Agenda online
          </span>
        </div>
      </header>

      <main className="flex-1 px-5">
        <section className="border-y border-line py-7">
          <p className="max-w-[300px] text-[32px] font-bold leading-[1.12] text-paper">Seu estilo, no seu horário.</p>
          <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-mute">
            {data?.texto_boas_vindas ?? "Sua barbearia, no seu tempo."}
          </p>
          <Link to="/app/agendar" className="btn-primary mt-5 px-6 py-3.5">Agendar horário</Link>
        </section>

        <section className="py-7">
          <h2 className="text-xs font-semibold uppercase text-mute">Seu próximo corte</h2>
          <div className="mt-4 border-y border-line py-5">
            <p className="text-base font-semibold text-paper">Nenhum horário marcado</p>
            <p className="mt-1 text-sm text-mute">Escolha o melhor dia para o próximo corte.</p>
          </div>
        </section>
      </main>
      <Signature />
    </div>
  );
}
