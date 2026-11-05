import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/layout/Screen";
import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { listarEnviosDaSecretaria } from "@/lib/whatsapp.functions";
import { diagnosticoDoEnvio, type TomDoEnvio } from "@/lib/whatsapp/erros-meta";

/**
 * Histórico dos envios automáticos do WhatsApp (aba Atividade) e os avisos da Meta sobre a conta (aba Conexão).
 * Saiu de `barbeiro.cortai.tsx` na reorganização do WhatsApp (dono, 05/11/2026): um assunto por aba.
 */
const COR_DO_TOM: Record<TomDoEnvio, string> = {
  enviado: "border-sage/50 text-sage",
  entregue: "border-sage/60 text-sage",
  lida: "border-gold/60 text-gold",
  aguardando: "border-line2 text-mute",
  sem_modelo: "border-gold/60 text-gold",
  falhou: "border-brick/50 text-brick",
  conta: "border-brick/60 text-brick",
};

const SEMANA = 7 * 24 * 3600_000;

function useEnviosDaSecretaria() {
  return useQuery({
    queryKey: ["secretaria-envios"],
    queryFn: () => listarEnviosDaSecretaria(),
    refetchInterval: 30000,
  });
}

/** Aviso geral: problemas recentes que a Meta está apontando. Não promete correção. */
export function AvisosDaMeta() {
  const envios = useEnviosDaSecretaria();
  const recentes = (envios.data ?? []).filter(
    (e) => Date.now() - new Date(e.criadoEm).getTime() < SEMANA,
  );
  const classes = new Set(recentes.map((e) => diagnosticoDoEnvio(e).tom));
  if (!classes.has("conta") && !classes.has("sem_modelo")) return null;
  return (
    <div className="mb-4 space-y-2">
      {classes.has("conta") ? (
        <Aviso tom="acao" titulo="Regularize a conta oficial">
          A Meta está recusando os envios por um problema de elegibilidade ou pagamento. A conexão
          técnica está ativa, mas a conta precisa ser regularizada na Meta.
        </Aviso>
      ) : null}
      {classes.has("sem_modelo") ? (
        <Aviso tom="atencao" titulo="Template aprovado necessário">
          Algumas mensagens estão fora da janela de 24 horas e precisam de um template aprovado.
        </Aviso>
      ) : null}
    </div>
  );
}

export function HistoricoDeEnvios() {
  const envios = useEnviosDaSecretaria();
  if (envios.isLoading) return <EsqueletoLista />;
  if (envios.isError)
    return (
      <Aviso tom="acao" className="mt-3">
        Não foi possível carregar os envios.
      </Aviso>
    );
  if (!envios.data?.length) return <EmptyState text="Nenhuma notificação enviada ainda." />;
  return (
    <>
      <AvisosDaMeta />
      <section
        className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] overflow-hidden"
        aria-label="Histórico de envios"
      >
        <ul className="space-y-2 p-2">
          {envios.data.map((envio) => {
            const d = diagnosticoDoEnvio(envio);
            return (
              <li
                key={envio.id}
                className="grid gap-2 rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-paper">
                    {envio.tipo.replaceAll("_", " ")}
                  </p>
                  {d.titulo ? (
                    <div className="mt-1">
                      <p className="text-sm font-semibold text-paper">{d.titulo}</p>
                      <p className="text-xs leading-relaxed text-mute">{d.detalhe}</p>
                      {d.acao === "conexao" ? (
                        <Button asChild variant="secondary" className="mt-2 min-h-11">
                          <Link to="/barbeiro/cortai">Verificar conta Meta</Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mute">
                      {envio.conteudo ?? "Envio aguardando processamento."}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-mute2">
                    Final {envio.telefone.slice(-4)} ·{" "}
                    {new Date(envio.criadoEm).toLocaleString("pt-BR")}
                  </p>
                  {d.tecnico ? (
                    <details className="mt-1 text-xs text-mute2">
                      <summary className="cursor-pointer py-1">Detalhe técnico</summary>
                      <p className="break-words">{d.tecnico}</p>
                    </details>
                  ) : null}
                </div>
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs ${COR_DO_TOM[d.tom]}`}
                >
                  {envio.respondidoEm ? "Respondido" : d.rotulo}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
