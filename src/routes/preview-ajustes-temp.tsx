import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { DrawerAjustes } from "@/components/layout/DrawerAjustes";

export const Route = createFileRoute("/preview-ajustes-temp")({
  component: PreviewAjustesTemp,
});

function PreviewAjustesTemp() {
  const aberto = useRef(false);
  useEffect(() => {
    if (aberto.current) return;
    aberto.current = true;
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('button[aria-label="Abrir ajustes"]')?.click();
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-dvh bg-ink p-4">
      <DrawerAjustes podeAlterarIdentidade={false} fecharDrawer={() => {}} />
    </div>
  );
}
