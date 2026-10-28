import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { SEGMENTOS_CONFIG, segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { ItemCascata } from "@/components/layout/ItemCascata";
import { supabase } from "@/integrations/supabase/client";
import { comprimirImagem } from "@/lib/imagem";
import { AssistenteDeServicos } from "./AssistenteDeServicos";
import { SugestoesDeServicos } from "./SugestoesDeServicos";
import type { ServicoEditavel } from "./servicos.types";
export type { ServicoEditavel } from "./servicos.types";

export function EditorDeServicos({
  servicos,
  onChange,
  profissionais,
  semIA = false,
  semSugestoes = false,
  apenasUm = false,
  segmento = "outro",
  tenantId,
  fotosAssinadas = {},
  categoriasAdicionais = [],
}: {
  servicos: ServicoEditavel[];
  onChange: (s: ServicoEditavel[]) => void;
  /** Quando há mais de um profissional, mostra quem faz cada serviço. */
  profissionais?: { id: string; nome: string }[];
  semIA?: boolean;
  /** Oculta sugestões rápidas ao editar um único serviço. */
  semSugestoes?: boolean;
  /** Esconde a ação de adicionar vários serviços dentro do formulário individual. */
  apenasUm?: boolean;
  segmento?: Segmento;
  tenantId?: string;
  fotosAssinadas?: Record<string, string>;
  /** Categorias personalizadas do negócio, unidas às sugestões padrão do segmento. */
  categoriasAdicionais?: string[];
}) {
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState<number | null>(null);
  const [confirmarRemocao, dialogoRemocao] = useConfirmar();
  const arquivos = useRef<Record<number, HTMLInputElement | null>>({});
  const segmentoNormalizado = segmentoParaApresentacao(segmento);
  const definicao = SEGMENTOS_CONFIG[segmentoNormalizado];
  const categoriasDisponiveis = [...new Set([...definicao.categorias, ...categoriasAdicionais])];

  function atualizar(indice: number, campos: Partial<ServicoEditavel>) {
    onChange(servicos.map((s, i) => (i === indice ? { ...s, ...campos } : s)));
  }

  return (
    <div>
      {semSugestoes ? null : (
        <SugestoesDeServicos servicos={servicos} onChange={onChange} segmento={segmentoNormalizado} />
      )}

      <ul className="mt-5 space-y-3">
        {servicos.map((s, i) => (
          <ItemCascata key={s.id ?? `novo-${i}`} indice={i} className="surface px-4 py-3">
            {tenantId ? (
              <div className="mb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  type="button"
                  className="h-20 w-24 overflow-hidden rounded-lg border border-dashed border-line2 p-0"
                  onClick={() => arquivos.current[i]?.click()}
                >
                  {s.fotoUrl &&
                  (s.fotoUrl.startsWith("blob:") ||
                    s.fotoUrl.startsWith("http") ||
                    fotosAssinadas[s.fotoUrl]) ? (
                    <img
                      src={fotosAssinadas[s.fotoUrl] ?? s.fotoUrl}
                      alt={`Foto de ${s.nome || "serviço"}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-mute">Adicionar foto</span>
                  )}
                </Button>
                <div>
                  <p className="text-xs font-semibold text-paper">Foto do serviço</p>
                  <p className="mt-1 text-xs text-mute">
                    {enviandoFoto === i ? "Enviando…" : "Horizontal 4:3. Opcional."}
                  </p>
                </div>
                <input
                  ref={(node) => {
                    arquivos.current[i] = node;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setEnviandoFoto(i);
                    try {
                      const blob = await comprimirImagem(file, {
                        maxLado: 1600,
                        transparente: false,
                      });
                      const path = `${tenantId}/servico-${s.id ?? `novo-${i}`}-${Date.now()}.jpg`;
                      const { error } = await supabase.storage
                        .from("tenant-logos")
                        .upload(path, blob, { contentType: blob.type || "image/jpeg" });
                      if (error) throw error;
                      const preview = URL.createObjectURL(blob);
                      atualizar(i, { fotoUrl: path });
                      fotosAssinadas[path] = preview;
                    } catch {
                      setErroFoto("Não foi possível enviar a foto do serviço.");
                    } finally {
                      setEnviandoFoto(null);
                    }
                  }}
                />
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <Input
                value={s.nome}
                onChange={(e) => atualizar(i, { nome: e.target.value })}
                placeholder="Nome do serviço"
                className="field-control min-h-12 min-w-0 flex-1 rounded-lg px-3 text-sm"
                aria-label="Nome do serviço"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={`Remover ${s.nome || "serviço sem nome"}`}
                className="shrink-0 rounded-full"
                onClick={async () => {
                  const confirmou = await confirmarRemocao({
                    titulo: `Remover ${s.nome || "este serviço"}?`,
                    descricao: "O serviço será removido desta lista antes de salvar as alterações.",
                    confirmar: "Remover serviço",
                    destrutivo: true,
                  });
                  if (confirmou) onChange(servicos.filter((_, j) => j !== i));
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <label className="mt-2 block text-xs text-mute">
              Categoria
              <Input
                value={s.categoria}
                onChange={(e) => atualizar(i, { categoria: e.target.value })}
                list="categorias-de-servico"
                className="field-control mt-1 min-h-12 rounded-lg px-3 text-sm"
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block text-xs text-mute">
                Duração (min)
                <Input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  inputMode="numeric"
                  value={rascunho[`${i}-duracao`] ?? String(s.duracaoMin)}
                  onChange={(e) => {
                    setRascunho({ ...rascunho, [`${i}-duracao`]: e.target.value });
                    const n = Number(e.target.value);
                    if (e.target.value.trim() !== "" && Number.isFinite(n))
                      atualizar(i, { duracaoMin: n });
                  }}
                  onBlur={() =>
                    setRascunho(
                      Object.fromEntries(
                        Object.entries(rascunho).filter(([k]) => k !== `${i}-duracao`),
                      ),
                    )
                  }
                  className="field-control mt-1 min-h-12 rounded-lg px-3 text-sm"
                />
              </label>
              <label className="block text-xs text-mute">
                Preço (R$)
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={rascunho[`${i}-preco`] ?? String(s.precoCentavos / 100)}
                  onChange={(e) => {
                    setRascunho({ ...rascunho, [`${i}-preco`]: e.target.value });
                    const n = Number(e.target.value);
                    if (e.target.value.trim() !== "" && Number.isFinite(n))
                      atualizar(i, { precoCentavos: Math.round(n * 100) });
                  }}
                  onBlur={() =>
                    setRascunho(
                      Object.fromEntries(
                        Object.entries(rascunho).filter(([k]) => k !== `${i}-preco`),
                      ),
                    )
                  }
                  className="field-control mt-1 min-h-12 rounded-lg px-3 text-sm"
                />
              </label>
            </div>
            <label className="mt-2 block text-xs text-mute">
              Voltar em (dias) <span className="text-mute2">— opcional</span>
              <Input
                type="number"
                min={3}
                max={365}
                inputMode="numeric"
                placeholder="—"
                value={rascunho[`${i}-retorno`] ?? (s.retornoDias ? String(s.retornoDias) : "")}
                onChange={(e) => {
                  setRascunho({ ...rascunho, [`${i}-retorno`]: e.target.value });
                  const v = e.target.value.trim();
                  const n = Number(v);
                  if (v === "") atualizar(i, { retornoDias: null });
                  else if (Number.isInteger(n) && n >= 3 && n <= 365)
                    atualizar(i, { retornoDias: n });
                }}
                onBlur={() =>
                  setRascunho(
                    Object.fromEntries(
                      Object.entries(rascunho).filter(([k]) => k !== `${i}-retorno`),
                    ),
                  )
                }
                className="field-control mt-1 min-h-12 rounded-lg px-3 text-sm"
              />
              <span className="mt-1 block text-mute2">
                O Cortaí lembra o cliente no WhatsApp quando chegar a hora.
              </span>
            </label>
            {profissionais && profissionais.length > 1 ? (
              <div className="mt-3">
                <p className="text-xs text-mute">Quem faz</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {profissionais.map((p) => {
                    const marcados = s.profissionalIds ?? [];
                    const todos = marcados.length === 0;
                    const ativo = todos || marcados.includes(p.id);
                    return (
                      <Button
                        key={p.id}
                        type="button"
                        variant={ativo ? "secondary" : "outline"}
                        aria-pressed={ativo}
                        onClick={() => {
                          const base = todos ? profissionais.map((x) => x.id) : marcados;
                          const proximo = ativo
                            ? base.filter((id) => id !== p.id)
                            : [...base, p.id];
                          atualizar(i, {
                            profissionalIds:
                              proximo.length === profissionais.length || proximo.length === 0
                                ? []
                                : proximo,
                          });
                        }}
                        className="min-h-12 rounded-full px-3 text-xs"
                      >
                        {p.nome}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </ItemCascata>
        ))}
      </ul>

      {apenasUm ? null : (
        <Button
          type="button"
          variant="outline"
          className="mt-3 min-h-12 text-sm"
          onClick={() =>
            onChange([
              ...servicos,
              { nome: "", categoria: "Serviço", duracaoMin: 30, precoCentavos: 3500 },
            ])
          }
        >
          + Adicionar serviço
        </Button>
      )}

      <datalist id="categorias-de-servico">
        {categoriasDisponiveis.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {erroFoto ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erroFoto}
        </p>
      ) : null}
      {semIA ? null : (
        <AssistenteDeServicos servicos={servicos} onChange={onChange} segmento={segmentoNormalizado} />
      )}
      {dialogoRemocao}
    </div>
  );
}
