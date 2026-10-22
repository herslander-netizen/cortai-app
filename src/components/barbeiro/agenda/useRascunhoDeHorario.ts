import { useCallback, useEffect, useMemo, useState } from "react";

import { vibrar } from "@/lib/vibrar";
import {
  aplicarEdicao,
  motivoDaRecusa,
  TEXTO_DO_MOTIVO,
  type MotivoDaRecusa,
} from "@/lib/remarcacao-regras";

type ItemDeHorario = { id: string; inicio: string; fim: string };

type Rascunho = {
  id: string;
  deltaInicioMin: number;
  deltaDuracaoMin: number;
  /** Avisar o cliente da mudança: começa desligado, quem edita decide. */
  avisar: boolean;
};

/**
 * Rascunho de "editar horário": arrastar ou esticar só propõe a mudança na tela.
 * Nada é gravado até Salvar; Descartar volta ao horário original.
 */
export function useRascunhoDeHorario<T extends ItemDeHorario>({
  itens,
  dia,
  fuso,
  agora,
  salvar,
  permanenciaDoSucesso = 1000,
}: {
  itens: T[];
  dia: string;
  fuso: string;
  agora: number;
  salvar: (original: T, novo: { inicio: string; fim: string }, avisar: boolean) => Promise<boolean>;
  /** Quanto o "Pronto!" fica na barra antes de fechar a edição (1000 ms no Figaro). */
  permanenciaDoSucesso?: number;
}) {
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Trocar de dia encerra a edição: o rascunho é só deste dia.
  useEffect(() => setRascunho(null), [dia]);

  const original = useMemo(
    () => (rascunho ? (itens.find((i) => i.id === rascunho.id) ?? null) : null),
    [itens, rascunho],
  );
  // O atendimento sumiu da agenda (cancelado, por exemplo): não há o que editar.
  useEffect(() => {
    if (rascunho && !original) setRascunho(null);
  }, [rascunho, original]);

  const novo = useMemo(
    () =>
      rascunho && original
        ? aplicarEdicao(original, rascunho.deltaInicioMin, rascunho.deltaDuracaoMin)
        : null,
    [rascunho, original],
  );

  const motivo: MotivoDaRecusa | null =
    original && novo
      ? motivoDaRecusa({
          inicio: novo.inicio,
          fim: novo.fim,
          inicioOriginal: new Date(original.inicio).getTime(),
          agora,
          dia,
          fuso,
        })
      : null;

  /** Soma um deslocamento (início) ou uma variação de duração ao rascunho do item. */
  const propor = useCallback((id: string, deltaInicioMin: number, deltaDuracaoMin = 0) => {
    setRascunho((atual) => {
      const base: Rascunho =
        atual && atual.id === id
          ? atual
          : { id, deltaInicioMin: 0, deltaDuracaoMin: 0, avisar: false };
      const proximo = {
        ...base,
        deltaInicioMin: base.deltaInicioMin + deltaInicioMin,
        deltaDuracaoMin: base.deltaDuracaoMin + deltaDuracaoMin,
      };
      return proximo;
    });
  }, []);

  const aplicar = useCallback(
    (lista: T[]): T[] => {
      if (!rascunho || !novo) return lista;
      return lista.map((i) =>
        i.id === rascunho.id
          ? {
              ...i,
              inicio: new Date(novo.inicio).toISOString(),
              fim: new Date(novo.fim).toISOString(),
            }
          : i,
      );
    },
    [rascunho, novo],
  );

  const semMudanca = !rascunho || (rascunho.deltaInicioMin === 0 && rascunho.deltaDuracaoMin === 0);

  async function confirmar() {
    if (!rascunho || !original || !novo || motivo || salvando || salvo || semMudanca) return;
    setSalvando(true);
    try {
      const ok = await salvar(
        original,
        {
          inicio: new Date(novo.inicio).toISOString(),
          fim: new Date(novo.fim).toISOString(),
        },
        rascunho.avisar,
      );
      setSalvando(false);
      if (ok) {
        // Figaro (`AgendaArmedSave.SuccessDwellMillis`): confirma com vibração e mantém "Pronto!" por 1 s.
        vibrar("confirmar");
        if (permanenciaDoSucesso > 0) {
          setSalvo(true);
          await new Promise((resolver) => window.setTimeout(resolver, permanenciaDoSucesso));
          setSalvo(false);
        }
        setRascunho(null);
      }
    } finally {
      setSalvando(false);
    }
  }

  return {
    rascunho,
    original,
    novo,
    motivo,
    textoDoMotivo: motivo ? TEXTO_DO_MOTIVO[motivo] : null,
    salvando,
    salvo,
    semMudanca,
    propor,
    /** Entra no modo de edição sem mudar nada (toque longo sem arrastar). */
    iniciar: (id: string) => propor(id, 0, 0),
    aplicar,
    confirmar,
    descartar: () => setRascunho(null),
    definirAviso: (avisar: boolean) => setRascunho((r) => (r ? { ...r, avisar } : r)),
  };
}
