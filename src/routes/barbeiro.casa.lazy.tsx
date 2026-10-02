import { useTermosDoPainel } from "@/lib/segmento-contexto";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { StatusBadge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { getVisaoCasa, type LinhaDaCasa } from "@/lib/dono.functions";

export const Route = createLazyFileRoute("/barbeiro/casa")({ component: CasaPage });

function horaNoFuso(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function minutosDesde(iso: string | null, agora: number) {
  return iso ? Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000)) : 0;
}

function Linha({ l, agora, fuso }: { l: LinhaDaCasa; agora: number; fuso: string }) {
  if (l.estado === "na_cadeira") {
    const passou = minutosDesde(l.desde, agora);
    const prev = l.previstoMin ?? 0;
    const estourou = prev > 0 && passou > prev;
    return (
      <li className="py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-semibold text-paper">{l.nome}</span>
          <span className="shrink-0 text-xs text-mute">
            {passou}/{prev} min
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-paper">
          <StatusBadge status="na_cadeira" />
          <span className="truncate">{l.cliente}</span>
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink3">
          <div
            className={`h-full ${estourou ? "bg-brick" : "bg-gold"}`}
            style={{ width: `${prev ? Math.min(100, (passou / prev) * 100) : 0}%` }}
          />
        </div>
      </li>
    );
  }
  const selo =
    l.estado === "chegou" ? (
      <StatusBadge status="chegou" />
    ) : (
      <StatusBadge status="livre" label={l.estado === "livre" ? "Livre" : "Sem mais horários"} />
    );
  return (
    <li className="py-3">
      <span className="block truncate text-sm font-semibold text-paper">{l.nome}</span>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-paper">
        {selo}
        <span className="truncate">
          {l.estado === "chegou"
            ? l.cliente
            : l.proximo
              ? `próximo ${horaNoFuso(l.proximo, fuso)}`
              : ""}
        </span>
      </p>
    </li>
  );
}

function CasaPage() {
  const tp = useTermosDoPainel();
  const buscar = useServerFn(getVisaoCasa);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["visao-casa"],
    queryFn: () => buscar(),
    retry: false,
    refetchInterval: 60_000,
  });
  const [agora, setAgora] = useState(() => Date.now());
  const tenantId = q.data?.tenantId;

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const atualizar = () => void qc.invalidateQueries({ queryKey: ["visao-casa"] });
    const canal = supabase
      .channel(`casa-${tenantId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenantId}` },
        atualizar,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fila_de_espera",
          filter: `tenant_id=eq.${tenantId}`,
        },
        atualizar,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caixa_movimentos",
          filter: `tenant_id=eq.${tenantId}`,
        },
        atualizar,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tenantId, qc]);

  if (q.isError)
    return (
      <Screen title="Visão Casa" voltarPara="/barbeiro">
        <p className="border-l-2 border-brick pl-4 text-sm text-paper">
          A Visão Casa é para dono, gerência e recepção.
        </p>
      </Screen>
    );
  const d = q.data;

  return (
    <Screen title="Visão Casa" subtitle="Atualiza sozinha." voltarPara="/barbeiro">
      <div className="md:max-w-xl">
        {!d ? (
          <EsqueletoLista linhas={4} onTentarDeNovo={() => void q.refetch()} />
        ) : (
          <>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-mute">
              {tp.barbearia ? "Cadeiras" : "Atendimentos"}
            </h2>
            {d.linhas.length ? (
              <ul className="divide-y divide-line border-b border-line">
                {d.linhas.map((l) => (
                  <Linha key={l.profissionalId} l={l} agora={agora} fuso={d.fuso} />
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-mute">Nenhum profissional ativo.</p>
            )}

            <h2 className="mt-7 text-xs font-semibold uppercase tracking-wide text-mute">
              Chegadas · {d.fila.length}
            </h2>
            {d.fila.length ? (
              <ul className="divide-y divide-line border-b border-line">
                {d.fila.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-paper">{f.nome}</span>
                      {f.servico ? (
                        <span className="block text-xs text-mute">{f.servico}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-mute">
                      <Clock3 size={12} /> {minutosDesde(f.desde, agora)} min
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-sm text-mute">Ninguém esperando.</p>
            )}

            {d.caixa ? (
              <>
                <h2 className="mt-7 text-xs font-semibold uppercase tracking-wide text-mute">
                  Caixa do dia
                </h2>
                <div className="flex items-baseline justify-between border-b border-line py-3">
                  <span className="text-sm text-mute">
                    {d.caixa.atendimentos} atendimento{d.caixa.atendimentos === 1 ? "" : "s"} ·{" "}
                    {d.caixa.aberto ? "caixa aberto" : "caixa fechado"}
                  </span>
                  <span className="money-value text-xl text-paper">
                    {brl(d.caixa.entradasCentavos)}
                  </span>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </Screen>
  );
}
