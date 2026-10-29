import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { confirmarMeuAcesso, meuConvite } from "@/lib/equipe.functions";
import { ACOES, MODULOS, PAPEIS, type PapelDeEquipe } from "@/lib/permissoes";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";

export const Route = createFileRoute("/convite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirmar acesso ao negócio — Flow" },
      {
        name: "description",
        content: "Veja o que você pode fazer no negócio e confirme o seu acesso.",
      },
      { property: "og:title", content: "Confirmar acesso ao negócio — Flow" },
      { property: "og:description", content: "Confirme o acesso que o negócio liberou para você." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConvitePage,
});

function ConvitePage() {
  const navigate = useNavigate();
  const convite = useQuery({ queryKey: ["meu-convite"], queryFn: () => meuConvite() });

  const confirmar = useMutation({
    mutationFn: () => confirmarMeuAcesso(),
    onSuccess: () => void navigate({ to: "/barbeiro" }),
  });

  const dados = convite.data;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-10 pt-12">
      <MarcaFlow variante="automatica" className="h-auto w-44" prioridade />

      {convite.isLoading ? (
        <div className="mt-8">
          <EsqueletoFormulario campos={3} onTentarDeNovo={() => void convite.refetch()} />
        </div>
      ) : !dados ? (
        <div className="mt-8 space-y-5">
          <Aviso tom="atencao" titulo="Nenhum acesso de equipe por aqui.">
            Sua conta ainda não foi ligada a um negócio. Peça ao responsável para convidar você.
          </Aviso>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => void navigate({ to: "/app" })}
          >
            Ir para meus agendamentos
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-paper">
              Bem-vindo à {dados.barbearia}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              Seu papel é{" "}
              <span className="font-semibold text-gold">
                {PAPEIS[dados.papel as PapelDeEquipe] ?? dados.papel}
              </span>
              . Confira abaixo o que você pode fazer e confirme para entrar.
            </p>
          </div>

          {!dados.ativo ? (
            <Aviso tom="atencao" titulo="Seu acesso está desativado.">
              Fale com o responsável pelo negócio para liberar a entrada.
            </Aviso>
          ) : null}

          <ul className="space-y-3">
            {MODULOS.map((modulo) => {
              const liberados = modulo.itens.filter((item) =>
                dados.permissoes.includes(item.chave),
              );
              return (
                <li key={modulo.id} className="surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold">
                    {modulo.titulo}
                  </p>
                  {liberados.length === 0 ? (
                    <p className="mt-1 text-xs text-mute2">Sem acesso a este módulo.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {liberados.map((item) => (
                        <li key={item.chave} className="flex items-start gap-2 text-sm text-paper">
                          <ShieldCheck
                            size={15}
                            className="mt-0.5 shrink-0 text-sage"
                            aria-hidden
                          />
                          <span className="min-w-0">
                            {item.rotulo}
                            <span className="ml-2 text-xs uppercase tracking-wide text-mute2">
                              {ACOES[item.acao]}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {confirmar.isError ? (
            <Aviso tom="atencao" titulo="Não foi possível confirmar agora.">
              Tente de novo.
            </Aviso>
          ) : null}

          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={confirmar.isPending || !dados.ativo}
            onClick={() => confirmar.mutate()}
          >
            {confirmar.isPending ? "Confirmando…" : "Confirmar e entrar"}
          </Button>
        </div>
      )}
    </main>
  );
}
