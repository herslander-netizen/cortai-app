import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAcao } from "@/hooks/useAcao";
import { MessageCircle, Phone, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExclusaoPermanente } from "@/components/seguranca/ExclusaoPermanente";
import { SuporteBarbearia } from "@/components/admin/SuporteBarbearia";
import {
  addRetentionContact,
  definirStatusDaBarbearia,
  excluirBarbearia,
  getAdminTenants,
  getRetentionContacts,
  type AdminTenant,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/barbearias")({
  head: () => ({
    meta: [
      { title: "Barbearias da plataforma — Cortaí" },
      { name: "description", content: "Acompanhe planos, uso e risco das barbearias do Cortaí." },
      { property: "og:title", content: "Barbearias da plataforma — Cortaí" },
      { property: "og:description", content: "Planos, uso e retenção das barbearias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BarbeariasPage,
});

const statusLabel: Record<string, string> = {
  sem_resposta: "Sem resposta",
  conversou: "Conversou",
  recuperou: "Recuperou",
  cancelou: "Cancelou",
};

function BarbeariasPage() {
  const query = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => getAdminTenants(),
    retry: false,
  });
  const [filter, setFilter] = useState<"todas" | "pagantes" | "risco">("todas");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const list = useMemo(
    () =>
      (query.data ?? []).filter(
        (t) =>
          (filter === "pagantes" ? t.plano !== "essencial" : filter === "risco" ? t.risco : true) &&
          t.nome.toLowerCase().includes(search.toLowerCase()),
      ),
    [query.data, filter, search],
  );
  return (
    <AdminScreen title="Barbearias" subtitle="Saúde, uso e retenção de cada operação.">
      {query.isError ? (
        <AdminNotice error={query.error} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-2 border-b border-line2 px-1 py-2">
              <Search size={16} className="text-mute" />
              <input
                aria-label="Buscar barbearia"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar barbearia"
                className="w-full bg-transparent text-sm text-paper outline-none placeholder:text-mute2"
              />
            </label>
            <div className="flex gap-1">
              {(["todas", "pagantes", "risco"] as const).map((item) => (
                <Button
                  key={item}
                  size="sm"
                  variant={filter === item ? "default" : "ghost"}
                  onClick={() => setFilter(item)}
                >
                  {item === "risco" ? "Em risco" : item.charAt(0).toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-7 hidden overflow-x-auto md:block">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[1.6fr_.7fr_.7fr_.7fr_.7fr] gap-4 border-b border-line pb-3 text-xs text-mute">
                <span>Barbearia</span>
                <span>Plano</span>
                <span>Ciclo</span>
                <span>Agenda</span>
                <span>Status</span>
              </div>
              {list.map((tenant) => (
                <button
                  type="button"
                  key={tenant.id}
                  onClick={() => setSelected(tenant)}
                  className="grid w-full grid-cols-[1.6fr_.7fr_.7fr_.7fr_.7fr] items-center gap-4 border-b border-line py-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-paper">{tenant.nome}</span>
                    <span className="mt-1 block text-xs text-mute">
                      {tenant.desconto ? `${tenant.desconto}% de desconto` : "sem desconto"}
                    </span>
                  </span>
                  <span className="text-sm capitalize text-paper">{tenant.plano}</span>
                  <span className="text-sm capitalize text-mute">{tenant.ciclo}</span>
                  <span className="text-sm text-paper">{tenant.agendamentos}</span>
                  <span
                    className={
                      !tenant.ativo
                        ? "text-xs font-semibold text-mute"
                        : tenant.risco
                          ? "text-xs font-semibold text-brick"
                          : "text-xs font-semibold text-sage"
                    }
                  >
                    {!tenant.ativo ? "Desativada" : tenant.risco ? "Em risco" : "Saudável"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-6 divide-y divide-line border-y border-line md:hidden">
            {list.map((tenant) => (
              <li key={tenant.id}>
                <button
                  type="button"
                  onClick={() => setSelected(tenant)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-paper">
                      {tenant.nome}
                    </span>
                    <span className="mt-1 block text-xs capitalize text-mute">
                      {tenant.plano} · {tenant.ciclo} · {tenant.agendamentos} agend.
                    </span>
                  </span>
                  <span
                    className={
                      !tenant.ativo
                        ? "text-xs font-semibold text-mute"
                        : tenant.risco
                          ? "text-xs font-semibold text-brick"
                          : "text-xs font-semibold text-sage"
                    }
                  >
                    {!tenant.ativo ? "Desativada" : tenant.risco ? "Em risco" : "Saudável"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!query.isLoading && !list.length ? (
            <p className="mt-8 text-sm text-mute">Nenhuma barbearia neste filtro.</p>
          ) : null}
          <TenantDialog
            tenant={selected}
            onClose={() => setSelected(null)}
            onChanged={() => {
              void query.refetch();
              setSelected(null);
            }}
          />
        </>
      )}
    </AdminScreen>
  );
}

function TenantDialog({
  tenant,
  onClose,
  onChanged,
}: {
  tenant: AdminTenant | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const contacts = useQuery({
    queryKey: ["retention-contacts", tenant?.id],
    queryFn: () => getRetentionContacts({ data: { tenantId: tenant?.id ?? "" } }),
    enabled: Boolean(tenant),
    retry: false,
  });
  const add = useServerFn(addRetentionContact);
  const setStatus = useServerFn(definirStatusDaBarbearia);
  const remover = useServerFn(excluirBarbearia);
  const acao = useAcao();
  const [statusOcupado, setStatusOcupado] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);
  const [result, setResult] = useState("conversou");
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "telefone">("whatsapp");
  if (!tenant) return null;
  const number = (tenant.whatsapp ?? tenant.telefone ?? "").replace(/\D/g, "");
  const message = encodeURIComponent(
    "Olá! Tudo bem? Estou entrando em contato para saber como podemos ajudar sua barbearia a aproveitar melhor o Cortaí.",
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto bg-ink2 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tenant.nome}</DialogTitle>
          <DialogDescription>
            {tenant.plano} · {tenant.agendamentos} agendamentos
          </DialogDescription>
        </DialogHeader>
        {tenant.risco ? (
          <section className="border-l-2 border-brick pl-4">
            <p className="text-xs font-semibold text-brick">Por que está em risco</p>
            {tenant.motivosRisco.map((reason) => (
              <p key={reason} className="mt-2 text-sm text-paper">
                {reason}
              </p>
            ))}
          </section>
        ) : (
          <p className="text-sm text-sage">Operação saudável.</p>
        )}
        <section className="mt-3">
          <h3 className="text-sm font-semibold text-paper">Contatos anteriores</h3>
          {contacts.data?.length ? (
            <ul className="mt-2">
              {contacts.data.map((contact) => (
                <li key={contact.id} className="border-b border-line py-3">
                  <div className="flex justify-between gap-3">
                    <span className="text-sm text-paper">
                      {contact.canal === "whatsapp" ? "WhatsApp" : "Telefone"}
                    </span>
                    <span className="text-xs text-mute">{statusLabel[contact.resultado]}</span>
                  </div>
                  {contact.observacao ? (
                    <p className="mt-1 text-xs text-mute">{contact.observacao}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-mute">Nenhum contato registrado.</p>
          )}
        </section>
        {tenant.whatsapp || tenant.telefone ? (
          <section className="mt-3">
            <div className="flex gap-2">
              {tenant.whatsapp ? (
                <Button asChild onClick={() => setChannel("whatsapp")}>
                  <a
                    href={`https://wa.me/${number}?text=${message}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              {tenant.telefone ? (
                <Button asChild variant="outline" onClick={() => setChannel("telefone")}>
                  <a href={`tel:${tenant.telefone}`}>
                    <Phone />
                    Ligar
                  </a>
                </Button>
              ) : null}
            </div>
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-sm font-semibold text-paper">Registrar resultado</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select
                  aria-label="Canal"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as typeof channel)}
                  className="rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
                >
                  {tenant.whatsapp ? <option value="whatsapp">WhatsApp</option> : null}
                  {tenant.telefone ? <option value="telefone">Telefone</option> : null}
                </select>
                <select
                  aria-label="Resultado"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
                >
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                aria-label="Observação"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Observação do contato"
                className="mt-3 min-h-20 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper"
              />
              <Button
                className="mt-3"
                disabled={acao.ocupado}
                onClick={() =>
                  acao.executar(
                    "contato",
                    () =>
                      add({
                        data: {
                          tenantId: tenant.id,
                          canal: channel,
                          resultado: result as
                            "sem_resposta" | "conversou" | "recuperou" | "cancelou",
                          observacao: note || null,
                        },
                      }),
                    {
                      sucesso: "Resultado registrado.",
                      aoConcluir: async () => {
                        setNote("");
                        await contacts.refetch();
                      },
                    },
                  )
                }
              >
                {acao.estaEm("contato") ? "Salvando…" : "Salvar resultado"}
              </Button>
            </div>
          </section>
        ) : null}
        <section className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-paper">Editar como suporte</h3>
          <p className="mt-1 text-xs text-mute">
            Você edita os dados da barbearia sem entrar na conta dela.
          </p>
          <div className="mt-4">
            <SuporteBarbearia tenantId={tenant.id} />
          </div>
        </section>
        <section className="mt-6 border-t border-line pt-5">
          <p className="text-sm font-semibold text-paper">Situação da barbearia</p>
          <p className="mt-1 text-xs text-mute">
            {tenant.ativo
              ? "Ativa: a equipe consegue usar o Cortaí normalmente."
              : "Desativada: a equipe não consegue operar, mas nenhum dado foi apagado."}
          </p>
          <Button
            className="mt-3"
            variant={tenant.ativo ? "outline" : "default"}
            disabled={statusOcupado}
            onClick={async () => {
              setStatusOcupado(true);
              setErroStatus(null);
              try {
                await setStatus({ data: { tenantId: tenant.id, ativo: !tenant.ativo } });
                onChanged();
              } catch {
                setErroStatus("Não foi possível mudar a situação agora.");
              } finally {
                setStatusOcupado(false);
              }
            }}
          >
            {statusOcupado
              ? "Salvando…"
              : tenant.ativo
                ? "Desativar barbearia"
                : "Reativar barbearia"}
          </Button>
          {erroStatus ? <p className="mt-2 text-xs text-brick">{erroStatus}</p> : null}
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs text-mute2">
              Prefira desativar. A exclusão apaga tudo desta barbearia para sempre.
            </p>
            <div className="mt-2">
              <ExclusaoPermanente
                titulo={`Excluir ${tenant.nome} permanentemente`}
                descricao="Serão apagados agendamentos, clientes, carteiras, vendas, produtos, serviços, profissionais e acessos desta barbearia. Não há como recuperar."
                onExcluir={async () => (await remover({ data: { tenantId: tenant.id } })).aviso}
                onSucesso={(aviso) => {
                  if (aviso) toast.warning(`Negócio excluído. ${aviso}`, { duration: 10000 });
                  else toast.success("Negócio excluído.");
                  onChanged();
                }}
              />
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
