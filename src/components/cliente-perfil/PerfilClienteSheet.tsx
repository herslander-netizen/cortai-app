import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coffee, MessageCircle, Music, Plus, Snowflake, Sparkles, TriangleAlert, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FotoDoCorte } from "@/components/cliente-perfil/FotoDoCorte";
import { brl } from "@/lib/format";
import {
  apagarFotoCorte,
  getPerfilCliente,
  salvarFichaCorte,
  salvarPreferenciasCliente,
  type PerfilCliente,
} from "@/lib/perfil-cliente.functions";
import { ROTULOS_PREFERENCIAS, type PreferenciasCliente } from "@/lib/preferencias-cliente";
import { termos as termosPara, type Segmento } from "@/lib/segmentos";

function data(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

export function PerfilClienteSheet({
  clienteId,
  onFechar,
  segmento = "barbearia",
}: {
  clienteId: string;
  onFechar: () => void;
  segmento?: Segmento;
}) {
  const buscar = useServerFn(getPerfilCliente);
  const q = useQuery({
    queryKey: ["perfil-cliente", clienteId],
    queryFn: () => buscar({ data: { clienteId } }),
    staleTime: 30_000,
  });
  const p = q.data;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end bg-overlay/70 md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Perfil do cliente"
      onClick={onFechar}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-ink px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 md:max-w-xl md:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-ink pb-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-paper">
              {p?.cliente.nome ?? "Cliente"}
            </h2>
            {p && !p.cliente.avulso ? (
              <p className="text-xs text-mute">{p.cliente.telefone}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onFechar}>
            <X />
          </Button>
        </div>
        {q.isLoading ? (
          <div className="space-y-3 py-2" aria-label="Carregando">
            <div className="h-40 rounded-lg bg-ink3" />
            <div className="h-12 rounded-lg bg-ink3" />
          </div>
        ) : null}
        {q.error ? (
          <p className="py-6 text-sm text-paper" role="alert">
            {(q.error as Error).message}
          </p>
        ) : null}
        {p ? <Conteudo p={p} segmento={segmento} /> : null}
      </div>
    </div>
  );
}

/**
 * Perfil real do cliente (ficha, fotos, resumo e histórico de atendimentos).
 * Usado na folha do atendimento e também dentro da ficha completa do barbeiro.
 */
export function PerfilClienteConteudo({
  clienteId,
  segmento = "barbearia",
}: {
  clienteId: string;
  segmento?: Segmento;
}) {
  const buscar = useServerFn(getPerfilCliente);
  const q = useQuery({
    queryKey: ["perfil-cliente", clienteId],
    queryFn: () => buscar({ data: { clienteId } }),
    staleTime: 30_000,
  });
  if (q.isLoading)
    return (
      <div className="space-y-3 py-2" aria-label="Carregando perfil">
        <div className="h-40 rounded-lg bg-ink3" />
        <div className="h-12 rounded-lg bg-ink3" />
      </div>
    );
  if (q.error)
    return (
      <p className="py-6 text-sm text-paper" role="alert">
        {(q.error as Error).message}
      </p>
    );
  return q.data ? <Conteudo p={q.data} segmento={segmento} mostrarLinkFicha={false} /> : null;
}

function Conteudo({
  p,
  segmento,
  mostrarLinkFicha = true,
}: {
  p: PerfilCliente;
  segmento: Segmento;
  mostrarLinkFicha?: boolean;
}) {
  const termos = termosPara(segmento);
  const barbeiro = segmento === "barbearia";
  const qc = useQueryClient();
  const apagar = useServerFn(apagarFotoCorte);
  const [verFoto, setVerFoto] = useState(false);
  const recarregar = () => qc.invalidateQueries({ queryKey: ["perfil-cliente", p.cliente.id] });
  const ultima = p.fotos[0];

  return (
    <>
      {p.ficha.alergias ? (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-brick px-3 py-3 text-sm font-semibold text-ink">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Alergia: {p.ficha.alergias}
        </p>
      ) : null}

      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4">
        {ultima ? (
          <Button
            variant="ghost"
            type="button"
            className="h-auto min-h-12 aspect-[3/4] overflow-hidden rounded-xl border border-line p-0"
            onClick={() => setVerFoto(true)}
            aria-label={`Ver última ${termos.fotoAtendimento.toLocaleLowerCase("pt-BR")}`}
          >
            <img
              src={ultima.url}
              alt={
                barbeiro
                  ? `Último corte de ${p.cliente.nome}`
                  : `Último resultado de ${p.cliente.nome}`
              }
              className="size-full object-cover"
              loading="eager"
            />
          </Button>
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-line px-2 text-center text-xs text-mute">
            Sem {termos.fotoAtendimento.toLocaleLowerCase("pt-BR")}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-mute">
            {barbeiro ? "Ficha de corte" : "Ficha"}
          </p>
          {p.ficha.chips.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.ficha.chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-paper"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-mute">Nada marcado ainda.</p>
          )}
          {p.ficha.texto ? (
            <p className="mt-2 line-clamp-4 text-sm text-paper">{p.ficha.texto}</p>
          ) : null}
          {p.retornoSugerido ? (
            <p className="mt-2 text-xs text-mute">
              Retorno sugerido:{" "}
              <span className="font-semibold text-paper">
                {data(p.retornoSugerido.data, p.fuso)}
              </span>{" "}
              ({p.retornoSugerido.servico})
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line py-4 text-sm">
        <div>
          <dt className="text-xs text-mute">Último atendimento</dt>
          <dd className="font-bold text-paper">
            {p.resumo.ultimo ? data(p.resumo.ultimo, p.fuso) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Profissional</dt>
          <dd className="truncate font-bold text-paper">{p.resumo.profissional ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Serviços</dt>
          <dd className="truncate font-bold text-paper">{p.resumo.servicos.join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Total histórico</dt>
          <dd className="money-value text-paper">
            {brl(p.resumo.totalCentavos)}
            <span className="ml-1 text-xs font-normal text-mute">
              · {p.resumo.visitas} {p.resumo.visitas === 1 ? "visita" : "visitas"}
            </span>
          </dd>
        </div>
      </dl>
      {p.faltas || p.cancelamentos ? (
        <p className="mt-2 text-xs text-mute">
          {[
            p.faltas ? `${p.faltas} falta${p.faltas > 1 ? "s" : ""}` : null,
            p.cancelamentos
              ? `${p.cancelamentos} cancelamento${p.cancelamentos > 1 ? "s" : ""}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {p.cliente.avulso ? (
        <p className="mt-5 text-sm text-mute">
          Cliente avulso: identifique na comanda para guardar ficha e fotos.
        </p>
      ) : (
        <>
          <EditorPreferencias p={p} onSalvo={recarregar} />
          <EditorFicha p={p} onSalvo={recarregar} />
        </>
      )}

      {!p.cliente.avulso ? (
        <section className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase text-mute">
            {barbeiro ? "Fotos do corte" : "Fotos do resultado"}
          </p>
          {p.fotos.length ? (
            <ul className="mb-3 grid grid-cols-3 gap-2">
              {p.fotos.map((f) => (
                <li key={f.id} className="relative">
                  <img
                    src={f.url}
                    alt={`${barbeiro ? "Corte" : "Resultado"} em ${data(f.criadoEm, p.fuso)}`}
                    className="aspect-square w-full rounded-md border border-line object-cover"
                    loading="lazy"
                  />
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    aria-label="Apagar foto"
                    className="absolute right-1 top-1 bg-ink text-paper"
                    onClick={async () => {
                      await apagar({ data: { fotoId: f.id } });
                      recarregar();
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <FotoDoCorte clienteId={p.cliente.id} onEnviada={recarregar} segmento={segmento} />
        </section>
      ) : null}

      <section className="mt-6">
        <p className="mb-1 text-xs font-bold uppercase text-mute">Histórico</p>
        {p.historico.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {p.historico.map((h) => (
              <li
                key={h.id}
                className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm"
              >
                <span className="text-xs text-mute">{data(h.inicio, p.fuso)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-paper">{h.servico}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-mute">
                    <span className="truncate">{h.profissional}</span>
                    <StatusBadge status={h.status} segmento={segmento} />
                  </span>
                </span>
                <span
                  className={`money-value ${h.status === "finalizado" ? "text-paper" : "text-mute"}`}
                >
                  {h.status === "finalizado" ? brl(h.valorCentavos) : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">Primeira visita.</p>
        )}
      </section>

      {mostrarLinkFicha && !p.cliente.avulso ? (
        <Link
          to="/barbeiro/clientes/$id"
          params={{ id: p.cliente.id }}
          className="mt-5 inline-flex min-h-12 items-center text-sm font-semibold text-paper underline underline-offset-4"
        >
          Fiado, carteira e personalizações
        </Link>
      ) : null}

      {verFoto && ultima ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/90 p-4"
          onClick={() => setVerFoto(false)}
          role="dialog"
          aria-label={termos.fotoAtendimento}
        >
          <img
            src={ultima.url}
            alt={
              barbeiro
                ? `Último corte de ${p.cliente.nome}`
                : `Último resultado de ${p.cliente.nome}`
            }
            className="max-h-full max-w-full rounded-lg"
          />
        </div>
      ) : null}
    </>
  );
}

const OPCOES = {
  conversa: ["papo", "silencio", "tanto_faz"],
  ar: ["gelado", "ameno", "sem_ar"],
  bebida: ["cafe", "agua", "refri", "cerveja", "nada"],
} as const;

function EditorPreferencias({ p, onSalvo }: { p: PerfilCliente; onSalvo: () => void }) {
  const salvar = useServerFn(salvarPreferenciasCliente);
  const [preferencias, setPreferencias] = useState<PreferenciasCliente>(p.preferencias);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupos = [
    { chave: "conversa" as const, titulo: "Conversa", icone: MessageCircle },
    { chave: "ar" as const, titulo: "Ambiente", icone: Snowflake },
    { chave: "bebida" as const, titulo: "Bebida", icone: Coffee },
  ];
  async function gravar() {
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await salvar({ data: { clienteId: p.cliente.id, preferencias } });
      setPreferencias(resultado.preferencias);
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }
  return (
    <section className="mt-6 border-t border-line pt-5">
      <p className="mb-3 text-xs font-bold uppercase text-mute">Preferências</p>
      <div className="space-y-4">
        {grupos.map(({ chave, titulo, icone: Icone }) => (
          <fieldset key={chave}>
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-paper"><Icone className="size-4" aria-hidden />{titulo}</legend>
            <div className="flex flex-wrap gap-2">
              {OPCOES[chave].map((valor) => (
                <Button key={valor} type="button" variant="ghost" className="min-h-12 rounded-full border border-line" aria-pressed={preferencias[chave] === valor} onClick={() => setPreferencias((atual) => ({ ...atual, [chave]: valor }))}>
                  {ROTULOS_PREFERENCIAS[chave][valor]}
                </Button>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="field-label">Música<input className="field-control" maxLength={40} value={preferencias.musica ?? ""} onChange={(e) => setPreferencias((a) => ({ ...a, musica: e.target.value }))} /></label>
        <label className="field-label">Atendimento habitual<input className="field-control" maxLength={60} value={preferencias.corte_habitual ?? ""} onChange={(e) => setPreferencias((a) => ({ ...a, corte_habitual: e.target.value }))} /></label>
        <label className="field-label">Atenção<input className="field-control" maxLength={80} value={preferencias.atencao ?? ""} onChange={(e) => setPreferencias((a) => ({ ...a, atencao: e.target.value }))} /></label>
        <label className="field-label">Assuntos<input className="field-control" maxLength={80} value={preferencias.assuntos ?? ""} onChange={(e) => setPreferencias((a) => ({ ...a, assuntos: e.target.value }))} /></label>
      </div>
      <Button className="mt-4 h-12 w-full" disabled={salvando} onClick={() => void gravar()}><Sparkles aria-hidden />{salvando ? "Salvando…" : "Salvar preferências"}</Button>
      {erro ? <p className="field-error mt-2" role="alert">{erro}</p> : null}
    </section>
  );
}

function EditorFicha({ p, onSalvo }: { p: PerfilCliente; onSalvo: () => void }) {
  const salvar = useServerFn(salvarFichaCorte);
  const [chips, setChips] = useState<string[]>(p.ficha.chips);
  const [alergias, setAlergias] = useState(p.ficha.alergias ?? "");
  const [texto, setTexto] = useState(p.ficha.texto ?? "");
  const [novo, setNovo] = useState("");
  const [estado, setEstado] = useState<"livre" | "salvando" | "ok">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const opcoes = Array.from(new Set([...p.catalogo, ...chips]));
  const alternar = (c: string) => {
    setEstado("livre");
    setChips((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  };

  async function gravar() {
    setEstado("salvando");
    setErro(null);
    const extra = novo.trim();
    try {
      await salvar({
        data: {
          clienteId: p.cliente.id,
          chips: extra ? [...chips, extra] : chips,
          alergias,
          texto,
          novoChip: extra || null,
        },
      });
      setNovo("");
      setEstado("ok");
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
      setEstado("livre");
    }
  }

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs font-bold uppercase text-mute">Editar ficha</p>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((c) => {
          const ativo = chips.includes(c);
          return (
            <Button
              key={c}
              type="button"
              variant={ativo ? "primary" : "secondary"}
              size="sm"
              aria-pressed={ativo}
              onClick={() => alternar(c)}
              className="rounded-full"
            >
              {c}
            </Button>
          );
        })}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-mute">
        <Plus aria-hidden className="size-4" />
        <input
          className="input-premium mt-0"
          placeholder="Novo chip (ex.: Tesoura em cima)"
          value={novo}
          maxLength={30}
          onChange={(e) => {
            setNovo(e.target.value);
            setEstado("livre");
          }}
        />
      </label>
      <label className="mt-3 block text-xs text-mute">
        Alergias
        <input
          className="input-premium"
          placeholder="Ex.: pomada com álcool"
          value={alergias}
          onChange={(e) => {
            setAlergias(e.target.value);
            setEstado("livre");
          }}
        />
      </label>
      <label className="mt-3 block text-xs text-mute">
        Anotações
        <textarea
          rows={3}
          className="input-premium"
          placeholder="Máquina, tesoura, preferências…"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setEstado("livre");
          }}
        />
      </label>
      <Button
        className="mt-3 h-12 w-full"
        disabled={estado === "salvando"}
        onClick={() => void gravar()}
      >
        {estado === "ok" ? (
          <>
            <Check aria-hidden />
            Ficha salva
          </>
        ) : estado === "salvando" ? (
          "Salvando…"
        ) : (
          "Salvar ficha"
        )}
      </Button>
      {erro ? (
        <p className="mt-2 text-sm text-paper" role="alert">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
