import { useSyncExternalStore } from "react";

import {
  adiarConvite,
  assinarInstalacao,
  conviteAdiado,
  dentroDeIframe,
  ehIOS,
  instalarAgora,
  jaInstalouAntes,
  lerInstalacao,
  modoStandalone,
} from "@/lib/pwa/instalacao";

const estadoServidor = { prompt: null, instalado: false };

/**
 * Diz se faz sentido convidar para instalar o Cortaí neste dispositivo.
 * Nunca promete instalação: no iPhone só existe o caminho manual.
 */
export function useInstalacaoApp() {
  const estado = useSyncExternalStore(assinarInstalacao, lerInstalacao, () => estadoServidor);
  const standalone = modoStandalone();
  const instalado = estado.instalado || jaInstalouAntes();
  const bloqueado = dentroDeIframe() || standalone || instalado;
  const podeInstalarAgora = Boolean(estado.prompt) && !bloqueado;
  const instrucaoManual = !bloqueado && !estado.prompt && ehIOS();

  return {
    standalone,
    instalado,
    podeInstalarAgora,
    instrucaoManual,
    /** Só exibimos alguma coisa quando há prompt real ou instrução real. */
    disponivel: podeInstalarAgora || instrucaoManual,
    adiado: conviteAdiado(),
    instalar: instalarAgora,
    adiar: adiarConvite,
  };
}
