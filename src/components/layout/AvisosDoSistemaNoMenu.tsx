/**
 * Avisos de configuração do sistema no menu lateral (dono, 06/11/2026): conexão do WhatsApp, alerta da plataforma e
 * período de teste saem do sininho e aparecem aqui, no mesmo cartão dos outros avisos do menu. Só os não lidos; tocar
 * abre o destino do aviso e marca como lido. Mesma consulta do sininho (um cache só).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CartaoDeAvisoDoMenu } from "@/components/layout/CartaoDeAvisoDoMenu";
import {
  ehAvisoDeSistema,
  listarNotificacoes,
  marcarComoLida,
  type Notificacao,
} from "@/lib/notificacoes";
import { ehLinkDoWhatsApp } from "@/lib/whatsapp/pedido-de-atendimento";

export function AvisosDoSistemaNoMenu({
  tenantId,
  fechar,
}: {
  tenantId: string | null;
  fechar: () => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["notificacoes", tenantId],
    queryFn: () => listarNotificacoes(tenantId!),
    enabled: !!tenantId,
    staleTime: 30000,
  });
  const pendentes = (data ?? []).filter((a) => ehAvisoDeSistema(a) && !a.lida_em).slice(0, 3);
  if (!pendentes.length) return null;

  async function resolver(aviso: Notificacao, abrir: boolean) {
    try {
      await marcarComoLida(aviso.id);
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes", tenantId] });
    }
    if (!abrir || !aviso.link) return;
    if (ehLinkDoWhatsApp(aviso.link)) {
      window.open(aviso.link, "_blank", "noopener,noreferrer");
      return;
    }
    fechar();
    void navigate({ to: aviso.link as never });
  }

  return (
    <div className="space-y-[3px]" data-avisos-do-sistema="">
      {pendentes.map((aviso) => (
        <CartaoDeAvisoDoMenu
          key={aviso.id}
          icone={Settings2}
          titulo={aviso.titulo}
          texto={aviso.corpo ?? ""}
        >
          {aviso.link ? (
            <Button
              className="h-10 rounded-full px-5 text-sm"
              onClick={() => void resolver(aviso, true)}
            >
              Resolver
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="h-10 rounded-full px-3 text-sm text-mute"
            onClick={() => void resolver(aviso, false)}
          >
            Entendi
          </Button>
        </CartaoDeAvisoDoMenu>
      ))}
    </div>
  );
}
