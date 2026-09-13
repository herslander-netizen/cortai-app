import { createFileRoute, Outlet } from "@tanstack/react-router";
import { exigirPapel } from "@/lib/guarda";
import { BarbershopTabBar } from "@/components/layout/BarbershopTabBar";

export const Route = createFileRoute("/barbeiro")({
  ssr: false,
  beforeLoad: () => exigirPapel("barbeiro"),
  component: BarberLayout,
});

function BarberLayout() {
  return (
    <div className="management-shell">
      <Outlet />
      <BarbershopTabBar />
    </div>
  );
}
