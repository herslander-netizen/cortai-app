import { useState, useSyncExternalStore } from "react";

import { useAvisosDoAparelho } from "@/lib/avisos-do-navegador";
import { useConsentimento } from "@/lib/consentimento";
import { useModoFoco } from "@/lib/modo-foco";
import { precisaInstalarParaPush } from "@/lib/push/aparelho";
import { ativarAvisosDaEquipe } from "@/lib/push/ativar";

/** Regras únicas do convite "Ativar avisos" (convite flutuante e cartão do menu). */
export function useConviteDeAvisos(equipe?: string | null) {
  const { pronto, estado, dispensado, pedir, dispensar } = useAvisosDoAparelho();
  const [instalarPrimeiro, setInstalarPrimeiro] = useState(false);
  const { consentimento } = useConsentimento();
  const foco = useModoFoco();
  const elegivel = !foco && !!consentimento && pronto && !dispensado && estado === "perguntar";

  async function ativar() {
    if (equipe) {
      if (precisaInstalarParaPush()) {
        setInstalarPrimeiro(true);
        return;
      }
      const r = await ativarAvisosDaEquipe(equipe);
      if (r !== "ativo" && r !== "so_no_app") dispensar();
      return;
    }
    const ok = await pedir();
    if (!ok) dispensar();
  }

  return { elegivel, instalarPrimeiro, ativar, dispensar };
}

/** Enquanto o cartão do menu está na tela, o convite flutuante fica escondido. */
let cartaoNoMenu = false;
const ouvintes = new Set<() => void>();
export function marcarCartaoDeAvisosNoMenu(visivel: boolean) {
  if (cartaoNoMenu === visivel) return;
  cartaoNoMenu = visivel;
  ouvintes.forEach((f) => f());
}
export function useCartaoDeAvisosNoMenu() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => cartaoNoMenu,
    () => false,
  );
}
