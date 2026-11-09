import { useCallback, useEffect, useState } from "react";

export const VERSAO_DA_POLITICA = "2026-11-08";
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
    detalhe: "Mantêm autenticação, segurança e funções essenciais do aplicativo. Não podem ser desligados pelo painel.",
    fixa: true,
  },
  {
    chave: "preferencias",
    titulo: "Preferências",
    detalhe: "Personalização adicional quando houver recurso facultativo. O tema básico da interface é essencial.",
  },
  {
    chave: "analises",
    titulo: "Análises e estatísticas",
    detalhe: "Medições opcionais de uso, quando habilitadas. Registros de operação e segurança são tratados separadamente.",
  },
  {
    chave: "marketing",
    titulo: "Marketing",
    detalhe: "Rastreadores opcionais de campanhas quando habilitados. Esta escolha não autoriza mensagens comerciais por WhatsApp.",
  },
];

export function lerConsentimento(): Consentimento | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const dado = JSON.parse(bruto) as Consentimento;
    if (
      dado?.versao !== VERSAO_DA_POLITICA ||
      dado?.categorias?.necessarios !== true ||
      typeof dado.categorias.preferencias !== "boolean" ||
      typeof dado.categorias.analises !== "boolean" ||
      typeof dado.categorias.marketing !== "boolean" ||
      typeof dado.registradoEm !== "string"
    )
      return null;
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
