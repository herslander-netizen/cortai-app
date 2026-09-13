import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, CircleDollarSign, ListPlus, PackagePlus, Scissors, UserPlus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AgendamentoManual } from "@/components/barbeiro/AgendamentoManual";
import { getMinhasPermissoes } from "@/lib/equipe.functions";

export function QuickActions() {
  const [aberto, setAberto] = useState(false);
  const { data } = useQuery({ queryKey: ["minhas-permissoes"], queryFn: () => getMinhasPermissoes(), staleTime: 60_000 });
  const pode = (p: string) => data?.papel === "dono" || data?.permissoes.includes(p as never);
  const links = [
    pode("confirmar_pagamento") && { to: "/barbeiro/pedidos" as const, label: "Confirmar pagamento", icon: CircleDollarSign },
    pode("registrar_venda") && { to: "/barbeiro/produtos" as const, label: "Registrar venda", icon: PackagePlus },
    pode("editar_clientes") && { to: "/barbeiro/clientes" as const, label: "Novo cliente", icon: UserPlus },
    pode("criar_agendamento") && { to: "/barbeiro/fila" as const, label: "Adicionar à fila", icon: ListPlus },
  ].filter(Boolean) as { to: "/barbeiro/pedidos" | "/barbeiro/produtos" | "/barbeiro/clientes" | "/barbeiro/fila"; label: string; icon: typeof CalendarPlus }[];

  return <>
    <div className="relative flex min-w-0 flex-col items-center justify-center">
      <Button type="button" size="icon" aria-label="Abrir ações rápidas" aria-expanded={aberto} onClick={() => setAberto(true)} className="absolute -top-7 h-14 w-14 rounded-full border-4 border-ink bg-gold text-ink shadow-[0_8px_24px_rgba(0,0,0,0.45)]"><Scissors className="h-6 w-6" /></Button>
      <span className="mt-8 truncate text-[10px] font-semibold text-gold">Ações</span>
    </div>
    {aberto ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80" role="dialog" aria-modal="true" aria-label="Ações rápidas" onMouseDown={(e) => { if (e.target === e.currentTarget) setAberto(false); }}>
      <div className="w-full max-w-md rounded-t-xl border border-line bg-ink2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-paper">Ações rápidas</h2><p className="mt-1 text-xs text-mute">Somente o que você pode fazer nesta barbearia.</p></div><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setAberto(false)}><X /></Button></div>
        <div className="mt-5 space-y-2">
          {pode("agendamento_manual") ? <AgendamentoManual dia={new Date().toISOString().slice(0,10)} rotulo="Agendamento manual" /> : null}
          {links.map((item) => { const Icon = item.icon; return <Button key={item.to} asChild variant="outline" className="h-12 w-full justify-start"><Link to={item.to} onClick={() => setAberto(false)}><Icon />{item.label}</Link></Button>; })}
          {!pode("agendamento_manual") && !links.length ? <p className="py-4 text-center text-sm text-mute">Nenhuma ação disponível para seu acesso.</p> : null}
        </div>
      </div>
    </div> : null}
  </>;
}