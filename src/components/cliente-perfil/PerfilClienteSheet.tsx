import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { GrupoDeCartoes, LinhaDeCartao } from "@/components/ui/formulario/GrupoDeCartoes";
import { SecaoDeFormulario } from "@/components/ui/formulario/SecaoDeFormulario";
import { FotoDoCorte } from "@/components/cliente-perfil/FotoDoCorte";
import { EditorFicha, EditorPreferencias } from "@/components/cliente-perfil/EditoresDoPerfil";
import { brl } from "@/lib/format";
import {
  apagarFotoCorte,
  getPerfilCliente,
  type PerfilCliente,
} from "@/lib/perfil-cliente.functions";
import { ROTULOS_PREFERENCIAS } from "@/lib/preferencias-cliente";
import { termos as termosPara, type Segmento } from "@/lib/segmentos";

function data(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

function usePerfil(clienteId: string) {
  const buscar = useServerFn(getPerfilCliente);
  return useQuery({
    queryKey: ["perfil-cliente", clienteId],
    queryFn: () => buscar({ data: { clienteId } }),
    staleTime: 30_000,
  });
}

function situacao(p: PerfilCliente) {
  if (p.cliente.avulso) return "Cliente avulso";
  if (p.resumo.visitas === 0) return "Ainda sem histórico";
  return `${p.resumo.visitas} ${p.resumo.visitas === 1 ? "visita" : "visitas"}`;
}

function Carregando() {
  return (
    <div className="space-y-3 py-2" aria-label="Carregando perfil">
      <div className="h-32 rounded-[var(--raio-grupo)] bg-ink3" />
      <div className="h-14 rounded-[var(--raio-grupo)] bg-ink3" />
    </div>
  );
}

export function PerfilClienteSheet({
  clienteId,
  onFechar,
  segmento = "outro",
}: {
  clienteId: string;
  onFechar: () => void;
  segmento?: Segmento;
}) {
  const q = usePerfil(clienteId);
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
      className="fixed inset-0 z-[85] flex flex-col bg-ink md:items-center md:justify-center md:bg-overlay/70 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Perfil do cliente"
      onClick={onFechar}
    >
      <div
        className="flex h-full w-full flex-col overflow-y-auto bg-ink px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:h-auto md:max-h-[92vh] md:max-w-xl md:rounded-[28px] md:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="secondary"
          size="icon"
          aria-label="Voltar"
          className="size-12 shrink-0 rounded-full"
          onClick={onFechar}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <h2 className="titulo-tela mt-4 break-words">{p?.cliente.nome ?? "Cliente"}</h2>
        {p ? (
          <span className="mt-2 inline-flex min-h-8 w-fit items-center rounded-full bg-ink3 px-3 text-sm font-semibold text-paper">
            {situacao(p)}
          </span>
        ) : null}
        <div className="mt-5">
          {q.isLoading ? <Carregando /> : null}
          {q.error ? (
            <p className="py-6 text-sm text-paper" role="alert">
              Não foi possível abrir o perfil. Tente de novo.
            </p>
          ) : null}
          {p ? <Conteudo p={p} segmento={segmento} /> : null}
        </div>
      </div>
    </div>
  );
}

import { Conteudo } from "@/components/cliente-perfil/ConteudoDoPerfil";

/**
 * Perfil real do cliente (ficha, fotos, resumo e histórico de atendimentos).
 * Usado na tela do atendimento e também dentro da ficha completa.
 */
export function PerfilClienteConteudo({
  clienteId,
  segmento = "outro",
}: {
  clienteId: string;
  segmento?: Segmento;
}) {
  const q = usePerfil(clienteId);
  if (q.isLoading) return <Carregando />;
  if (q.error)
    return (
      <p className="py-6 text-sm text-paper" role="alert">
        Não foi possível abrir o perfil. Tente de novo.
      </p>
    );
  return q.data ? <Conteudo p={q.data} segmento={segmento} mostrarLinkFicha={false} /> : null;
}
