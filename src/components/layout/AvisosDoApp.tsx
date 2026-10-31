import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";

/**
 * Mensagens rápidas no padrão do Figaro: no celular aparecem embaixo (acima da barra de navegação)
 * e no computador no canto superior direito. Somem sozinhas em 4 s ou com um arrasto.
 */
export function AvisosDoApp() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setDesktop(mq.matches);
    const ouvir = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);

  return (
    <Toaster
      position={desktop ? "top-right" : "bottom-center"}
      offset={desktop ? 16 : 96}
      duration={4000}
    />
  );
}
