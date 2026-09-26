import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { esquecerSessao } from "@/lib/guarda";

/**
 * Quando o vínculo ou a função da pessoa muda na equipe (tenant_usuarios),
 * limpa o cache da sessão e recarrega as permissões na hora — sem esperar
 * os 5 minutos do cache do navegador. A proteção real continua no banco
 * (RLS); aqui só atualizamos o que a tela mostra.
 */
export function useSessaoTempoReal(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const canal = supabase
      .channel(`sessao-vinculo-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tenant_usuarios", filter: `user_id=eq.${userId}` },
        () => {
          esquecerSessao();
          void queryClient.invalidateQueries({ queryKey: ["sessao"] });
          void router.invalidate();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, queryClient, router]);
}
