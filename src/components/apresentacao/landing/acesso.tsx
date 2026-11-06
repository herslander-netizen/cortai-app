/**
 * Botões da página pública sem "login automático" (dono, 06/11/2026): `/login` e `/comecar` levam direto ao painel
 * quem já tem sessão, e quem clicava em "Entrar" ou "Começar grátis" caía lá sem entender. Aqui a página sabe se há
 * sessão e, nesse caso, troca os botões por "Abrir meu painel" (escolha explícita, vai para `/`); sem sessão, ficam
 * "Entrar" e "Começar grátis", que só abrem as telas de entrada e nunca entram sozinhos.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

const Contexto = createContext(false);

export function AcessoDaPagina({ children }: { children: ReactNode }) {
  const [logado, setLogado] = useState(false);
  useEffect(() => {
    let ativo = true;
    supabase.auth
      .getSession()
      .then(({ data }) => ativo && setLogado(Boolean(data.session)))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);
  return <Contexto.Provider value={logado}>{children}</Contexto.Provider>;
}

/** Destino e texto dos botões de "começar" e "entrar" conforme haja sessão. */
export function useAcesso() {
  const logado = useContext(Contexto);
  return {
    logado,
    comecar: logado
      ? ({ to: "/", texto: "Abrir meu painel" } as const)
      : ({ to: "/comecar", texto: null } as const),
    entrar: logado
      ? ({ to: "/", texto: "Abrir meu painel" } as const)
      : ({ to: "/login", texto: "Entrar" } as const),
  };
}
