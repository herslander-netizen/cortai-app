import { keepPreviousData, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  classificarErro,
  lerCacheAgenda,
  limparCacheAgenda,
  salvarCacheAgenda,
} from "@/lib/agenda-cache";
import { getAgendaDia, type AgendaDia } from "@/lib/barbeiro.functions";

import { somarDias } from "./tempo";

export type AgendaDiaCarregada = AgendaDia & { origem: "rede" | "cache"; salvoEm: number | null };

class ErroDeAcesso extends Error {}

export function opcoesAgendaDia(dia: string) {
  return queryOptions<AgendaDiaCarregada>({
    queryKey: ["agenda-dia", dia],
    queryFn: async () => {
      let dados: AgendaDia;
      try {
        dados = await getAgendaDia({ data: { dia } });
      } catch (erro) {
        const tipo = classificarErro(erro);
        if (tipo === "acesso") {
          limparCacheAgenda();
          throw new ErroDeAcesso("Sua sessão terminou. Entre de novo para ver a agenda.");
        }
        if (tipo === "rede" || tipo === "servidor") {
          const salvo = lerCacheAgenda(dia);
          if (salvo) return { ...salvo.dados, origem: "cache", salvoEm: salvo.salvoEm };
        }
        throw erro;
      }
      // Gravação separada: falha de armazenamento nunca transforma sucesso em erro.
      salvarCacheAgenda(dados);
      return { ...dados, origem: "rede", salvoEm: Date.now() };
    },
    retry: (tentativas, erro) => !(erro instanceof ErroDeAcesso) && tentativas < 2,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/** Consultas, cache offline e tempo real da Agenda do dia. */
export function useAgendaDia(dia: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [aoVivo, setAoVivo] = useState(false);

  const agenda = useQuery({
    ...opcoesAgendaDia(dia),
    refetchOnWindowFocus: true,
    // Polling só como reserva quando o tempo real cair.
    refetchInterval: aoVivo ? false : 15_000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  // Pré-busca do dia anterior e do seguinte: a troca já encontra os dados prontos.
  useEffect(() => {
    for (const vizinho of [somarDias(dia, -1), somarDias(dia, 1)])
      void queryClient.prefetchQuery(opcoesAgendaDia(vizinho));
  }, [dia, queryClient]);

  useEffect(() => {
    if (agenda.error instanceof ErroDeAcesso) void navigate({ to: "/login" });
  }, [agenda.error, navigate]);

  useEffect(() => {
    const conectar = () => {
      setOnline(true);
      void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
      void queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] });
    };
    const desconectar = () => setOnline(false);
    window.addEventListener("online", conectar);
    window.addEventListener("offline", desconectar);
    return () => {
      window.removeEventListener("online", conectar);
      window.removeEventListener("offline", desconectar);
    };
  }, [queryClient]);

  const tenantId = agenda.data?.tenant.id;
  useEffect(() => {
    if (!tenantId) return;
    let invalidacao: number | undefined;
    let agendaPendente = false;
    const reagendar = (incluiAgenda: boolean) => {
      agendaPendente ||= incluiAgenda;
      if (invalidacao !== undefined) window.clearTimeout(invalidacao);
      invalidacao = window.setTimeout(() => {
        if (agendaPendente) {
          void queryClient.invalidateQueries({ queryKey: ["agenda-dia"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-periodo"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-a-receber"] });
          void queryClient.invalidateQueries({ queryKey: ["agenda-meu-dia"] });
        }
        void queryClient.invalidateQueries({ queryKey: ["agenda-fila"] });
        agendaPendente = false;
      }, 250);
    };
    const canal = supabase
      .channel(`agenda-${tenantId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `tenant_id=eq.${tenantId}` },
        () => reagendar(true),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fila_de_espera",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => reagendar(false),
      )
      .subscribe((status) => setAoVivo(status === "SUBSCRIBED"));
    return () => {
      if (invalidacao !== undefined) window.clearTimeout(invalidacao);
      setAoVivo(false);
      void supabase.removeChannel(canal);
    };
  }, [tenantId, queryClient]);

  return { agenda, online, aoVivo };
}
