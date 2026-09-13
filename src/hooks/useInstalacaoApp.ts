import { useSyncExternalStore } from "react";

import {
  adiarConvite,
  assinarInstalacao,
  conviteAdiado,
  dentroDeIframe,
  ehAndroid,
  ehIOS,
  ehMobile,
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
  // Android às vezes não dispara o prompt (aba anônima, primeiro acesso):
  // nesses casos ainda queremos ensinar o caminho manual.
  const instrucaoManual = !bloqueado && !estado.prompt && ehMobile();

  return {
    sistema: ehIOS() ? ("ios" as const) : ehAndroid() ? ("android" as const) : ("outro" as const),
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
