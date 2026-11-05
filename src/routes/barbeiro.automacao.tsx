import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * "Automação do WhatsApp" virou parte da aba Conexão do WhatsApp (reorganização do dono, 05/11/2026). O endereço
 * continua existindo só para levar avisos antigos, favoritos e notificações ao lugar novo.
 */
export const Route = createFileRoute("/barbeiro/automacao")({
  beforeLoad: () => {
    throw redirect({ to: "/barbeiro/cortai", replace: true });
  },
});
