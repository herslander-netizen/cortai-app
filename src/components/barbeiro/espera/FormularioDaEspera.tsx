/**
 * Formulário da lista de espera (editar a preferência ou agendar direto). Saiu da rota `/barbeiro/fila` para ela ficar
 * abaixo de 300 linhas; comportamento igual.
 */
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import type { FilaItem, getOpcoesDaFila } from "@/lib/barbeiro.functions";

export const PERIODOS = [
  { rotulo: "Qualquer horário", inicio: null, fim: null },
  { rotulo: "Manhã", inicio: 9, fim: 12 },
  { rotulo: "Tarde", inicio: 13, fim: 18 },
  { rotulo: "Fim de tarde", inicio: 18, fim: 20 },
] as const;

export type Valores = {
  servicoId: string | null;
  profissionalId: string | null;
  dia: string | null;
  hora: string | null;
  janelaInicio: number | null;
  janelaFim: number | null;
};

export function FormularioFila({
  item,
  modo,
  opcoes,
  ocupado,
  onCancelar,
  onSalvar,
}: {
  item: FilaItem;
  modo: "editar" | "agendar";
  opcoes: Awaited<ReturnType<typeof getOpcoesDaFila>> | undefined;
  ocupado: boolean;
  onCancelar: () => void;
  onSalvar: (v: Valores) => void;
}) {
  const [v, setV] = useState<Valores>({
    servicoId: item.servicoId,
    profissionalId: item.profissionalId,
    dia: item.dia,
    hora: null,
    janelaInicio: item.janelaInicio,
    janelaFim: item.janelaFim,
  });
  const agendar = modo === "agendar";
  const valido = !agendar || Boolean(v.servicoId && v.profissionalId && v.dia && v.hora);
  if (!opcoes) return <EsqueletoFormulario campos={3} />;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line p-3 sm:ml-12">
      <label className="block text-xs text-mute2">
        Serviço
        <select
          className="field-control mt-1 w-full"
          value={v.servicoId ?? ""}
          onChange={(e) => setV({ ...v, servicoId: e.target.value || null })}
        >
          <option value="">{agendar ? "Escolha" : "A combinar"}</option>
          {opcoes.servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} · {s.duracao_min} min
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-mute2">
        Profissional
        <select
          className="field-control mt-1 w-full"
          value={v.profissionalId ?? ""}
          onChange={(e) => setV({ ...v, profissionalId: e.target.value || null })}
        >
          <option value="">{agendar ? "Escolha" : "Qualquer"}</option>
          {opcoes.profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-mute2">
          Data
          <input
            type="date"
            className="field-control mt-1 w-full"
            value={v.dia ?? ""}
            onChange={(e) => setV({ ...v, dia: e.target.value || null })}
          />
        </label>
        {agendar ? (
          <label className="block text-xs text-mute2">
            Horário
            <input
              type="time"
              className="field-control mt-1 w-full"
              value={v.hora ?? ""}
              onChange={(e) => setV({ ...v, hora: e.target.value || null })}
            />
          </label>
        ) : (
          <label className="block text-xs text-mute2">
            Período
            <select
              className="field-control mt-1 w-full"
              value={PERIODOS.findIndex(
                (p) => p.inicio === v.janelaInicio && p.fim === v.janelaFim,
              )}
              onChange={(e) => {
                const p = PERIODOS[Number(e.target.value)] ?? PERIODOS[0];
                setV({ ...v, janelaInicio: p.inicio, janelaFim: p.fim });
              }}
            >
              {PERIODOS.map((p, i) => (
                <option key={p.rotulo} value={i}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={ocupado || !valido} onClick={() => onSalvar(v)}>
          {agendar ? "Confirmar agendamento" : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
