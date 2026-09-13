import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { Switch } from "@/components/ui/switch";
import { useContextoBarbearia } from "@/hooks/useContextoBarbearia";
import { definirRecursoDaBarbearia } from "@/lib/recursos.functions";
import { ESSENCIAIS, RECURSOS_OPCIONAIS, type ChaveRecursoTenant } from "@/lib/recursos";

export const Route = createFileRoute("/barbeiro/recursos")({
  head: () => ({ meta: [
    { title: "Recursos da barbearia — Cortaí Gestão" },
    { name: "description", content: "Ative somente os recursos que a sua barbearia usa no dia a dia." },
    { property: "og:title", content: "Recursos da barbearia — Cortaí Gestão" },
    { property: "og:description", content: "Ligue e desligue recursos sem perder nenhum dado." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RecursosDaBarbearia,
});

function RecursosDaBarbearia() {
  const contexto = useContextoBarbearia();
  const definir = useServerFn(definirRecursoDaBarbearia);
  const cliente = useQueryClient();
  const [status, setStatus] = useState("");
  const [erro, setErro] = useState("");
  const [confirmar, setConfirmar] = useState<ChaveRecursoTenant | null>(null);

  const podeGerenciar = contexto.pode("alterar_dados_barbearia");

  async function aplicar(chave: ChaveRecursoTenant, ativo: boolean) {
    setErro("");
    setStatus("");
    try {
      await definir({ data: { chave, ativo } });
      await cliente.invalidateQueries({ queryKey: ["contexto-barbearia"] });
      const rotulo = RECURSOS_OPCIONAIS.find((r) => r.chave === chave)?.rotulo ?? chave;
      setStatus(`${rotulo}: ${ativo ? "ativo" : "desligado"}. Seus dados continuam salvos.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível alterar agora.");
    }
  }

  return (
    <Screen title="Recursos da barbearia" subtitle="Ative somente o que sua barbearia usa." voltarPara="/barbeiro/mais">
      {contexto.carregando ? <Carregando texto="Carregando recursos…" /> : !podeGerenciar ? (
        <p className="rounded-xl border border-line bg-ink2 p-5 text-sm text-mute">Somente quem pode alterar os dados da barbearia gerencia os recursos.</p>
      ) : (
        <>
          {status ? <p className="mb-4 text-sm text-sage" role="status">{status}</p> : null}
          {erro ? <p className="mb-4 text-sm text-red-400" role="alert">{erro}</p> : null}

          <h2 className="text-xs font-semibold uppercase tracking-wide text-mute2">Recursos opcionais</h2>
          <ul className="mt-3 space-y-2">
            {RECURSOS_OPCIONAIS.map((recurso) => {
              const estado = contexto.dados?.recursos.find((r) => r.chave === recurso.chave);
              const bloqueadoPeloPlano = estado && !estado.disponivelNoPlano;
              const perguntando = confirmar === recurso.chave;
              return (
                <li key={recurso.chave} className="rounded-xl border border-line bg-ink2 px-4 py-3.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-paper">{recurso.rotulo}</p>
                      <p className="mt-0.5 truncate text-xs text-mute">{recurso.descricao}</p>
                    </div>
                    {bloqueadoPeloPlano ? (
                      <span className="shrink-0 text-[10px] uppercase text-mute2">Indisponível no plano</span>
                    ) : (
                      <Switch
                        checked={Boolean(estado?.ativo)}
                        aria-label={recurso.rotulo}
                        onCheckedChange={(valor) => {
                          if (!valor && recurso.alertaAoDesligar) { setConfirmar(recurso.chave); return; }
                          void aplicar(recurso.chave, valor);
                        }}
                      />
                    )}
                  </div>
                  {perguntando ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="text-xs text-mute">{recurso.alertaAoDesligar} Seus dados continuam salvos.</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="rounded-lg border border-line px-3 py-2 text-xs text-paper" onClick={() => setConfirmar(null)}>Manter ativo</button>
                        <button type="button" className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink" onClick={() => { setConfirmar(null); void aplicar(recurso.chave, false); }}>Desligar</button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-mute2">Essenciais</h2>
          <ul className="mt-3 space-y-2">
            {ESSENCIAIS.map((item) => (
              <li key={item.rotulo} className="rounded-xl border border-line/60 px-4 py-3">
                <p className="text-sm font-semibold text-paper">{item.rotulo}</p>
                <p className="mt-0.5 text-xs text-mute">{item.descricao}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-mute2">Desligar um recurso não apaga nada. Ele apenas some da navegação e das ações da equipe.</p>
        </>
      )}
    </Screen>
  );
}
