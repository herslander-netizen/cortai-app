import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { FolhaQrWhatsapp } from "@/components/ia/FolhaQrWhatsapp";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { useConfirmar } from "@/components/ui/useConfirmar";
import {
  codigoAtualDaLinhaDaPlataforma,
  codigoDaLinhaDaPlataforma,
  conectarLinhaDaPlataforma,
  desconectarLinhaDaPlataforma,
  getLinhaDaPlataforma,
  sincronizarLinhaDaPlataforma,
} from "@/lib/whatsapp-plataforma.functions";

const CHAVE = ["admin-linha-da-plataforma"] as const;

const ROTULO_DO_EVENTO: Record<string, string> = {
  whatsapp_do_negocio_caiu: "Queda do WhatsApp do negócio",
  cobranca_assinatura: "Cobrança da assinatura",
  boas_vindas_negocio: "Boas-vindas",
  alerta_admin: "Alerta da plataforma",
};

const ROTULO_DO_STATUS: Record<string, string> = {
  conectado: "Conectada",
  conectando: "Conectando…",
  qr_pronto: "Aguardando leitura do QR",
  pendente: "Preparando",
  desconectado: "Desconectada",
  erro: "Com erro",
};

/**
 * Linha da plataforma no ADM (dono, 05/11/2026): o WhatsApp administrativo do Flow, separado dos negócios.
 * Envia só eventos da plataforma para donos e admins com opt-in; nunca avisos de negócio para clientes.
 */
export function LinhaDaPlataformaCartao() {
  const cliente = useQueryClient();
  const [confirmar, dialogo] = useConfirmar();
  const ler = useServerFn(getLinhaDaPlataforma);
  const conectar = useServerFn(conectarLinhaDaPlataforma);
  const sincronizar = useServerFn(sincronizarLinhaDaPlataforma);
  const desconectar = useServerFn(desconectarLinhaDaPlataforma);
  const pedirCodigo = useServerFn(codigoDaLinhaDaPlataforma);
  const codigoAtual = useServerFn(codigoAtualDaLinhaDaPlataforma);
  const [aviso, setAviso] = useState<string | null>(null);
  const [gaveta, setGaveta] = useState(false);
  const [restante, setRestante] = useState<number | null>(null);

  const consulta = useQuery({ queryKey: CHAVE, queryFn: () => ler() });
  const linha = consulta.data?.linha ?? null;
  const conectada = linha?.status === "conectado";

  // Enquanto a gaveta está aberta, acompanha o estado real a cada 5 s (o QR muda a cada ~40 s).
  useQuery({
    queryKey: [...CHAVE, "estado"],
    queryFn: async () => {
      const r = await sincronizar();
      cliente.setQueryData(CHAVE, (antes: typeof consulta.data) =>
        antes ? { ...antes, linha: r.linha } : antes,
      );
      return r;
    },
    enabled: gaveta,
    refetchInterval: gaveta ? 5000 : false,
  });

  useEffect(() => {
    if (conectada) setGaveta(false);
  }, [conectada]);

  useEffect(() => {
    const expira = linha?.qrExpiraEm;
    if (!expira) return setRestante(null);
    const calcular = () =>
      setRestante(Math.max(0, Math.round((new Date(expira).getTime() - Date.now()) / 1000)));
    calcular();
    const id = window.setInterval(calcular, 1000);
    return () => window.clearInterval(id);
  }, [linha?.qrExpiraEm]);

  const acao = useMutation({
    mutationFn: async (qual: "conectar" | "desconectar") =>
      qual === "conectar" ? conectar() : desconectar(),
    onSuccess: (r, qual) => {
      setAviso(r.aviso);
      if (qual === "conectar" && !r.aviso) setGaveta(true);
      void cliente.invalidateQueries({ queryKey: CHAVE });
    },
    onError: () => setAviso("Não foi possível concluir agora."),
  });

  return (
    <section className="mb-6 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
      {dialogo}
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink3))] text-[var(--figaro-primary,var(--primary))]">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-paper">Linha da plataforma</h2>
          <p className="mt-0.5 text-xs text-mute">
            {linha ? (ROTULO_DO_STATUS[linha.status] ?? linha.status) : "Ainda não conectada"}
            {linha?.numero ? ` · ${linha.numero}` : ""}
            {consulta.data ? ` · ${consulta.data.comOptIn} pessoa(s) com avisos ligados` : ""}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-mute">
        WhatsApp do Flow, separado dos negócios. Envia só avisos da plataforma (queda do WhatsApp do
        negócio, cobrança, boas-vindas e alertas) para donos e admins que ligaram os avisos. Nunca
        fala com clientes nem substitui o número de um negócio.
      </p>
      {linha?.ultimoErro ? (
        <Aviso tom="acao" className="mt-3">
          {linha.ultimoErro}
        </Aviso>
      ) : null}
      {aviso ? (
        <Aviso tom="acao" className="mt-3">
          {aviso}
        </Aviso>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {conectada ? (
          <Button
            variant="outline"
            className="text-brick"
            loading={acao.isPending}
            onClick={async () => {
              if (
                await confirmar({
                  titulo: "Desconectar a linha da plataforma?",
                  descricao:
                    "Os avisos da plataforma param até conectar de novo. Os negócios não são afetados.",
                  confirmar: "Desconectar",
                  destrutivo: true,
                })
              )
                acao.mutate("desconectar");
            }}
          >
            Desconectar
          </Button>
        ) : (
          <Button loading={acao.isPending} onClick={() => acao.mutate("conectar")}>
            Conectar
          </Button>
        )}
        {!conectada && linha?.qrCode ? (
          <Button variant="outline" onClick={() => setGaveta(true)}>
            Mostrar QR Code
          </Button>
        ) : null}
      </div>

      {consulta.data?.envios.length ? (
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-mute">
            Últimos avisos ({consulta.data.envios.length})
          </summary>
          <ul className="space-y-1.5">
            {consulta.data.envios.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-paper">
                  {ROTULO_DO_EVENTO[e.evento] ?? e.evento}
                  {e.motivo ? <span className="text-mute2"> · {e.motivo}</span> : null}
                </span>
                <span className="shrink-0 text-mute2">
                  {e.status} · {new Date(e.criadoEm).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {gaveta && linha?.qrCode ? (
        <FolhaQrWhatsapp
          valor={linha.qrCode}
          restante={restante}
          aoFechar={() => setGaveta(false)}
          aoGerarNovo={() => acao.mutate("conectar")}
          gerando={acao.isPending}
          tipo="atendimento"
          aoGerarCodigoPorNumero={() => void cliente.invalidateQueries({ queryKey: CHAVE })}
          gerarCodigo={(telefone) => pedirCodigo({ data: { telefone } })}
          acompanharCodigo={(telefone) => codigoAtual({ data: { telefone } })}
        />
      ) : null}
    </section>
  );
}
