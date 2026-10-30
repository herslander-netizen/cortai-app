/**
 * Avisos do aparelho (notificações do navegador/celular).
 * Só aparecem para quem já entrou na conta e aceitou receber.
 * Nunca pede permissão sozinho: sempre a partir de um toque da pessoa.
 */
import { useCallback, useEffect, useState } from "react";

const CHAVE_DISPENSADO = "cortai:avisos-aparelho:dispensado";
const EVENTO_DISPENSADO = "cortai:avisos-aparelho:dispensado";

export type EstadoDeAvisos = "indisponivel" | "perguntar" | "ativo" | "bloqueado";

function suportado() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function estadoAtual(): EstadoDeAvisos {
  if (!suportado()) return "indisponivel";
  const p = Notification.permission;
  if (p === "granted") return "ativo";
  if (p === "denied") return "bloqueado";
  return "perguntar";
}

export function mostrarAviso(titulo: string, corpo?: string | null, link?: string | null) {
  if (!suportado() || Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  // Com push ativo neste aparelho, quem avisa é o service worker (evita aviso duplo).
  try {
    if (localStorage.getItem("cortai:push-ativo") === "sim") return;
  } catch {
    /* segue */
  }
  try {
    const opcoes: NotificationOptions = {
      icon: "/icone-flow-v2-192.png",
      badge: "/icone-flow-v2-192.png",
      tag: link ?? titulo,
    };
    if (corpo) opcoes.body = corpo;
    const n = new Notification(titulo, opcoes);
    n.onclick = () => {
      window.focus();
      if (link) window.location.assign(link);
      n.close();
    };
  } catch {
    /* o aviso no app continua funcionando mesmo se o aparelho recusar */
  }
}

export function useAvisosDoAparelho() {
  const [estado, setEstado] = useState<EstadoDeAvisos>("indisponivel");
  const [dispensado, setDispensado] = useState(true);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setEstado(estadoAtual());
    try {
      setDispensado(localStorage.getItem(CHAVE_DISPENSADO) === "sim");
    } catch {
      setDispensado(false);
    }
    setPronto(true);
    const sincronizar = () => setDispensado(true);
    window.addEventListener(EVENTO_DISPENSADO, sincronizar);
    return () => window.removeEventListener(EVENTO_DISPENSADO, sincronizar);
  }, []);

  const pedir = useCallback(async () => {
    if (!suportado()) return false;
    try {
      const resposta = await Notification.requestPermission();
      setEstado(
        resposta === "granted" ? "ativo" : resposta === "denied" ? "bloqueado" : "perguntar",
      );
      return resposta === "granted";
    } catch {
      return false;
    }
  }, []);

  const dispensar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE_DISPENSADO, "sim");
    } catch {
      /* preferência local é opcional */
    }
    setDispensado(true);
    window.dispatchEvent(new Event(EVENTO_DISPENSADO));
  }, []);

  return { pronto, estado, dispensado, pedir, dispensar };
}
