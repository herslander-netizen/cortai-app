import { createFileRoute, Link } from "@tanstack/react-router";
import { Signature } from "@/components/layout/Signature";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cortaí — Agendamento para barbearias" },
      {
        name: "description",
        content:
          "Cortaí conecta clientes, barbeiros e barbearias em um só lugar: agenda, histórico e gestão.",
      },
      { property: "og:title", content: "Cortaí — Agendamento para barbearias" },
      {
        property: "og:description",
        content: "Agende, gerencie e acompanhe sua barbearia pelo celular.",
      },
    ],
  }),
  component: Index,
});

const areas = [
  { to: "/app", label: "Sou cliente", hint: "Agendar horário" },
  { to: "/barbeiro", label: "Sou barbeiro", hint: "Minha agenda" },
  { to: "/admin", label: "Admin da plataforma", hint: "Barbearias e planos" },
] as const;

function Index() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5">
      <div className="flex-1 pt-20">
        <p className="text-sm tracking-[0.18em] text-mute">CORTAÍ</p>
        <h1 className="screen-title mt-3">Escolha por onde entrar</h1>
        <p className="mt-2 text-sm text-mute">
          Cada barbearia tem seu próprio espaço no Cortaí.
        </p>

        <ul className="mt-10">
          {areas.map((area, i) => (
            <li key={area.to} className={i === 0 ? "" : "border-t border-line"}>
              <Link
                to={area.to}
                className="flex items-center justify-between py-4 transition-colors active:bg-ink2"
              >
                <span>
                  <span className="block text-[15px] font-semibold text-paper">
                    {area.label}
                  </span>
                  <span className="block text-xs text-mute">{area.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link to="/app" className="btn-primary mt-10 w-full">
          Começar
        </Link>
      </div>
      <Signature />
    </div>
  );
}
