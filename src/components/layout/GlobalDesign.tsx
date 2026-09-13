import { useQuery } from "@tanstack/react-query";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { getGlobalDesign } from "@/lib/plataforma-publica.functions";

export function GlobalDesign({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["global-design"],
    queryFn: () => getGlobalDesign(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data?.tipografia || data.tipografia === "Montserrat") return;
    const id = "fonte-configurada-cortai";
    if (document.getElementById(id)) return;
    const familia = data.tipografia === "Sora" ? "Sora" : "Work+Sans";
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${familia}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [data?.tipografia]);

  const style = data ? {
    "--ink": data.cor_fundo, "--background": data.cor_fundo,
    "--ink2": data.cor_superficie, "--card": data.cor_superficie,
    "--gold": data.cor_primaria, "--primary": data.cor_primaria,
    "--paper": data.cor_texto, "--foreground": data.cor_texto,
    "--radius": `${data.raio_px}px`, "--font-sans": `"${data.tipografia}", ui-sans-serif, system-ui, sans-serif`,
  } as CSSProperties : undefined;
  return <div className="min-h-screen" style={style}>{children}</div>;
}