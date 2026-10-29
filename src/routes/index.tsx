import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { destinoDoPapel, sessaoCompartilhada } from "@/lib/guarda";

/**
 * "/": com sessão, vai para a área do papel; sem sessão, abre a tela de entrada (sequência animada
 * do Flow em `/login`). A apresentação completa continua em `/apresentacao` (decisão do dono, 22/10).
 */
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", replace: true });
    const sessao = await sessaoCompartilhada();
    throw redirect({ to: destinoDoPapel(sessao) });
  },
});
