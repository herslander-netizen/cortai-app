import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, ShieldAlert, Unplug } from "lucide-react";

import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAcao } from "@/hooks/useAcao";
import {
  getEstadoAsaas,
  removerChaveAsaas,
  salvarChaveAsaas,
  testarConexaoAsaas,
} from "@/lib/admin.functions";
import { Aviso } from "@/components/ui/aviso";

export const Route = createFileRoute("/admin/asaas")({
  head: () => ({
    meta: [
      { title: "Conta Asaas — Administração Flow" },
      {
        name: "description",
        content: "Configuração segura da conta Asaas usada pela plataforma Flow.",
      },
      { property: "og:title", content: "Conta Asaas — Administração Flow" },
      { property: "og:description", content: "Configuração da conta Asaas da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContaAsaasPage,
});

function ContaAsaasPage() {
  const formulario = useRef<HTMLFormElement>(null);
  const [mensagemTeste, setMensagemTeste] = useState("");
  const query = useQuery({
    queryKey: ["admin", "asaas", "estado"],
    queryFn: () => getEstadoAsaas(),
    retry: false,
  });
  const salvar = useServerFn(salvarChaveAsaas);
  const testar = useServerFn(testarConexaoAsaas);
  const remover = useServerFn(removerChaveAsaas);
  const acao = useAcao();

  if (query.isError) {
    return (
      <AdminScreen title="Conta Asaas" subtitle="Configuração restrita da plataforma.">
        <AdminNotice error={query.error} />
      </AdminScreen>
    );
  }

  const estado = query.data;
  const ambiente = estado?.ambiente === "producao" ? "Produção" : "Sandbox";

  return (
    <AdminScreen
      title="Conta Asaas"
      subtitle="Configure a chave usada pela integração já existente da plataforma."
    >
      <div className="max-w-2xl space-y-8">
        <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]">
              <KeyRound size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-paper">Estado da configuração</h2>
              {!estado ? (
                <p className="mt-2 text-sm text-mute">Verificando…</p>
              ) : estado.configurada ? (
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-sage">
                  <CheckCircle2 size={18} aria-hidden />
                  Configurada · {ambiente}
                </p>
              ) : (
                <p className="mt-2 text-sm font-semibold text-mute">Não configurada</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
          <h2 className="text-base font-semibold text-paper">
            {estado?.configurada ? "Substituir chave de API" : "Informar chave de API"}
          </h2>
          <Aviso tom="atencao" className="mt-3">
            A chave é sensível. Crie-a no painel web do Asaas e informe somente neste campo; nunca
            envie a chave por chat. Depois de salva, ela não poderá ser visualizada.
          </Aviso>
          <form
            ref={formulario}
            className="mt-5 space-y-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              setMensagemTeste("");
              const dados = new FormData(evento.currentTarget);
              const chave = String(dados.get("chave") ?? "").trim();
              void acao.executar("salvar", () => salvar({ data: { chave } }), {
                sucesso: "Chave do Asaas salva com segurança.",
                aoConcluir: async () => {
                  formulario.current?.reset();
                  await query.refetch();
                },
              });
            }}
          >
            <label className="field-label" htmlFor="chave-asaas">
              Chave de API do Asaas
            </label>
            <input
              id="chave-asaas"
              name="chave"
              type="password"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="$aact_prod_… ou $aact_hmlg_…"
              className="field-control min-h-12 rounded-[12px] text-base"
            />
            <Button type="submit" size="lg" disabled={acao.ocupado} className="w-full sm:w-auto">
              {acao.estaEm("salvar")
                ? "Salvando…"
                : estado?.configurada
                  ? "Substituir chave"
                  : "Salvar chave"}
            </Button>
          </form>
        </section>

        <section className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
          <h2 className="text-base font-semibold text-paper">Conexão</h2>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            O teste consulta apenas os dados da própria conta no Asaas. Nenhuma cobrança é criada.
          </p>
          {mensagemTeste ? (
            <p className="mt-3 text-sm font-semibold text-sage" role="status">
              {mensagemTeste}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={!estado?.configurada || acao.ocupado}
              onClick={() => {
                setMensagemTeste("");
                void acao.executar("testar", () => testar(), {
                  aoConcluir: (resultado) => setMensagemTeste(resultado.mensagem),
                });
              }}
            >
              {acao.estaEm("testar") ? "Testando…" : "Testar conexão"}
            </Button>
            {estado?.configurada ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="lg" disabled={acao.ocupado}>
                    <Unplug size={18} aria-hidden />
                    Remover chave
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover a chave do Asaas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A configuração salva no Flow será apagada. A chave não será alterada no Asaas
                      e nenhuma variável de ambiente será modificada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter chave</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-brick text-paper hover:bg-brick/90"
                      onClick={() => {
                        setMensagemTeste("");
                        void acao.executar("remover", () => remover(), {
                          sucesso: "Configuração salva removida.",
                          aoConcluir: async () => {
                            await query.refetch();
                          },
                        });
                      }}
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </section>
      </div>
    </AdminScreen>
  );
}
