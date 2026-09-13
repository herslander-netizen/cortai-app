import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/barbeiro/clientes")({
  head: () => ({ meta: [
    { title: "Clientes — Cortaí Gestão" },
    { name: "description", content: "Relacionamento e histórico dos clientes da barbearia." },
    { property: "og:title", content: "Clientes — Cortaí Gestão" },
    { property: "og:description", content: "Relacionamento e histórico dos clientes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Outlet />,
});
