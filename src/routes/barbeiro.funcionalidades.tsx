import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Banknote,
  CalendarClock,
  HeartHandshake,
  MessageCircle,
  Palette,
  Store,
  TrendingUp,
  UsersRound,
} from "lucide-react";

const ICONE_DO_GRUPO: Record<string, typeof Banknote> = {
  Atendimento: CalendarClock,
  Comunicação: MessageCircle,
  Relacionamento: HeartHandshake,
  Financeiro: Banknote,
  Vendas: Store,
  Crescimento: TrendingUp,
  Aparência: Palette,
  Equipe: UsersRound,
};

import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { LinhaDeFuncionalidade } from "@/components/funcionalidades/LinhaDeFuncionalidade";
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
  GRUPOS_DE_FUNCIONALIDADES,
  dependentesLigados,
  estadoDe,
  podeAlterar,
  resumo,
  type Funcionalidade,
} from "@/lib/funcionalidades";
import { definirFuncionalidade, getFuncionalidades } from "@/lib/funcionalidades.functions";

export const Route = createFileRoute("/barbeiro/funcionalidades")({
  head: () => ({
    meta: [
      { title: "Funcionalidades — Flow" },
      { name: "description", content: "Ligue e desligue as funções opcionais do seu negócio." },
      { property: "og:title", content: "Funcionalidades — Flow" },
      { property: "og:description", content: "Use só o que faz sentido para o seu negócio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FuncionalidadesPage,
});

type Pendente = { item: Funcionalidade; dependentes: Funcionalidade[] };

function FuncionalidadesPage() {
  const ler = useServerFn(getFuncionalidades);
  const definir = useServerFn(definirFuncionalidade);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["funcionalidades"], queryFn: () => ler() });
  const [salvando, setSalvando] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);

  async function salvar(item: Funcionalidade, ativo: boolean) {
    setSalvando(item.chave);
    try {
      await definir({ data: { chave: item.chave, ativo } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["funcionalidades"] }),
        qc.invalidateQueries({ queryKey: ["capacidades"] }),
      ]);
      aviso.ok(`${item.rotulo} ${ativo ? "ativado" : "desativado"}.`);
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível salvar agora. Tente de novo.");
    } finally {
      setSalvando(null);
    }
  }

  function alternar(item: Funcionalidade, ativo: boolean) {
    if (!q.data) return;
    const dependentes = ativo ? [] : dependentesLigados(item.chave, q.data);
    if (dependentes.length) setPendente({ item, dependentes });
    else void salvar(item, ativo);
  }

  const leitura = q.data;
  const r = leitura ? resumo(leitura) : null;

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Funcionalidades"
      subtitle="Ligue só o que você usa. Desligar não apaga nenhum dado."
    >
      {q.isLoading ? (
        <EsqueletoFormulario campos={6} onTentarDeNovo={() => void q.refetch()} />
      ) : null}
      {q.isError ? (
        <p className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4 text-sm text-mute">
          Não foi possível carregar agora. Verifique a internet e tente de novo.
        </p>
      ) : null}

      {leitura && r ? (
        <>
          <p className="mb-5 text-[15px] text-mute">
            <span className="font-semibold text-paper">{r.ativas}</span> de {r.total}{" "}
            funcionalidades ativas
          </p>
          <div className="space-y-4">
            {GRUPOS_DE_FUNCIONALIDADES.map((grupo) => (
              <section key={grupo.titulo} className="space-y-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-paper">
                  {(() => {
                    const Icone = ICONE_DO_GRUPO[grupo.titulo] ?? CalendarClock;
                    return <Icone className="size-4" aria-hidden />;
                  })()}
                  {grupo.titulo}
                </h2>
                <ul className="space-y-2">
                  {grupo.itens.map((item) => {
                    const estado = estadoDe(item, leitura);
                    const depende = item.depende
                      ? estadoDe(
                          GRUPOS_DE_FUNCIONALIDADES.flatMap((g) => g.itens).find(
                            (x) => x.chave === item.depende,
                          )!,
                          leitura,
                        ) === "desativado"
                      : false;
                    return (
                      <LinhaDeFuncionalidade
                        key={item.chave}
                        item={item}
                        estado={estado}
                        planoMinimo={item.plano ? leitura.planoMinimo[item.plano] : undefined}
                        editavel={
                          podeAlterar(item, leitura.permissoes) && !(depende && estado !== "ativo")
                        }
                        salvando={salvando === item.chave}
                        onAlternar={(ativo) => alternar(item, ativo)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          {!leitura.permissoes.includes("alterar_dados_barbearia") ? (
            <p className="mt-6 text-center text-[13px] text-mute">
              Só quem administra o negócio pode mudar estas opções.
            </p>
          ) : null}
        </>
      ) : null}

      <AlertDialog open={!!pendente} onOpenChange={(aberto) => !aberto && setPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar {pendente?.item.rotulo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendente?.dependentes.map((d) => d.rotulo).join(", ")}{" "}
              {pendente && pendente.dependentes.length > 1 ? "dependem" : "depende"} disso e{" "}
              {pendente && pendente.dependentes.length > 1 ? "param" : "para"} de funcionar enquanto
              estiver desligado. Nenhum dado é apagado, e tudo volta ao religar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendente) void salvar(pendente.item, false);
                setPendente(null);
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
