import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import {
  buscarVersaoPublicada,
  situacaoDaVersao,
  URL_DE_ATUALIZACAO,
  type SituacaoDaVersao,
} from "@/lib/versao";
import { useModoFoco } from "@/lib/modo-foco";
import { EVENTO_ABRIR_NOVIDADES } from "@/components/sistema/NovidadesDaVersao";
import { AtualizacaoObrigatoria } from "@/components/pwa/AtualizacaoObrigatoria";
import { Button } from "@/components/ui/button";
import { deveBloquear, INTERVALO_DE_CHECAGEM_MS } from "@/lib/pwa/atualizacao-obrigatoria";

const CHAVE_ADIADO = "cortai:versao-adiada";

/**
 * Aviso de nova versão.
 * - Abaixo da versão mínima: modal que não fecha, com "Atualizar agora".
 * - Só recomendada: faixa discreta com "Atualizar" e "Agora não".
 * Nada aparece quando o aplicativo está em dia.
 */
export function AvisoDeVersao() {
  const foco = useModoFoco();
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const [situacao, setSituacao] = useState<SituacaoDaVersao>("em_dia");
  const [destino, setDestino] = useState(URL_DE_ATUALIZACAO);
  const [adiado, setAdiado] = useState(true);

  useEffect(() => {
    let vivo = true;
    const verificar = async () => {
      const info = await buscarVersaoPublicada();
      if (!vivo) return;
      // Sem internet ou leitura falha: nunca bloquear.
      if (!info) return setSituacao("em_dia");
      const estado = situacaoDaVersao(info);
      setSituacao(estado);
      setDestino(info.url);
      if (estado === "recomendada") {
        setAdiado(sessionStorage.getItem(CHAVE_ADIADO) === info.atual);
      } else {
        setAdiado(false);
      }
    };
    void verificar();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void verificar();
    };
    const relogio = window.setInterval(() => void verificar(), INTERVALO_DE_CHECAGEM_MS);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      vivo = false;
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);

  function atualizar() {
    window.location.replace(destino);
  }

  if (deveBloquear({ situacao, caminho, modoFoco: foco })) return <AtualizacaoObrigatoria />;

  if (foco || situacao === "obrigatoria") return null;

  if (situacao !== "recomendada" || adiado) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-2 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] p-3">
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_NOVIDADES));
          }}
          className="order-1 h-12 min-w-0 basis-full justify-start rounded-lg px-3 text-left text-xs sm:flex-1"
        >
          Flow 3.0 disponível
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={atualizar}
          className="order-2 h-12 flex-1 rounded-lg px-3 text-xs sm:flex-none"
        >
          Atualizar
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            void buscarVersaoPublicada().then((info) => {
              if (info) sessionStorage.setItem(CHAVE_ADIADO, info.atual);
            });
            setAdiado(true);
          }}
          className="order-3 h-12 flex-1 rounded-lg px-3 text-xs sm:flex-none"
        >
          Agora não
        </Button>
      </div>
    </div>
  );
}
