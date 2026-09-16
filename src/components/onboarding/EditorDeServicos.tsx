import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import { brl } from "@/lib/format";
import { SERVICOS_SUGERIDOS, type ServicoSugerido } from "@/lib/ia/assistente";
import { interpretarServicos } from "@/lib/assistente.functions";

export type ServicoEditavel = ServicoSugerido & { id?: string };

export function EditorDeServicos({
  servicos,
  onChange,
}: {
  servicos: ServicoEditavel[];
  onChange: (s: ServicoEditavel[]) => void;
}) {
  const interpretar = useServerFn(interpretarServicos);
  const [texto, setTexto] = useState("");
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  const [pensando, setPensando] = useState(false);
  const [previa, setPrevia] = useState<ServicoSugerido[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function atualizar(indice: number, campos: Partial<ServicoEditavel>) {
    onChange(servicos.map((s, i) => (i === indice ? { ...s, ...campos } : s)));
  }

  const naoAdicionados = SERVICOS_SUGERIDOS.filter(
    (s) => !servicos.some((a) => a.nome.toLowerCase() === s.nome.toLowerCase()),
  );

  return (
    <div>
      {naoAdicionados.length ? (
        <>
          <p className="text-xs text-mute">Sugestões rápidas — toque para adicionar e edite depois.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {naoAdicionados.map((s) => (
              <button
                key={s.nome}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-line2 px-3.5 py-1.5 text-xs text-paper"
                onClick={() => onChange([...servicos, { ...s }])}
              >
                <Plus size={13} className="text-gold" aria-hidden /> {s.nome}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <ul className="mt-5 space-y-3">
        {servicos.map((s, i) => (
          <li key={s.id ?? `novo-${i}`} className="rounded-xl border border-line bg-ink2 px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                value={s.nome}
                onChange={(e) => atualizar(i, { nome: e.target.value })}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line2 bg-ink px-3 text-sm text-paper outline-none"
                aria-label="Nome do serviço"
              />
              <button
                type="button"
                aria-label={`Remover ${s.nome}`}
                className="shrink-0 text-mute2"
                onClick={() => onChange(servicos.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block text-[11px] text-mute">
                Duração (min)
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  inputMode="numeric"
                  value={rascunho[`${i}-duracao`] ?? String(s.duracaoMin)}
                  onChange={(e) => {
                    setRascunho({ ...rascunho, [`${i}-duracao`]: e.target.value });
                    const n = Number(e.target.value);
                    if (e.target.value.trim() !== "" && Number.isFinite(n)) atualizar(i, { duracaoMin: n });
                  }}
                  onBlur={() => setRascunho(Object.fromEntries(Object.entries(rascunho).filter(([k]) => k !== `${i}-duracao`)))}
                  className="mt-1 h-10 w-full rounded-lg border border-line2 bg-ink px-3 text-sm text-paper outline-none"
                />
              </label>
              <label className="block text-[11px] text-mute">
                Preço (R$)
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={rascunho[`${i}-preco`] ?? String(s.precoCentavos / 100)}
                  onChange={(e) => {
                    setRascunho({ ...rascunho, [`${i}-preco`]: e.target.value });
                    const n = Number(e.target.value);
                    if (e.target.value.trim() !== "" && Number.isFinite(n)) atualizar(i, { precoCentavos: Math.round(n * 100) });
                  }}
                  onBlur={() => setRascunho(Object.fromEntries(Object.entries(rascunho).filter(([k]) => k !== `${i}-preco`)))}
                  className="mt-1 h-10 w-full rounded-lg border border-line2 bg-ink px-3 text-sm text-paper outline-none"
                />
              </label>
            </div>

          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn-tertiary mt-3 text-sm"
        onClick={() => onChange([...servicos, { nome: "", categoria: "Serviço", duracaoMin: 30, precoCentavos: 3500 }])}
      >
        + Adicionar serviço
      </button>

      <div className="mt-6 rounded-xl border border-gold/40 bg-ink2 px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-paper">
          <Sparkles size={16} className="text-gold" aria-hidden /> Quer que o CortAI configure isso para você?
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder="Cadastre corte por 35 reais e barba por 25, os dois levam 30 minutos"
          className="mt-3 w-full resize-none rounded-lg border border-line2 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none"
        />
        <button
          type="button"
          className="btn-secondary mt-3 w-full py-2.5 text-sm"
          disabled={pensando || texto.trim().length < 3}
          onClick={async () => {
            setPensando(true);
            setErro(null);
            setAviso(null);
            try {
              const r = await interpretar({ data: { texto } });
              if (!r.disponivel) setAviso(r.resposta);
              else if (r.servicos?.length) setPrevia(r.servicos);
              else setAviso(r.resposta);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não consegui entender agora.");
            } finally {
              setPensando(false);
            }
          }}
        >
          {pensando ? "Interpretando…" : "Configurar com IA"}
        </button>

        {previa ? (
          <div className="mt-4 rounded-lg border border-line2 bg-ink px-4 py-3">
            <p className="text-xs text-mute">Prévia — você ainda pode editar depois de adicionar:</p>
            <ul className="mt-2 space-y-1">
              {previa.map((s, i) => (
                <li key={`${s.nome}-${i}`} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-paper">{s.nome}</span>
                  <span className="shrink-0 text-xs text-mute">
                    {s.duracaoMin} min · {brl(s.precoCentavos)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className="btn-primary flex-1 py-2 text-sm"
                onClick={() => {
                  onChange([...servicos, ...previa.map((s) => ({ ...s }))]);
                  setPrevia(null);
                  setTexto("");
                }}
              >
                Adicionar à lista
              </button>
              <button type="button" className="btn-tertiary text-sm" onClick={() => setPrevia(null)}>
                Descartar
              </button>
            </div>
          </div>
        ) : null}

        {aviso ? <p className="mt-3 text-xs text-mute">{aviso}</p> : null}
        {erro ? <p className="mt-3 text-xs text-brick">{erro}</p> : null}
      </div>
    </div>
  );
}
