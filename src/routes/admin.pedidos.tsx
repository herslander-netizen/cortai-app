import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAcao } from "@/hooks/useAcao";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { Button } from "@/components/ui/button";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { EmptyState } from "@/components/ui/section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAdminTenants,
  getSuggestions,
  saveSuggestion,
  updateSuggestionStatus,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos dos negócios — Flow" },
      {
        name: "description",
        content: "Sugestões agrupadas e priorizadas dos negócios do Flow.",
      },
      { property: "og:title", content: "Pedidos dos negócios — Flow" },
      { property: "og:description", content: "Demanda real dos negócios por novas soluções." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PedidosPage,
});

const statuses = {
  em_analise: "Em análise",
  no_roteiro: "No roteiro",
  em_desenvolvimento: "Em desenvolvimento",
  implementada: "Implementada",
  recusada: "Recusada",
} as const;
type Status = keyof typeof statuses;
type Pedido = Awaited<ReturnType<typeof getSuggestions>>[number];
type Solicitante = Pedido["solicitantes"][number];

function PedidosPage() {
  const query = useQuery({
    queryKey: ["platform-suggestions"],
    queryFn: () => getSuggestions(),
    retry: false,
  });
  const update = useServerFn(updateSuggestionStatus);
  const acao = useAcao();
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Pedido | null>(null);
  return (
    <AdminScreen
      title="Pedidos"
      subtitle="O problema real por trás de cada solicitação."
      actions={
        <Button onClick={() => setNewOpen(true)}>
          <Plus />
          Novo pedido
        </Button>
      }
    >
      {query.isLoading ? (
        <EsqueletoLista linhas={5} onTentarDeNovo={() => void query.refetch()} />
      ) : null}
      {query.isError ? (
        <AdminNotice error={query.error} />
      ) : (
        <div className="space-y-2">
          {query.data?.map((item) => (
            <Button
              type="button"
              variant="ghost"
              key={item.id}
              onClick={() => setSelected(item)}
              className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] gap-5 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-left"
            >
              <span>
                <span className="text-sm font-semibold text-paper">{item.pedido}</span>
                <span className="mt-2 line-clamp-2 block text-xs text-mute">{item.motivo}</span>
              </span>
              <span className="text-right">
                <span className="block text-2xl font-bold text-paper">
                  {item.tenants_que_pediram.length}
                </span>
                <span className="text-xs text-mute">pediram</span>
                <span className="mt-2 block text-xs text-[var(--figaro-primary,var(--primary))]">
                  {statuses[item.status as Status]}
                </span>
              </span>
            </Button>
          ))}
        </div>
      )}
      {!query.isLoading && !query.data?.length ? (
        <EmptyState
          className="mt-4"
          title="Nenhum pedido cadastrado"
          description="Novas solicitações dos estabelecimentos aparecerão aqui."
        />
      ) : null}
      <NewSuggestion
        open={newOpen}
        close={() => setNewOpen(false)}
        done={() => {
          setNewOpen(false);
          query.refetch();
        }}
      />
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected ? (
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))]">
            <DialogHeader>
              <DialogTitle>{selected.pedido}</DialogTitle>
              <DialogDescription>{selected.motivo}</DialogDescription>
            </DialogHeader>
            <label className="text-xs text-mute">
              Status
              <select
                value={selected.status}
                disabled={acao.ocupado}
                onChange={(e) => {
                  const status = e.target.value as Status;
                  void acao.executar(
                    "status",
                    () => update({ data: { id: selected.id, status } }),
                    {
                      sucesso: "Status atualizado.",
                      aoConcluir: async () => {
                        setSelected({ ...selected, status });
                        await query.refetch();
                      },
                    },
                  );
                }}
                className="field-control mt-2 w-full"
              >
                {Object.entries(statuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <section className="mt-4">
              <h3 className="text-sm font-semibold text-paper">Quem pediu</h3>
              <ul className="mt-2 space-y-2">
                {selected.solicitantes.map((tenant: Solicitante) => (
                  <li
                    key={tenant.id}
                    className="flex justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-3"
                  >
                    <span className="text-sm text-paper">
                      {tenant.nome ?? "Barbearia removida"}
                    </span>
                    <span className="text-xs text-mute">
                      {tenant.plano ?? "—"} · {tenant.agendamentos} agend.
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminScreen>
  );
}

function NewSuggestion({
  open,
  close,
  done,
}: {
  open: boolean;
  close: () => void;
  done: () => void;
}) {
  const tenants = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => getAdminTenants(),
    enabled: open,
    retry: false,
  });
  const save = useServerFn(saveSuggestion);
  const acao = useAcao();
  const [pedido, setPedido] = useState("");
  const [motivo, setMotivo] = useState("");
  const [canal, setCanal] = useState("whatsapp");
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))]">
        <DialogHeader>
          <DialogTitle>Novo pedido</DialogTitle>
          <DialogDescription>
            Registre o pedido literal e o problema identificado.
          </DialogDescription>
        </DialogHeader>
        <label className="text-xs text-mute">
          Pedido literal
          <textarea
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            className="field-control mt-2 min-h-20 w-full py-3"
            required
          />
        </label>
        <label className="text-xs text-mute">
          Motivo real
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="field-control mt-2 min-h-24 w-full py-3"
            required
          />
        </label>
        <label className="text-xs text-mute">
          Canal
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className="field-control mt-2 w-full"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="ligacao">Ligação</option>
            <option value="visita">Visita</option>
            <option value="suporte">Suporte</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-xs text-mute">Negócios que pediram</legend>
          <div className="mt-2 max-h-48 overflow-y-auto">
            {tenants.data?.map((tenant) => (
              <label
                key={tenant.id}
                className="flex items-center gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-3 text-sm text-paper"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(tenant.id)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked ? [...old, tenant.id] : old.filter((id) => id !== tenant.id),
                    )
                  }
                  className="accent-[var(--figaro-primary,var(--primary))]"
                />
                {tenant.nome}
                <span className="ml-auto text-xs text-mute">{tenant.plano}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button
          loading={acao.estaEm("pedido")}
          success={acao.concluiu("pedido")}
          disabled={acao.ocupado || !pedido.trim() || !motivo.trim()}
          onClick={() =>
            acao.executar(
              "pedido",
              () =>
                save({
                  data: {
                    pedido,
                    motivo,
                    canal: canal as "whatsapp" | "ligacao" | "visita" | "suporte",
                    tenants: selected,
                    status: "em_analise",
                  },
                }),
              { sucesso: "Pedido registrado.", aoConcluir: () => done() },
            )
          }
        >
          Salvar pedido
        </Button>
      </DialogContent>
    </Dialog>
  );
}
