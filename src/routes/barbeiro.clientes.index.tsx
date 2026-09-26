import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl, dataCurta } from "@/lib/format";
import { getClientesCRM, type ClienteCRM } from "@/lib/crescimento.functions";
import { EsqueletoLista, EsqueletoMetricas } from "@/components/layout/Esqueleto";
import { useDebounce } from "@/hooks/useMovimento";
import { ItemCascata } from "@/components/layout/ItemCascata";

export const Route = createFileRoute("/barbeiro/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Cortaí Gestão" },
      { name: "description", content: "Frequência, gasto médio, preferências e quem precisa voltar." },
      { property: "og:title", content: "Clientes — Cortaí Gestão" },
      { property: "og:description", content: "Seu CRM de barbearia, com dados reais de cada cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientesPage,
});

const ROTULOS: Record<ClienteCRM["status"], { texto: string; classe: string }> = {
  novo: { texto: "Novo", classe: "text-gold" },
  recorrente: { texto: "Recorrente", classe: "text-sage" },
  em_retorno: { texto: "Em retorno", classe: "text-gold" },
  inativo: { texto: "Inativo", classe: "text-brick" },
};

function whatsappLink(telefone: string, nome: string) {
  const numero = telefone.replace(/\D/g, "");
  const texto = encodeURIComponent(`Olá, ${nome}! Faz um tempinho desde seu último corte. Quer marcar um horário?`);
  return `https://wa.me/55${numero}?text=${texto}`;
}

function ClientesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["clientes-crm"], queryFn: () => getClientesCRM() });
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDebounce(busca, 250);

  const lista = (data?.clientes ?? []).filter((c) =>
    c.nome.toLowerCase().includes(buscaAdiada.trim().toLowerCase()),
  );

  return (
    <Screen title="Clientes" subtitle="Histórico, frequência e quem está na hora de voltar.">



      {data && data.trazerDeVolta.length > 0 ? (
        <section data-guia="clientes-retorno" className="rounded-xl border border-line bg-ink2 p-5">
          <p className="text-xs font-semibold uppercase text-gold">Voltaí</p>
          <p className="mt-1 text-sm font-semibold text-paper">Seu cliente corta. Ganha. Volta.</p>
          <p className="mt-1 text-xs text-mute2">Quem passou do intervalo habitual e merece um chamado.</p>
          <ul className="mt-4 space-y-3">
            {data.trazerDeVolta.slice(0, 5).map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <Link
                    to="/barbeiro/clientes/$id"
                    params={{ id: c.id }}
                    className="block truncate text-sm font-medium text-gold underline underline-offset-2"
                  >
                    {c.nome}
                  </Link>
                  <p className="mt-0.5 text-xs text-mute">
                    {c.diasDesdeUltima} dias sem vir · costuma voltar a cada {c.intervaloMedioDias ?? 30} dias
                  </p>
                </div>
                {c.telefone ? (
                  <a
                    href={whatsappLink(c.telefone, c.nome)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Chamar ${c.nome} no WhatsApp`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line2 text-gold"
                  >
                    <MessageCircle size={16} />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Resumo dos clientes">
        <div className="rounded-lg border border-line bg-ink2 px-3 py-3"><p className="text-[10px] text-mute2">Ativos</p><p className="mt-1 text-lg font-bold text-paper">{data?.clientes.filter((c) => c.status !== "inativo").length ?? "—"}</p></div>
        <div className="rounded-lg border border-line bg-ink2 px-3 py-3"><p className="text-[10px] text-mute2">Inativos</p><p className="mt-1 text-lg font-bold text-paper">{data?.clientes.filter((c) => c.status === "inativo").length ?? "—"}</p></div>
        <div className="rounded-lg border border-line bg-ink2 px-3 py-3"><p className="text-[10px] text-mute2">Voltaí</p><p className="mt-1 text-lg font-bold text-gold">{data?.trazerDeVolta.length ?? "—"}</p></div>
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar cliente"
        className="input-premium mt-6 w-full"
      />

      {isLoading ? <EsqueletoLista linhas={6} /> : null}
      {data && lista.length === 0 ? <EmptyState text="Nenhum cliente encontrado." /> : null}
      <ul data-guia="clientes-lista" className="mt-2">
        {lista.map((c, i) => {
          const rotulo = ROTULOS[c.status];
          return (
            <ItemCascata key={c.id} indice={i} className="border-b border-line">
              <Link to="/barbeiro/clientes/$id" params={{ id: c.id }} className="block py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper">{c.nome}</p>
                    <p className="mt-0.5 text-xs text-mute">
                      {c.visitas > 0
                        ? `${c.visitas} ${c.visitas === 1 ? "visita" : "visitas"} · última em ${c.ultimaVisita ? dataCurta(c.ultimaVisita) : "—"}`
                        : "Ainda sem atendimentos"}
                    </p>
                    <p className="mt-0.5 text-xs text-mute2">
                      {c.intervaloMedioDias ? `A cada ${c.intervaloMedioDias} dias` : "Sem frequência definida"}
                      {c.gastoMedioCentavos > 0 ? ` · ${brl(c.gastoMedioCentavos)} em média` : ""}
                    </p>
                    {c.servicoPreferido || c.profissionalPreferido ? (
                      <p className="mt-0.5 truncate text-xs text-mute2">
                        {[c.servicoPreferido, c.profissionalPreferido].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-[11px] font-semibold ${rotulo.classe}`}>{rotulo.texto}</span>
                    {c.saldoCentavos < 0 ? (
                      <p className="mt-1 text-sm font-semibold text-brick">{brl(Math.abs(c.saldoCentavos))}</p>
                    ) : c.creditos > 0 ? (
                      <p className="mt-1 text-xs text-mute2">{c.creditos} créditos</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </ItemCascata>
          );
        })}
      </ul>
    </Screen>
  );
}
