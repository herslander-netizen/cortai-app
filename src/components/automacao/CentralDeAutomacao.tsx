import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";

import { IconeWhatsApp } from "@/components/comanda/FolhaDoTicket";
import { Carregando } from "@/components/layout/Carregando";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { definirAutomacaoWhatsapp, getCentralDeAutomacao } from "@/lib/central-automacao.functions";
import { sincronizarConexao } from "@/lib/whatsapp.functions";
import { haQuanto, linhasDaCentral, type TomDaLinha } from "@/lib/whatsapp/central-rotulos";

const COR_DO_TOM: Record<TomDaLinha, string> = {
  ok: "bg-sage",
  alerta: "bg-gold",
  erro: "bg-brick",
  neutro: "bg-mute2",
};
const TEXTO_DO_TOM: Record<TomDaLinha, string> = {
  ok: "text-sage",
  alerta: "text-gold",
  erro: "text-brick",
  neutro: "text-mute",
};

const CHAVE = ["central-automacao"] as const;

/** Central de automação: um cartão principal, cinco linhas de estado e o histórico. */
export function CentralDeAutomacao() {
  const cliente = useQueryClient();
  const carregar = useServerFn(getCentralDeAutomacao);
  const definir = useServerFn(definirAutomacaoWhatsapp);
  const verificar = useServerFn(sincronizarConexao);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verHistorico, setVerHistorico] = useState(false);

  const consulta = useQuery({
    queryKey: CHAVE,
    queryFn: () => carregar(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const interruptor = useMutation({
    mutationFn: (alvo: { ativa: boolean; anterior: boolean }) => definir({ data: alvo }),
    onSuccess: (r) => setAviso(r.ok ? null : r.mensagem),
    onError: () => setAviso("Não foi possível concluir a alteração agora. Nada foi mudado."),
    // Sempre relê do servidor: a tela só mostra o que o backend confirmou.
    onSettled: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });

  const checagem = useMutation({
    mutationFn: () => verificar({ data: { tipo: "atendimento" } }),
    onSuccess: (r) => setAviso(r.aviso),
    onError: () => setAviso("Não foi possível verificar agora."),
    onSettled: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });

  // Uma releitura que falha mantém o último estado conhecido; erro só aparece sem nenhum dado.
  if (!consulta.data && consulta.isLoading) return <Carregando />;
  if (!consulta.data)
    return (
      <p className="border-y border-line py-8 text-center text-sm text-brick" role="alert">
        Não conseguimos carregar a automação agora. Tente de novo em instantes.
      </p>
    );

  const { central, historico, podeGerenciar } = consulta.data;
  const agora = new Date();
  const linhas = linhasDaCentral(central);
  const ultimaFalha = historico.find((o) => o.resultado === "erro") ?? null;
  const trocando = interruptor.isPending;

  return (
    <div className="space-y-4">
      <section
        className="surface p-5"
        aria-labelledby="cartao-principal-automacao"
        data-tom={central.principal.tom}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-mute2">
              WhatsApp com IA
            </p>
            <h2
              id="cartao-principal-automacao"
              className="mt-1 flex items-start gap-2 text-lg font-semibold text-paper"
            >
              <span
                aria-hidden
                className={`mt-2 size-2.5 shrink-0 rounded-full ${COR_DO_TOM[central.principal.tom]}`}
              />
              {central.principal.titulo}
            </h2>
            {central.numero ? <p className="mt-0.5 text-sm text-mute">{central.numero}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            {trocando ? <Loader2 className="size-4 animate-spin text-mute" aria-hidden /> : null}
            <Switch
              checked={central.automacaoLigada}
              disabled={!podeGerenciar || trocando}
              aria-label="Ligar ou desligar a IA no WhatsApp"
              onCheckedChange={(ativa) =>
                interruptor.mutate({ ativa, anterior: central.automacaoLigada })
              }
            />
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-mute" role="status">
          {central.principal.mensagem}
        </p>
        {!podeGerenciar ? (
          <p className="mt-2 text-xs text-mute2">
            Só quem gerencia o WhatsApp pode ligar ou desligar a automação.
          </p>
        ) : null}
        {aviso ? (
          <p className="mt-3 text-sm text-brick" role="alert">
            {aviso}
          </p>
        ) : null}
        {podeGerenciar && central.principal.acao !== "nenhuma" ? (
          <div className="mt-4">
            {central.principal.acao === "conectar" ? (
              <Button asChild className="min-h-12 w-full">
                <Link to="/barbeiro/cortai" search={{ aba: "whatsapp" }}>
                  Conectar WhatsApp
                </Link>
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="min-h-12 w-full"
                disabled={checagem.isPending}
                onClick={() => checagem.mutate()}
              >
                {checagem.isPending ? "Verificando…" : "Verificar conexão"}
              </Button>
            )}
          </div>
        ) : null}
      </section>

      <section aria-label="Estado de cada parte" className="surface divide-y divide-line">
        {linhas.map((l) => (
          <div key={l.chave} className="flex min-h-12 items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm text-paper">{l.rotulo}</span>
            <span className={`flex items-center gap-2 text-sm font-medium ${TEXTO_DO_TOM[l.tom]}`}>
              <span aria-hidden className={`size-2 rounded-full ${COR_DO_TOM[l.tom]}`} />
              {l.estado}
            </span>
          </div>
        ))}
        <div className="space-y-1 px-5 py-3 text-xs text-mute2">
          <p>Última verificação: {haQuanto(central.ultimaVerificacaoEm, agora)}</p>
          {ultimaFalha ? (
            <p>
              Última falha: {ultimaFalha.texto}, {haQuanto(ultimaFalha.quando, agora)}
            </p>
          ) : null}
          {central.monitoramento === "ativo" ? (
            <p>Alertas de queda e recuperação chegam pelo sininho e pelas notificações do app.</p>
          ) : null}
        </div>
      </section>

      <section aria-label="Ocorrências recentes">
        <Button
          variant="ghost"
          className="min-h-12 w-full justify-between px-1 text-sm text-mute"
          aria-expanded={verHistorico}
          onClick={() => setVerHistorico((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <History className="size-4" aria-hidden />
            Ocorrências recentes
          </span>
          <span>{verHistorico ? "Ocultar" : "Ver"}</span>
        </Button>
        {verHistorico ? (
          historico.length === 0 ? (
            <p className="px-1 py-3 text-sm text-mute2">Nenhuma ocorrência registrada ainda.</p>
          ) : (
            <ul className="surface divide-y divide-line">
              {historico.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <span className="flex items-start gap-2 text-sm text-paper">
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${COR_DO_TOM[o.resultado]}`}
                    />
                    {o.texto}
                  </span>
                  <span className="shrink-0 text-xs text-mute2">
                    {new Date(o.quando).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </div>
  );
}

/** Cabeçalho da tela: ícone discreto do WhatsApp, título e subtítulo. */
export function CabecalhoDaAutomacao() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-drawer-card text-[var(--whatsapp)]">
        <IconeWhatsApp className="size-5" />
      </span>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-paper">Automação do WhatsApp</h1>
        <p className="text-sm text-mute">Atendimento e avisos inteligentes</p>
      </div>
    </div>
  );
}
