import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/use-mobile";
import { APPEARANCE_EVENT } from "@/lib/aparencia";
import { Toaster } from "@/components/ui/sonner";

/**
 * Mensagens rápidas: no celular aparecem embaixo (acima da barra de navegação)
 * e no computador no canto superior direito.
 * O Sonner acompanha o tema efetivo do Flow, não apenas o tema do aparelho.
 */
export function AvisosDoApp() {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [tema, setTema] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const sincronizar = () =>
      setTema(document.documentElement.classList.contains("light") ? "light" : "dark");
    sincronizar();
    window.addEventListener(APPEARANCE_EVENT, sincronizar);
    return () => window.removeEventListener(APPEARANCE_EVENT, sincronizar);
  }, []);

  return (
    <Toaster
      theme={tema}
      position={desktop ? "top-right" : "bottom-center"}
      offset={desktop ? 16 : 96}
      duration={4000}
      closeButton
    />
  );
}
