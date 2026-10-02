import { useEffect, useState } from "react";

import {
  armazenamentoLocal,
  lerMemoriaCliente,
  lerRascunho,
  salvarRascunho,
  type MemoriaCliente,
  type RascunhoConversa,
} from "@/lib/conversa/memoria-cliente";

export type Abertura = "futuro" | "retomar" | "sempre" | null;

/**
 * Memória local opcional: quem volta, rascunho de 30 min e a primeira bolha.
 * Sem armazenamento (navegador interno), tudo segue como cliente novo.
 */
export function useMemoriaDaConversa({
  slug,
  servicoIds,
  temFuturo,
  rascunhoAtual,
}: {
  slug: string;
  servicoIds: string[];
  temFuturo: boolean;
  rascunhoAtual: Omit<RascunhoConversa, "salvoEm"> | null;
}) {
  const [memoria, setMemoria] = useState<MemoriaCliente | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoConversa | null>(null);
  const [abertura, setAbertura] = useState<Abertura>(null);

  useEffect(() => {
    const storage = armazenamentoLocal();
    const mem = lerMemoriaCliente(slug, storage);
    const ras = lerRascunho(slug, storage);
    setMemoria(mem);
    setRascunho(ras);
    const valido = (id?: string) => Boolean(id && servicoIds.includes(id));
    if (temFuturo) setAbertura("futuro");
    else if (ras && valido(ras.servicoId)) setAbertura("retomar");
    else if (mem && valido(mem.ultimoServicoId)) setAbertura("sempre");
    // Decidido uma vez na abertura; depois a conversa segue pelo cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const chave = rascunhoAtual ? JSON.stringify(rascunhoAtual) : null;
  useEffect(() => {
    if (rascunhoAtual) salvarRascunho(slug, rascunhoAtual, armazenamentoLocal());
    // A chave serializada representa o rascunho atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, chave]);

  return { memoria, rascunho, abertura, setAbertura };
}
