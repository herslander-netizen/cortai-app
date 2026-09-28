import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import { brl } from "@/lib/format";
import type { ServicoSugerido } from "@/lib/ia/assistente";
import { interpretarServicos } from "@/lib/assistente.functions";
import { LISTA_DE_SEGMENTOS, SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";
import { Button } from "@/components/ui/button";

export type ServicoEditavel = ServicoSugerido & { id?: string; profissionalIds?: string[] };

export function EditorDeServicos({
  servicos,
  onChange,
  profissionais,
  semIA = false,
  segmento = "barbearia",
}: {
  servicos: ServicoEditavel[];
  onChange: (s: ServicoEditavel[]) => void;
  /** Quando há mais de um profissional, mostra quem faz cada serviço. */
  profissionais?: { id: string; nome: string }[];
  semIA?: boolean;
  segmento?: Segmento;
}) {
  const interpretar = useServerFn(interpretarServicos);
  const [texto, setTexto] = useState("");
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  const [pensando, setPensando] = useState(false);
  const [previa, setPrevia] = useState<ServicoSugerido[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const definicao = SEGMENTOS_CONFIG[segmentoValido(segmento)];

  function atualizar(indice: number, campos: Partial<ServicoEditavel>) {
    onChange(servicos.map((s, i) => (i === indice ? { ...s, ...campos } : s)));
  }

  const naoAdicionados = definicao.servicosSugeridos.filter(
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

      <Button variant="link" type="button" className="mt-2 h-auto px-0 text-xs text-mute" onClick={() => setMostrarTodas((valor) => !valor)}>
        {mostrarTodas ? "Ocultar outras sugestões" : "Ver sugestões de outros segmentos"}
      </Button>
      {mostrarTodas ? <div className="mt-3 space-y-4 border-t border-line pt-4">
        {LISTA_DE_SEGMENTOS.filter((item) => item.id !== definicao.id && item.servicosSugeridos.length).map((item) => (
          <section key={item.id}>
            <p className="text-xs font-semibold text-paper">{item.rotulo}</p>
            <div className="mt-2 flex flex-wrap gap-2">{item.servicosSugeridos.map((servico) => (
              <Button key={`${item.id}-${servico.nome}`} variant="outline" type="button" className="min-h-10 rounded-full px-3 text-xs" onClick={() => onChange([...servicos, { ...servico }])}>
                <Plus size={13} aria-hidden /> {servico.nome}
              </Button>
            ))}</div>
          </section>
        ))}
      </div> : null}

      <ul className="mt-5 space-y-3">
        {servicos.map((s, i) => (
          <li key={s.id ?? `novo-${i}`} className="surface px-4 py-3">
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
            <label className="mt-2 block text-xs text-mute">
              Categoria
              <input
                value={s.categoria}
                onChange={(e) => atualizar(i, { categoria: e.target.value })}
                list="categorias-de-servico"
                className="mt-1 h-10 w-full rounded-lg border border-line2 bg-ink px-3 text-sm text-paper outline-none"
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block text-xs text-mute">
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
              <label className="block text-xs text-mute">
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
            {profissionais && profissionais.length > 1 ? (
              <div className="mt-3">
                <p className="text-xs text-mute">Quem faz</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {profissionais.map((p) => {
                    const marcados = s.profissionalIds ?? [];
                    const todos = marcados.length === 0;
                    const ativo = todos || marcados.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => {
                          const base = todos ? profissionais.map((x) => x.id) : marcados;
                          const proximo = ativo ? base.filter((id) => id !== p.id) : [...base, p.id];
                          atualizar(i, {
                            profissionalIds: proximo.length === profissionais.length || proximo.length === 0 ? [] : proximo,
                          });
                        }}
                        className={`min-h-10 rounded-full border px-3 text-xs ${
                          ativo ? "border-paper bg-paper text-ink" : "border-line2 text-mute"
                        }`}
                      >
                        {p.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
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

      <datalist id="categorias-de-servico">
        {definicao.categorias.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {semIA ? null : (
      <div className="mt-6 rounded-xl border border-gold/40 bg-ink2 px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-paper">
          <Sparkles size={16} className="text-gold" aria-hidden /> Quer que o CortAI configure isso para você?
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder={definicao.exemploIA}
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
      )}
    </div>
  );
}
