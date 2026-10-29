import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAcao } from "@/hooks/useAcao";
import { AlertTriangle, CalendarDays, MessageCircle, Phone, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExclusaoPermanente } from "@/components/seguranca/ExclusaoPermanente";
import { SuporteBarbearia } from "@/components/admin/SuporteBarbearia";
import { CortaiDoNegocio } from "@/components/admin/CortaiDoNegocio";
import {
  addRetentionContact,
  definirStatusDaBarbearia,
  excluirBarbearia,
  getAdminTenants,
  getRetentionContacts,
  type AdminTenant,
} from "@/lib/admin.functions";
import { EsqueletoLista } from "@/components/layout/Esqueleto";

export const Route = createFileRoute("/admin/barbearias")({
  head: () => ({
    meta: [
      { title: "Barbearias da plataforma — Cortaí" },
      { name: "description", content: "Acompanhe planos, uso e risco dos negócios do Cortaí." },
      { property: "og:title", content: "Barbearias da plataforma — Cortaí" },
      { property: "og:description", content: "Planos, uso e retenção dos negócios." },
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
    <AdminScreen title="Negócios" subtitle="Saúde, uso e retenção de cada operação.">
      {query.isError ? (
        <AdminNotice error={query.error} />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-12 flex-1 items-center gap-2">
              <Search size={16} className="text-mute" />
              <input
                aria-label="Buscar negócio"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar negócio"
                className="field-control min-w-0 flex-1"
              />
            </label>
            <div className="flex gap-1">
              {(["todas", "pagantes", "risco"] as const).map((item) => (
                <Chip key={item} selecionado={filter === item} onClick={() => setFilter(item)}>
                  {item === "risco" ? "Em risco" : item.charAt(0).toUpperCase() + item.slice(1)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-7 hidden overflow-x-auto md:block">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[1.6fr_.7fr_.7fr_.7fr_.7fr] gap-4 px-3 pb-2 text-xs text-mute">
                <span>Negócio</span>
                <span>Plano</span>
                <span>Ciclo</span>
                <span>Agenda</span>
                <span>Status</span>
              </div>
              {list.map((tenant) => (
                <Button
                  type="button"
                  variant="ghost"
                  key={tenant.id}
                  onClick={() => setSelected(tenant)}
                  className="mt-2 grid min-h-16 w-full grid-cols-[1.6fr_.7fr_.7fr_.7fr_.7fr] items-center gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-3 text-left"
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
                </Button>
              ))}
            </div>
          </div>
          {query.isLoading ? (
            <EsqueletoLista linhas={6} onTentarDeNovo={() => void query.refetch()} />
          ) : null}
          <ul className="mt-6 space-y-2 md:hidden">
            {list.map((tenant) => (
              <li key={tenant.id}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelected(tenant)}
                  className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-left"
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
                </Button>
              </li>
            ))}
          </ul>
          {!query.isLoading && !list.length ? (
            <EmptyState
              className="mt-4"
              title="Nenhum negócio encontrado"
              description="Ajuste a busca ou escolha outro filtro para ver resultados."
            />
          ) : null}
          <TenantDialog
            key={selected?.id ?? "closed"}
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
  const [showContactForm, setShowContactForm] = useState(false);
  if (!tenant) return null;
  const number = (tenant.whatsapp ?? tenant.telefone ?? "").replace(/\D/g, "");
  const message = encodeURIComponent(
    "Olá! Tudo bem? Estou entrando em contato para saber como podemos ajudar seu negócio a aproveitar melhor o Cortaí.",
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="bottom-0 left-0 right-0 top-auto h-[calc(100dvh-0.5rem)] w-full translate-y-0 gap-0 overflow-hidden rounded-b-none rounded-t-[28px] border-b-0 bg-[var(--figaro-surface-container,var(--ink2))] p-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-[min(820px,calc(100dvh-3rem))] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border-b">
        <DialogHeader className="shrink-0 px-5 pb-4 pt-5 pr-14 text-left sm:px-6 sm:pt-6 sm:pr-14">
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle className="truncate">{tenant.nome}</DialogTitle>
            <span className="shrink-0 text-sm text-mute">| Negócio</span>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="capitalize">{tenant.plano}</span>
            <span aria-hidden>·</span>
            <span>{tenant.agendamentos} agendamentos</span>
          </DialogDescription>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={tenant.ativo ? "text-sage" : "text-mute"}>
              {tenant.ativo ? "Ativa" : "Desativada"}
            </span>
            <span aria-hidden className="text-mute2">
              ·
            </span>
            <span className={tenant.risco ? "text-brick" : "text-sage"}>
              {tenant.risco ? "Atenção necessária" : "Operação saudável"}
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid h-auto shrink-0 grid-cols-4 rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))] p-1 px-2 sm:px-4">
            <TabsTrigger
              value="overview"
              className="h-10 rounded-full border-0 px-1 text-xs shadow-none data-[state=active]:bg-[var(--figaro-primary-container,var(--ink2))] data-[state=active]:text-[var(--figaro-primary,var(--primary))] data-[state=active]:shadow-none"
            >
              Visão geral
            </TabsTrigger>
            <TabsTrigger
              value="contact"
              className="h-10 rounded-full border-0 px-1 text-xs shadow-none data-[state=active]:bg-[var(--figaro-primary-container,var(--ink2))] data-[state=active]:text-[var(--figaro-primary,var(--primary))] data-[state=active]:shadow-none"
            >
              Contato
            </TabsTrigger>
            <TabsTrigger
              value="support"
              className="h-10 rounded-full border-0 px-1 text-xs shadow-none data-[state=active]:bg-[var(--figaro-primary-container,var(--ink2))] data-[state=active]:text-[var(--figaro-primary,var(--primary))] data-[state=active]:shadow-none"
            >
              Suporte
            </TabsTrigger>
            <TabsTrigger
              value="cortai"
              className="h-10 rounded-full border-0 px-1 text-xs shadow-none data-[state=active]:bg-[var(--figaro-primary-container,var(--ink2))] data-[state=active]:text-[var(--figaro-primary,var(--primary))] data-[state=active]:shadow-none"
            >
              Cortaí
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <section>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-3">
                    <p className="text-xs text-mute">Status</p>
                    <p className="mt-1 text-sm font-semibold text-paper">
                      {tenant.ativo ? "Ativa" : "Desativada"}
                    </p>
                  </div>
                  <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-3">
                    <p className="text-xs text-mute">Agenda</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-paper">
                      <CalendarDays
                        size={15}
                        className="text-[var(--figaro-primary,var(--primary))]"
                      />
                      {tenant.agendamentos} agendamentos
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-paper">Situação atual</h3>
                {tenant.risco ? (
                  <ul className="mt-3 space-y-2">
                    {tenant.motivosRisco.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-sm text-paper">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-brick" />
                        <span>{reason.replace(/\.$/, "")}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-sage">Nenhum sinal de risco identificado.</p>
                )}
              </section>

              <section className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
                <h3 className="text-sm font-semibold text-paper">Ações administrativas</h3>
                <p className="mt-1 text-xs leading-relaxed text-mute">
                  {tenant.ativo
                    ? "Desativar impede a equipe de operar, sem apagar dados."
                    : "Reativar devolve o acesso normal à equipe."}
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
                      ? "Desativar negócio"
                      : "Reativar negócio"}
                </Button>
                {erroStatus ? <p className="mt-2 text-xs text-brick">{erroStatus}</p> : null}
                <div className="mt-4 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] p-3">
                  <p className="text-xs text-mute2">
                    Prefira desativar. A exclusão apaga tudo desta barbearia para sempre.
                  </p>
                  <div className="mt-2">
                    <ExclusaoPermanente
                      titulo={`Excluir ${tenant.nome} permanentemente`}
                      descricao="Serão apagados agendamentos, clientes, carteiras, vendas, produtos, serviços, profissionais e acessos deste negócio. Não há como recuperar."
                      onExcluir={async () =>
                        (await remover({ data: { tenantId: tenant.id } })).aviso
                      }
                      onSucesso={(aviso) => {
                        if (aviso) toast.warning(`Negócio excluído. ${aviso}`, { duration: 10000 });
                        else toast.success("Negócio excluído.");
                        onChanged();
                      }}
                    />
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="contact" className="mt-0 space-y-5">
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-paper">Contato do negócio</h3>
                  <p className="mt-1 truncate text-xs text-mute">
                    {tenant.whatsapp ?? tenant.telefone ?? "Nenhum número informado"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {tenant.whatsapp ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      onClick={() => setChannel("whatsapp")}
                    >
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
                    <Button
                      asChild
                      size="icon"
                      variant="outline"
                      aria-label="Ligar"
                      onClick={() => setChannel("telefone")}
                    >
                      <a href={`tel:${tenant.telefone}`}>
                        <Phone />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </section>

              <section>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h3 className="text-sm font-semibold text-paper">Histórico de contatos</h3>
                  <Button
                    size="sm"
                    variant={showContactForm ? "ghost" : "outline"}
                    onClick={() => setShowContactForm((open) => !open)}
                  >
                    {showContactForm ? (
                      "Cancelar"
                    ) : (
                      <>
                        <Plus />
                        Registrar contato
                      </>
                    )}
                  </Button>
                </div>
                {showContactForm ? (
                  <div className="mt-4 border-t border-line pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-mute">
                        Canal
                        <select
                          value={channel}
                          onChange={(e) => setChannel(e.target.value as typeof channel)}
                          className="field-control mt-1 w-full"
                        >
                          {tenant.whatsapp ? <option value="whatsapp">WhatsApp</option> : null}
                          {tenant.telefone ? <option value="telefone">Telefone</option> : null}
                        </select>
                      </label>
                      <label className="text-xs text-mute">
                        Resultado
                        <select
                          value={result}
                          onChange={(e) => setResult(e.target.value)}
                          className="field-control mt-1 w-full"
                        >
                          {Object.entries(statusLabel).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="mt-3 block text-xs text-mute">
                      Observação <span className="text-mute2">(opcional)</span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Resumo do contato"
                        rows={2}
                        className="field-control mt-1 min-h-24 w-full resize-y py-3"
                      />
                    </label>
                    <Button
                      loading={acao.estaEm("contato")}
                      success={acao.concluiu("contato")}
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
                            sucesso: "Contato registrado.",
                            aoConcluir: async () => {
                              setNote("");
                              setShowContactForm(false);
                              await contacts.refetch();
                            },
                          },
                        )
                      }
                    >
                      Salvar contato
                    </Button>
                  </div>
                ) : null}
                {contacts.data?.length ? (
                  <ul className="mt-4 space-y-2">
                    {contacts.data.map((contact) => (
                      <li
                        key={contact.id}
                        className="rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] px-3 py-3"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="text-sm text-paper">
                            {contact.canal === "whatsapp" ? "WhatsApp" : "Telefone"}
                          </span>
                          <span className="text-xs text-mute">
                            {statusLabel[contact.resultado]}
                          </span>
                        </div>
                        {contact.observacao ? (
                          <p className="mt-1 text-xs text-mute">{contact.observacao}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-mute">Nenhum contato registrado</p>
                )}
              </section>
            </TabsContent>

            <TabsContent value="support" className="mt-0">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-paper">Editar como suporte</h3>
                <p className="mt-1 text-xs leading-relaxed text-mute">
                  Altere dados em nome da barbearia. As mudanças ficam registradas com o responsável
                  e o motivo.
                </p>
              </div>
              <SuporteBarbearia tenantId={tenant.id} />
            </TabsContent>

            <TabsContent value="cortai" className="mt-0">
              <CortaiDoNegocio tenantId={tenant.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
