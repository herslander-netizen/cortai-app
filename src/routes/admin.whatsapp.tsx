import { createFileRoute } from "@tanstack/react-router";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminScreen } from "@/components/layout/AdminScreen";
import { EsqueletoLista, EsqueletoMetricas } from "@/components/layout/Esqueleto";
import { PainelSaudeWhatsapp } from "@/components/admin/PainelSaudeWhatsapp";
import { CodigoPorNumeroDoNegocio } from "@/components/admin/CodigoPorNumeroDoNegocio";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
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
      { title: "WhatsApp dos estabelecimentos — Administração Flow" },
      {
        name: "description",
        content: "Status, número, QR Code e notificações do WhatsApp de cada estabelecimento.",
      },
      { property: "og:title", content: "WhatsApp dos estabelecimentos — Administração Flow" },
      { property: "og:description", content: "Controle do WhatsApp por estabelecimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminWhatsappPage,
});

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
      {negocios.isLoading && !negocios.data ? (
        <>
          <EsqueletoMetricas colunas={4} />
          <EsqueletoLista linhas={5} />
        </>
      ) : null}
      {negocios.isError ? (
        <Aviso tom="acao">
          {negocios.data
            ? "Falha ao atualizar as conexões. Os estados abaixo são da última leitura disponível e podem estar desatualizados."
            : "Não foi possível consultar as conexões dos estabelecimentos."}
        </Aviso>
      ) : null}
      {negocios.data ? (
        <PainelSaudeWhatsapp
          negocios={negocios.data}
          aberto={aberto}
          aoAlternar={(id) => setAberto(aberto === id ? null : id)}
          detalhe={(n) => <Detalhe negocio={n} />}
        />
      ) : null}
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
    <div className="pt-4">
      {dialogo}
      {n.ultimoErro ? (
        <p className="break-words text-xs text-mute2">
          Último erro registrado: {n.ultimoErro.slice(0, 250)}
        </p>
      ) : null}
      {n.verificadoEm ? (
        <p className="text-xs text-mute2">
          Verificado em{" "}
          {new Date(n.verificadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      ) : null}
      {n.incidenteAberto ? (
        <p className="mt-2 text-xs font-medium text-brick">
          Há uma ocorrência aberta para este estabelecimento.
        </p>
      ) : null}
      {n.tentativasReconexao > 0 ? (
        <p className="mt-2 text-xs text-mute2">
          Tentativas automáticas de reconexão registradas: {n.tentativasReconexao}
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
