import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type EstadoDoLayoutEquipe = {
  menuAberto: boolean;
  setMenuAberto: (aberto: boolean) => void;
};

const ContextoLayoutEquipe = createContext<EstadoDoLayoutEquipe | null>(null);

export function ProvedorLayoutEquipe({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const valor = useMemo(() => ({ menuAberto, setMenuAberto }), [menuAberto]);

  return <ContextoLayoutEquipe.Provider value={valor}>{children}</ContextoLayoutEquipe.Provider>;
}

export function useLayoutEquipe() {
  return useContext(ContextoLayoutEquipe);
}