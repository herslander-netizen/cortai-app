import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Instagram, Music2, Share2 } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { aviso } from "@/lib/avisos";
import {
  PLATAFORMAS,
  ROTULO_PLATAFORMA,
  rotuloDoStatus,
  type ConexaoSocial,
  type PlataformaSocial,
} from "@/lib/redes-sociais";
import {
  desconectarRedeSocial,
  getConexoesSociais,
  iniciarConexaoSocial,
} from "@/lib/redes-sociais.functions";

const ICONE_DA_PLATAFORMA: Record<PlataformaSocial, typeof Instagram> = {
  instagram: Instagram,
  tiktok: Music2,
};

const ERROS_DE_RETORNO: Record<string, string> = {
  configuracao: "Esta integração ainda não está configurada. Fale com o suporte do Flow.",
  cancelado: "A conexão foi cancelada antes de concluir.",
  estado: "Não foi possível validar a conexão. Tente de novo.",
  troca: "A plataforma não confirmou a conexão. Tente de novo.",
  salvar: "A conexão foi autorizada, mas não conseguimos salvar. Tente de novo.",
};

export const Route = createFileRoute("/barbeiro/redes")({
  validateSearch: (busca: Record<string, unknown>) => ({
    conectada: typeof busca["conectada"] === "string" ? (busca["conectada"] as string) : undefined,
    erro: typeof busca["erro"] === "string" ? (busca["erro"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Redes sociais — Flow" },
      { name: "description", content: "Conecte o Instagram e o TikTok do seu negócio." },
      { property: "og:title", content: "Redes sociais — Flow" },
      { property: "og:description", content: "Conecte o Instagram e o TikTok do seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RedesPage,
});

function RedesPage() {
  const ler = useServerFn(getConexoesSociais);
  const iniciar = useServerFn(iniciarConexaoSocial);
  const desconectar = useServerFn(desconectarRedeSocial);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const busca = useSearch({ from: "/barbeiro/redes" });
  const q = useQuery({ queryKey: ["conexoes-sociais"], queryFn: () => ler() });
  const [ocupado, setOcupado] = useState<PlataformaSocial | null>(null);
  const [desconectando, setDesconectando] = useState<PlataformaSocial | null>(null);

  useEffect(() => {
    if (busca.conectada) {
      aviso.ok(
        `${ROTULO_PLATAFORMA[busca.conectada as PlataformaSocial] ?? "Conta"} conectada com sucesso.`,
      );
      void qc.invalidateQueries({ queryKey: ["conexoes-sociais"] });
      void navigate({
        to: "/barbeiro/redes",
        search: { conectada: undefined, erro: undefined },
        replace: true,
      });
    } else if (busca.erro) {
      aviso.erro(ERROS_DE_RETORNO[busca.erro] ?? "Não foi possível conectar. Tente de novo.");
      void navigate({
        to: "/barbeiro/redes",
        search: { conectada: undefined, erro: undefined },
        replace: true,
      });
    }
  }, [busca.conectada, busca.erro, navigate, qc]);

  async function conectar(plataforma: PlataformaSocial) {
    setOcupado(plataforma);
    try {
      const r = await iniciar({ data: { plataforma } });
      if (r.simulada) {
        await qc.invalidateQueries({ queryKey: ["conexoes-sociais"] });
        aviso.ok(
          "Conta de demonstração conectada. Quando as chaves das plataformas estiverem ativas, a conexão real usa este mesmo botão.",
        );
      } else if (r.url) {
        window.location.href = r.url;
      }
    } catch (e) {
      aviso.erro(
        e instanceof Error ? e.message : "Não foi possível conectar agora. Tente de novo.",
      );
    } finally {
      setOcupado(null);
    }
  }

  async function confirmarDesconexao() {
    const plataforma = desconectando;
    if (!plataforma) return;
    setDesconectando(null);
    setOcupado(plataforma);
    try {
      await desconectar({ data: { plataforma } });
      await qc.invalidateQueries({ queryKey: ["conexoes-sociais"] });
      aviso.ok(`${ROTULO_PLATAFORMA[plataforma]} desconectado.`);
    } catch (e) {
      aviso.erro(
        e instanceof Error ? e.message : "Não foi possível desconectar agora. Tente de novo.",
      );
    } finally {
      setOcupado(null);
    }
  }

  const conexoes = q.data?.conexoes ?? [];
  const porPlataforma = new Map<PlataformaSocial, ConexaoSocial>(
    conexoes.map((c) => [c.plataforma, c]),
  );

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Redes sociais"
      subtitle="Conecte o Instagram e o TikTok do seu negócio. Desconectar não apaga nenhum dado."
    >
      {q.isLoading ? (
        <EsqueletoFormulario campos={2} onTentarDeNovo={() => void q.refetch()} />
      ) : null}
      {q.isError ? (
        <p className="surface-card p-4 text-sm text-mute">
          Não foi possível carregar agora. Verifique a internet e tente de novo.
        </p>
      ) : null}

      {q.data ? (
        <ul className="space-y-2">
          {PLATAFORMAS.map((plataforma) => {
            const conexao = porPlataforma.get(plataforma);
            const Icone = ICONE_DA_PLATAFORMA[plataforma];
            return (
              <li key={plataforma}>
              <Card density="default">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-[var(--figaro-primary-container,var(--ink2))]">
                    <Icone className="size-6 text-[var(--figaro-primary,var(--primary))]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-paper">
                      {ROTULO_PLATAFORMA[plataforma]}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-mute">
                      {conexao
                        ? `${rotuloDoStatus(conexao.status)}${conexao.conta_nome ? ` · ${conexao.conta_nome}` : ""}`
                        : "Não conectada"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {conexao ? (
                    <Button
                      variant="ghost"
                      className="min-h-12 flex-1 rounded-full"
                      disabled={ocupado !== null}
                      onClick={() => setDesconectando(plataforma)}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="min-h-12 flex-1 rounded-full"
                      disabled={ocupado !== null}
                      onClick={() => void conectar(plataforma)}
                    >
                      {ocupado === plataforma ? "Conectando…" : "Conectar"}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
            );
          })}
        </ul>
      ) : null}

      <p className="mt-6 flex items-start gap-2 text-[13px] text-mute">
        <Share2 className="mt-0.5 size-4 shrink-0" aria-hidden />A publicação automática de fotos e
        vídeos chega na próxima etapa. Por enquanto, esta tela guarda a conexão das suas contas com
        segurança.
      </p>

      <AlertDialog
        open={!!desconectando}
        onOpenChange={(aberto) => !aberto && setDesconectando(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desconectar {desconectando ? ROTULO_PLATAFORMA[desconectando] : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A conta deixa de ficar ligada ao seu negócio. Você pode conectar de novo a qualquer
              momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarDesconexao()}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
