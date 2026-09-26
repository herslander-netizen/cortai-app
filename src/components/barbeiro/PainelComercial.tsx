import { useQuery } from "@tanstack/react-query";
import { useAcao } from "@/hooks/useAcao";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BadgeCheck, Sparkles, Ticket } from "lucide-react";

import { brl } from "@/lib/format";
import { aplicarCupom, getBannersDaHome, getMinhaAssinatura } from "@/lib/monetizacao.functions";
import { ROTULO_DO_LIMITE, dataCurta, diasRestantes, type TipoDeLimite } from "@/lib/monetizacao";
import { Button } from "@/components/ui/button";

/** Campanhas publicadas pelo Cortaí para esta barbearia. */
export function BannersDaPlataforma() {
  const { data } = useQuery({ queryKey: ["banners-home"], queryFn: () => getBannersDaHome(), retry: false });
  if (!data?.length) return null;
  return (
    <ul className="mb-4 space-y-3">
      {data.map((b) => (
        <li key={b.id} className="overflow-hidden surface">
          {b.imagemUrl ? (
            <img src={b.imagemUrl} alt="" className="h-28 w-full object-cover" loading="lazy" />
          ) : null}
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-paper">{b.titulo}</p>
            {b.subtitulo ? <p className="mt-1 text-xs leading-relaxed text-mute">{b.subtitulo}</p> : null}
            {b.ctaRotulo && b.ctaDestino ? (
              <a href={b.ctaDestino} className="mt-3 inline-block text-xs font-semibold text-gold">
                {b.ctaRotulo}
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Plano da barbearia, condição especial em vigor e uso dos limites. */
export function MeuPlano() {
  const query = useQuery({ queryKey: ["minha-assinatura"], queryFn: () => getMinhaAssinatura(), retry: false });
  const aplicar = useServerFn(aplicarCupom);
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const acao = useAcao();

  const a = query.data;
  if (!a) return null;

  const diasDeTeste = a.status === "teste" ? diasRestantes(a.testeAte) : null;
  const comDesconto = a.precoEfetivoCentavos < a.precoPadraoCentavos;

  return (
    <section className="mt-6 surface px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-mute">Seu plano</p>
          <p className="mt-1 text-lg font-bold text-paper">{a.planoNome}</p>
          <p className="mt-0.5 text-xs text-mute2">
            {comDesconto ? (
              <>
                <span className="line-through">{brl(a.precoPadraoCentavos)}</span>{" "}
                <span className="text-gold">{brl(a.precoEfetivoCentavos)}</span> por mês
                {a.condicaoAte ? ` até ${dataCurta(a.condicaoAte)}` : ""}
              </>
            ) : (
              `${brl(a.precoPadraoCentavos)} por ${a.ciclo === "anual" ? "ano" : "mês"}`
            )}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-soft text-gold">
          {comDesconto ? <Sparkles size={18} /> : <BadgeCheck size={18} />}
        </span>
      </div>

      {diasDeTeste != null ? (
        <p className="mt-3 rounded-lg bg-ink3 px-3 py-2 text-xs text-gold">
          Teste grátis: {diasDeTeste} {diasDeTeste === 1 ? "dia restante" : "dias restantes"}.
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {a.limites
          .filter((l) => l.limite != null)
          .map((l) => {
            const pct = Math.min(100, Math.round((l.uso / Math.max(1, l.limite ?? 1)) * 100));
            return (
              <li key={l.tipo}>
                <div className="flex items-baseline justify-between text-xs text-mute">
                  <span>{ROTULO_DO_LIMITE[l.tipo as TipoDeLimite]}</span>
                  <span>
                    {l.uso}/{l.limite}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink3">
                  <div className={`h-full rounded-full ${pct >= 90 ? "bg-brick" : "bg-gold"}`} style={{ width: `${Math.max(3, pct)}%` }} />
                </div>
              </li>
            );
          })}
      </ul>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAviso("");
          setErro("");
          void acao.executar("cupom", () => aplicar({ data: { codigo } }), {
            erro: "Não deu para aplicar o cupom.",
            aoConcluir: async (r) => {
              setAviso(`Cupom ${r.codigo} aplicado.`);
              setCodigo("");
              await query.refetch();
            },
          });
        }}
      >
        <label className="sr-only" htmlFor="cupom">
          Código do cupom
        </label>
        <span className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-ink px-3">
          <Ticket size={15} className="text-mute2" />
          <input
            id="cupom"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Tem um cupom?"
            className="w-full bg-transparent py-2.5 text-sm text-paper outline-none placeholder:text-mute2"
          />
        </span>
        <Button variant="ghost" type="submit" className="btn-secondary px-4 text-xs disabled:opacity-60" disabled={acao.ocupado || codigo.trim().length < 2}>
          {acao.estaEm("cupom") ? "Aplicando…" : "Aplicar"}
        </Button>
      </form>
      {aviso ? <p className="mt-2 text-xs text-sage" role="status">{aviso}</p> : null}
      {erro ? <p className="mt-2 text-xs text-brick" role="alert">{erro}</p> : null}
    </section>
  );
}
