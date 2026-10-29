import { useCallback, useEffect, useState } from "react";

export const VERSAO_DA_POLITICA = "2026-09-14";
const CHAVE = "cortai:consentimento";
const EVENTO = "cortai:consentimento-alterado";

export type Categorias = {
  necessarios: true;
  preferencias: boolean;
  analises: boolean;
  marketing: boolean;
};

export type Consentimento = {
  versao: string;
  registradoEm: string;
  categorias: Categorias;
};

export const TODAS_ACEITAS: Categorias = {
  necessarios: true,
  preferencias: true,
  analises: true,
  marketing: true,
};

export const SOMENTE_NECESSARIAS: Categorias = {
  necessarios: true,
  preferencias: false,
  analises: false,
  marketing: false,
};

export const DESCRICAO_DAS_CATEGORIAS: {
  chave: keyof Categorias;
  titulo: string;
  detalhe: string;
  fixa?: boolean;
}[] = [
  {
    chave: "necessarios",
    titulo: "Necessários",
    detalhe: "Mantêm o login, a segurança e as telas do Flow funcionando. Sempre ativos.",
    fixa: true,
  },
  {
    chave: "preferencias",
    titulo: "Preferências",
    detalhe: "Lembram escolhas como tema e dicas para você não repetir ajustes.",
  },
  {
    chave: "analises",
    titulo: "Análises e estatísticas",
    detalhe: "Ajudam a entender como o Flow é usado, de forma agregada.",
  },
  {
    chave: "marketing",
    titulo: "Marketing",
    detalhe: "Permitem medir campanhas e comunicações sobre o Flow.",
  },
];

export function lerConsentimento(): Consentimento | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dado = JSON.parse(bruto) as Consentimento;
    if (!dado?.categorias || dado.versao !== VERSAO_DA_POLITICA) return null;
    return dado;
  } catch {
    return null;
  }
}

export function salvarConsentimento(categorias: Categorias): Consentimento {
  const registro: Consentimento = {
    versao: VERSAO_DA_POLITICA,
    registradoEm: new Date().toISOString(),
    categorias: { ...categorias, necessarios: true },
  };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(registro));
  } catch {
    /* sem armazenamento local seguimos apenas com os necessários */
  }
  window.dispatchEvent(new CustomEvent(EVENTO));
  return registro;
}

/** Indica se uma categoria opcional já foi autorizada. Use antes de carregar qualquer script opcional. */
export function categoriaPermitida(categoria: keyof Categorias) {
  if (categoria === "necessarios") return true;
  return lerConsentimento()?.categorias[categoria] === true;
}

export function useConsentimento() {
  const [pronto, setPronto] = useState(false);
  const [consentimento, setConsentimento] = useState<Consentimento | null>(null);

  useEffect(() => {
    setConsentimento(lerConsentimento());
    setPronto(true);
    const atualizar = () => setConsentimento(lerConsentimento());
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  const registrar = useCallback((categorias: Categorias) => {
    setConsentimento(salvarConsentimento(categorias));
  }, []);

  return { pronto, consentimento, registrar };
}
