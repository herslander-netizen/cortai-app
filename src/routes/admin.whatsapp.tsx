import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminScreen } from "@/components/layout/AdminScreen";
import { Carregando } from "@/components/layout/Carregando";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { Button } from "@/components/ui/button";
import {
  definirCentralDoTenant,
  listarTenantsDaCentral,
  obterCentral,
  operarCentral,
} from "@/lib/whatsapp-central.functions";

export const Route = createFileRoute("/admin/whatsapp")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "WhatsApp Central — Administração Cortaí" },
      { name: "description", content: "Número oficial de notificações do Cortaí e liberação por estabelecimento." },
      { property: "og:title", content: "WhatsApp Central — Administração Cortaí" },
      { property: "og:description", content: "Controle do número central de notificações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminWhatsappPage,
});

const ROTULO: Record<string, string> = {
  conectado: "🟢 Conectada",
  qr_pronto: "🟠 Aguardando leitura do QR Code",
  pendente: "🟠 Conectando",
  conectando: "🟠 Conectando",
  erro: "🔴 Com erro",
  desconectado: "⚪ Desconectada",
};

function AdminWhatsappPage() {
  const cliente = useQueryClient();
  const ler = useServerFn(obterCentral);
  const operar = useServerFn(operarCentral);
  const listar = useServerFn(listarTenantsDaCentral);
  const definir = useServerFn(definirCentralDoTenant);
  const central = useQuery({ queryKey: ["admin-central"], queryFn: () => ler(), refetchInterval: 15_000 });
  const tenants = useQuery({ queryKey: ["admin-central-tenants"], queryFn: () => listar() });
  const acao = useMutation({
    mutationFn: (a: "conectar" | "qr" | "reconectar" | "desconectar" | "sincronizar") =>
      operar({ data: { acao: a } }),
    onSuccess: (d) => cliente.setQueryData(["admin-central"], d),
  });
  const flag = useMutation({
    mutationFn: (v: { tenantId: string; habilitada: boolean }) => definir({ data: v }),
    onSettled: () => cliente.invalidateQueries({ queryKey: ["admin-central-tenants"] }),
  });
  const c = central.data;
  const aviso = acao.data?.aviso ?? null;

  return (
    <AdminScreen
      title="WhatsApp Central"
      subtitle="Número oficial que envia as notificações dos estabelecimentos liberados."
    >
      {central.isLoading ? <Carregando /> : null}
      {central.isError ? <p className="text-sm text-brick">Acesso negado ou indisponível.</p> : null}
      {c ? (
        <section className="surface p-5">
          <p className="text-sm font-semibold text-paper">{ROTULO[c.status] ?? c.status}</p>
          {c.numero ? <p className="mt-1 text-sm text-mute">{c.numero}</p> : null}
          {!c.gatewayConfigurado ? (
            <p className="mt-2 text-sm text-brick">Serviço de WhatsApp não configurado.</p>
          ) : null}
          {c.ultimoErro ? <p className="mt-2 text-xs text-mute2">Último erro: {c.ultimoErro}</p> : null}
          {aviso ? <p className="mt-2 text-sm text-brick" role="alert">{aviso}</p> : null}
          {c.qrCode ? (
            <div className="mx-auto mt-4 w-64 max-w-full rounded-xl bg-paper p-3">
              <QrCodeReal valor={c.qrCode} alt="QR Code da Central" />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {c.status !== "conectado" ? (
              <Button disabled={acao.isPending} onClick={() => acao.mutate("conectar")}>Conectar</Button>
            ) : null}
            <Button variant="secondary" disabled={acao.isPending} onClick={() => acao.mutate("qr")}>Gerar QR Code</Button>
            <Button variant="secondary" disabled={acao.isPending} onClick={() => acao.mutate("sincronizar")}>Atualizar estado</Button>
            <Button variant="secondary" disabled={acao.isPending} onClick={() => acao.mutate("reconectar")}>Reconectar</Button>
            <Button variant="ghost" disabled={acao.isPending} onClick={() => acao.mutate("desconectar")}>Desconectar</Button>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-1 text-xs font-semibold uppercase text-mute2">Liberação por estabelecimento</h2>
        <p className="mb-3 text-xs text-mute">
          Só estabelecimentos liberados e sem número próprio de notificações usam a Central. Desligar volta ao
          comportamento anterior, sem apagar nada.
        </p>
        <ul className="divide-y divide-line border-y border-line">
          {(tenants.data ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm text-paper">{t.nome}</span>
                <span className="block text-xs text-mute2">
                  {t.temConexaoPropriaDeNotificacoes
                    ? "Usa número próprio de notificações"
                    : !t.notificacoesAtivas
                      ? "Notificações desligadas pelo estabelecimento"
                      : t.habilitada
                        ? "Usando a Central"
                        : "Fora da Central"}
                </span>
              </span>
              <Button
                size="sm"
                variant={t.habilitada ? "secondary" : "default"}
                disabled={flag.isPending}
                onClick={() => flag.mutate({ tenantId: t.id, habilitada: !t.habilitada })}
              >
                {t.habilitada ? "Desligar" : "Liberar"}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </AdminScreen>
  );
}
