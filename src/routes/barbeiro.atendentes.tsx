import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bot, Circle, MessageCircle, UserCheck, UsersRound } from "lucide-react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { definirAtendimentoDaConversa, listarAtendentes, listarConversas } from "@/lib/whatsapp.functions";
import type { ConversaDeWhatsapp } from "@/lib/whatsapp/contrato";

export const Route = createFileRoute("/barbeiro/atendentes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel de atendentes — Cortaí Gestão" },
      { name: "description", content: "Veja quem está online no negócio e assuma o atendimento de uma conversa." },
      { property: "og:title", content: "Painel de atendentes — Cortaí Gestão" },
      { property: "og:description", content: "Equipe online e conversas do WhatsApp em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AtendentesPage,
});

const NOME_DO_PAPEL: Record<string, string> = {
  dono: "Dono",
  gerente: "Gerente",
  barbeiro: "Barbeiro",
  recepcao: "Recepção",
};

function quandoFoi(iso: string | null) {
  if (!iso) return "sem mensagens";
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.round(horas / 24)} d`;
}

function AtendentesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const equipe = useQuery({ queryKey: ["atendentes"], queryFn: () => listarAtendentes() });
  const conversas = useQuery({
    queryKey: ["atendentes-conversas"],
    queryFn: () => listarConversas({ data: { filtro: "todas" } }),
    refetchInterval: 20000,
  });

  const tenantId = equipe.data?.tenantId ?? null;
  const euSouId = equipe.data?.euSouId ?? null;
  const meuNome = equipe.data?.atendentes.find((a) => a.userId === euSouId)?.nome ?? "Equipe";

  // Presença ao vivo: quem está com o painel aberto agora.
  useEffect(() => {
    if (!tenantId || !euSouId) return;
    const canal = supabase.channel(`atendentes-${tenantId}`, { config: { presence: { key: euSouId } } });
    const atualizar = () => setOnline(Object.keys(canal.presenceState()));
    canal
      .on("presence", { event: "sync" }, atualizar)
      .on("presence", { event: "join" }, atualizar)
      .on("presence", { event: "leave" }, atualizar)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void canal.track({ nome: meuNome, em: new Date().toISOString() });
      });
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [tenantId, euSouId, meuNome]);

  const mudarAtendimento = useMutation({
    mutationFn: (v: { conversaId: string; modo: "humano" | "cortai" }) =>
      definirAtendimentoDaConversa({ data: v }),
    onSuccess: async (_r, v) => {
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ["atendentes-conversas"] });
      if (v.modo === "humano") {
        void navigate({ to: "/barbeiro/cortai", search: { aba: "conversas", conversa: v.conversaId } });
      }
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível concluir."),
  });

  const lista: ConversaDeWhatsapp[] = conversas.data ?? [];
  const emEspera = lista.filter((c) => c.status !== "encerrada" && !c.modoHumano && c.naoLidas > 0);
  const comHumano = lista.filter((c) => c.modoHumano || c.status === "humano");
  const comCortai = lista.filter((c) => c.status === "ativa" && c.iaAtiva && !c.modoHumano && c.naoLidas === 0);

  return (
    <Screen
      title="Painel de atendentes"
      subtitle="Quem está online agora e as conversas que precisam de gente."
      voltarPara="/barbeiro/mais"
      wide
    >
      {erro ? <p className="mb-4 text-sm text-danger">{erro}</p> : null}

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <UsersRound size={18} strokeWidth={1.75} />
          Equipe
        </h2>
        {equipe.isLoading ? (
          <Carregando />
        ) : !equipe.data?.atendentes.length ? (
          <EmptyState text="Ninguém cadastrado na equipe ainda." />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {equipe.data.atendentes.map((a) => {
              const ativo = online.includes(a.userId);
              return (
                <li key={a.userId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.nome}
                      {a.userId === euSouId ? " (você)" : ""}
                    </p>
                    <p className="text-xs text-mute">{NOME_DO_PAPEL[a.papel] ?? a.papel}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs ${ativo ? "text-success" : "text-mute"}`}>
                    <Circle size={9} strokeWidth={1.75} className={ativo ? "fill-current" : ""} />
                    {ativo ? "Online" : "Offline"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MessageCircle size={18} strokeWidth={1.75} />
          Esperando resposta
        </h2>
        <ListaDeConversas
          conversas={emEspera}
          vazio="Nenhuma conversa esperando agora."
          acao={(c) => (
            <Button
              size="sm"
              disabled={mudarAtendimento.isPending}
              onClick={() => mudarAtendimento.mutate({ conversaId: c.id, modo: "humano" })}
            >
              <UserCheck size={16} strokeWidth={1.75} />
              Assumir conversa
            </Button>
          )}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <UserCheck size={18} strokeWidth={1.75} />
          Em atendimento humano
        </h2>
        <ListaDeConversas
          conversas={comHumano}
          vazio="Ninguém da equipe assumiu conversas agora."
          acao={(c) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void navigate({ to: "/barbeiro/cortai", search: { aba: "conversas", conversa: c.id } })
                }
              >
                Abrir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={mudarAtendimento.isPending}
                onClick={() => mudarAtendimento.mutate({ conversaId: c.id, modo: "cortai" })}
              >
                Devolver ao CortAI
              </Button>
            </div>
          )}
        />
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Bot size={18} strokeWidth={1.75} />
          Com o CortAI
        </h2>
        <ListaDeConversas
          conversas={comCortai}
          vazio="Nenhuma conversa com o CortAI agora."
          acao={(c) => (
            <Button
              size="sm"
              variant="outline"
              disabled={mudarAtendimento.isPending}
              onClick={() => mudarAtendimento.mutate({ conversaId: c.id, modo: "humano" })}
            >
              <UserCheck size={16} strokeWidth={1.75} />
              Assumir conversa
            </Button>
          )}
        />
      </section>
    </Screen>
  );
}

function ListaDeConversas({
  conversas,
  vazio,
  acao,
}: {
  conversas: ConversaDeWhatsapp[];
  vazio: string;
  acao: (c: ConversaDeWhatsapp) => React.ReactNode;
}) {
  if (!conversas.length) return <EmptyState text={vazio} />;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {conversas.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.nomeContato ?? c.telefone}</p>
            <p className="text-xs text-mute">
              {quandoFoi(c.ultimaMensagemEm)}
              {c.naoLidas > 0 ? ` · ${c.naoLidas} não lida${c.naoLidas > 1 ? "s" : ""}` : ""}
            </p>
          </div>
          {acao(c)}
        </li>
      ))}
    </ul>
  );
}
