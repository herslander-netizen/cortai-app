import { createFileRoute } from "@tanstack/react-router";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminScreen } from "@/components/layout/AdminScreen";
import { Carregando } from "@/components/layout/Carregando";
import { CodigoPorNumeroDoNegocio } from "@/components/admin/CodigoPorNumeroDoNegocio";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import {
  definirNotificacoesDoNegocio,
  listarWhatsappDosNegocios,
  operarWhatsappDoNegocio,
  type WhatsappDoNegocio,
} from "@/lib/whatsapp-central.functions";

export const Route = createFileRoute("/admin/whatsapp")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "WhatsApp dos estabelecimentos — Administração Cortaí" },
      {
        name: "description",
        content: "Status, número, QR Code e notificações do WhatsApp de cada estabelecimento.",
      },
      { property: "og:title", content: "WhatsApp dos estabelecimentos — Administração Cortaí" },
      { property: "og:description", content: "Controle do WhatsApp por estabelecimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminWhatsappPage,
});

const ROTULO: Record<string, string> = {
  conectado: "Conectado",
  qr_pronto: "Aguardando leitura do QR Code",
  pendente: "Conectando",
  conectando: "Conectando",
  erro: "Com erro",
  desconectado: "Desconectado",
  sem_conexao: "Sem WhatsApp",
};

type Acao = "conectar" | "qr" | "reconectar" | "desconectar" | "sincronizar";

function AdminWhatsappPage() {
  const listar = useServerFn(listarWhatsappDosNegocios);
  const negocios = useQuery({
    queryKey: ["admin-whatsapp-negocios"],
    queryFn: () => listar(),
    refetchInterval: 15_000,
  });
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <AdminScreen
      title="WhatsApp"
      subtitle="Uma conexão por estabelecimento. Notificações saem pelo número da própria empresa."
    >
      {negocios.isLoading ? <Carregando /> : null}
      {negocios.isError ? (
        <Aviso tom="acao">
          Acesso negado ou indisponível.
        </Aviso>
      ) : null}
      <ul className="space-y-2">
        {(negocios.data ?? []).map((n) => (
          <li key={n.tenantId} className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 w-full justify-between gap-3 rounded-[12px] px-3 text-left"
              onClick={() => setAberto(aberto === n.tenantId ? null : n.tenantId)}
              aria-expanded={aberto === n.tenantId}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-paper">{n.nome}</span>
                <span className="block text-xs text-mute2">
                  {ROTULO[n.status] ?? n.status}
                  {n.compartilhada ? " · número compartilhado do Cortaí" : ""}
                  {n.numero ? ` · ${n.numero}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs text-mute">
                Avisos {n.notificacoesAtivas ? "ligados" : "desligados"}
              </span>
            </Button>
            {aberto === n.tenantId ? <Detalhe negocio={n} /> : null}
          </li>
        ))}
      </ul>
    </AdminScreen>
  );
}

function Detalhe({ negocio: n }: { negocio: WhatsappDoNegocio }) {
  const [confirmar, dialogo] = useConfirmar();
  const cliente = useQueryClient();
  const operar = useServerFn(operarWhatsappDoNegocio);
  const definir = useServerFn(definirNotificacoesDoNegocio);
  const recarregar = () => cliente.invalidateQueries({ queryKey: ["admin-whatsapp-negocios"] });
  const acao = useMutation({
    mutationFn: (a: Acao) => operar({ data: { tenantId: n.tenantId, acao: a } }),
    onSettled: recarregar,
  });
  const avisos = useMutation({
    mutationFn: (ativas: boolean) => definir({ data: { tenantId: n.tenantId, ativas } }),
    onSettled: recarregar,
  });
  const temPropria = n.status !== "sem_conexao" && !n.compartilhada;

  return (
    <div className="mt-3 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] p-4">
      {dialogo}
      {n.ultimoErro ? <p className="text-xs text-mute2">Último erro: {n.ultimoErro}</p> : null}
      {n.verificadoEm ? (
        <p className="text-xs text-mute2">
          Verificado em{" "}
          {new Date(n.verificadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      ) : null}
      {n.temNumeroAntigoDeAvisos ? (
        <p className="mt-1 text-xs text-mute2">
          Tem um número antigo de avisos que não é mais usado.
        </p>
      ) : null}
      {acao.data?.aviso ? (
        <p className="mt-2 text-sm text-brick" role="alert">
          {acao.data.aviso}
        </p>
      ) : null}
      {n.qrCode ? (
        <div className="mx-auto mt-4 w-64 max-w-full rounded-xl bg-paper p-3">
          <QrCodeReal valor={n.qrCode} alt={`QR Code do WhatsApp de ${n.nome}`} />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {n.status !== "conectado" || !temPropria ? (
          <Button size="sm" disabled={acao.isPending} onClick={() => acao.mutate("conectar")}>
            Conectar
          </Button>
        ) : null}
        {temPropria ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={acao.isPending}
              onClick={() => acao.mutate("qr")}
            >
              Gerar QR Code
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={acao.isPending}
              onClick={() => acao.mutate("sincronizar")}
            >
              Atualizar estado
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={acao.isPending}
              onClick={() => acao.mutate("reconectar")}
            >
              Reconectar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={acao.isPending}
              onClick={async () => {
                if (
                  await confirmar({
                    titulo: `Desconectar o WhatsApp de ${n.nome}?`,
                    descricao: "Nada é apagado.",
                    confirmar: "Desconectar",
                    destrutivo: true,
                  })
                )
                  acao.mutate("desconectar");
              }}
            >
              Desconectar
            </Button>
          </>
        ) : null}
      </div>
      <CodigoPorNumeroDoNegocio tenantId={n.tenantId} />
      <div className="mt-4 flex items-center justify-between gap-3 pt-3">
        <span className="text-sm text-paper">Notificações pelo WhatsApp</span>
        <Button
          size="sm"
          variant={n.notificacoesAtivas ? "secondary" : "default"}
          disabled={avisos.isPending}
          onClick={() => avisos.mutate(!n.notificacoesAtivas)}
        >
          {n.notificacoesAtivas ? "Desativar" : "Ativar"}
        </Button>
      </div>
    </div>
  );
}
