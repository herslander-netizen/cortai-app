import { createFileRoute } from "@tanstack/react-router";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CreditCard, Eye, Info, LogOut, Mail, Share2 } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import {
  AvisoDeConfiguracao,
  CartaoDePerfil,
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { statusDaConta } from "@/lib/seguranca-conta.functions";
import { APP_VERSION } from "@/lib/versao";
import { rotuloDoPapel } from "@/lib/navigation";
import { supabase } from "@/integrations/supabase/client";
import { AlterarSenha } from "@/components/acesso/AlterarSenha";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { InstalarCortai } from "@/components/pwa/InstalarCortai";
import { PreferenciasDePrivacidade } from "@/components/privacidade/PreferenciasDePrivacidade";
import { SegurancaDaConta } from "@/components/seguranca/SegurancaDaConta";
import { getSessao } from "@/lib/sessao.functions";
import { sair } from "@/lib/guarda";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { alterarSegmento, trocarAtalhosDaFicha } from "@/lib/onboarding.functions";
import { LISTA_DE_SEGMENTOS, termos } from "@/lib/segmentos";
import { aplicarIdentidade, aplicarModo } from "@/lib/aparencia";
import { aviso } from "@/lib/avisos";

export const Route = createFileRoute("/barbeiro/conta")({
  head: () => ({
    meta: [
      { title: "Opções da conta — Flow" },
      {
        name: "description",
        content: "Perfil, formas de entrar, assinatura e saída segura do Flow.",
      },
      { property: "og:title", content: "Opções da conta — Flow" },
      { property: "og:description", content: "Sua conta e seu negócio no Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContaPage,
});

function ContaPage() {
  const [confirmar, dialogo] = useConfirmar();
  const { data } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });
  const [saindo, setSaindo] = useState(false);
  const consultarConta = useServerFn(statusDaConta);
  const { data: conta } = useQuery({
    queryKey: ["seguranca-conta"],
    queryFn: () => consultarConta(),
    staleTime: 30_000,
  });
  const [reenviando, setReenviando] = useState(false);
  async function reenviarConfirmacao() {
    if (!data?.email) {
      aviso.erro("Não encontrei o e-mail da conta. Entre de novo e tente outra vez.");
      return;
    }
    setReenviando(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: data.email });
    setReenviando(false);
    if (error) aviso.erro("Não foi possível enviar agora. Tente de novo em instantes.");
    else aviso.ok(`Enviamos o link de confirmação para ${data.email}.`);
  }
  const queryClient = useQueryClient();
  const salvarSegmento = useServerFn(alterarSegmento);
  const trocarAtalhos = useServerFn(trocarAtalhosDaFicha);
  const [segmento, setSegmento] = useState(data?.segmento ?? "outro");
  const [salvandoSegmento, setSalvandoSegmento] = useState(false);

  useEffect(() => {
    if (data?.segmento) setSegmento(data.segmento);
  }, [data?.segmento]);

  const papel =
    data?.papelNaEquipe === "dono" ? "Proprietário" : rotuloDoPapel(data?.papelNaEquipe);
  const podeEditarNegocio = Boolean(data?.permissoes.includes("alterar_dados_barbearia"));

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Opções da conta"
      subtitle="Gerencie seu perfil, as formas de entrar e a assinatura."
    >
      {dialogo}
      <div className="pb-6">
        {/* Como no Figaro (`AccountSettingsScreen`): perfil, aviso de e-mail, formas de entrar, assinatura e saída. */}
        <div className="mt-6">
          <CartaoDePerfil
            nome={data?.nome ?? "Minha conta"}
            email={data?.email ?? null}
            papel={papel}
          />
        </div>
        {conta && !conta.emailVerificado ? (
          <div className="mt-3">
            <AvisoDeConfiguracao
              titulo="Verifique seu e-mail"
              texto="Confirme sua conta para aproveitar todos os recursos."
              acao={
                <Button
                  type="button"
                  size="sm"
                  loading={reenviando}
                  onClick={() => void reenviarConfirmacao()}
                >
                  Verificar agora
                </Button>
              }
            />
          </div>
        ) : null}

        <SecaoDeConfiguracao titulo="Formas de entrar">
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              icone={Mail}
              titulo="E-mail"
              suporte={data?.email ?? "Conta conectada"}
              fim={conta ? (conta.emailVerificado ? "Verificado" : "Pendente") : ""}
            />
            <li>
              <AlterarSenha emGrupo />
            </li>
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>

        <SecaoDeConfiguracao titulo="Assinatura">
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              para="/barbeiro/plano"
              icone={CreditCard}
              titulo="Gerenciar assinatura"
              suporte="Plano, cobranças e histórico"
            />
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>

        <SecaoDeConfiguracao titulo="Seu negócio">
          <GrupoDeLinhas>
            {podeEditarNegocio ? (
              <LinhaDeConfiguracao
                para="/barbeiro/negocio"
                icone={Building2}
                titulo="Informações básicas"
                suporte={data?.tenantNome ?? "Sem negócio vinculado"}
              />
            ) : null}
            <LinhaDeConfiguracao
              para="/barbeiro/sua-pagina"
              icone={Eye}
              titulo="Sua Página"
              suporte="Link, QR Code e situação da página"
            />
            {data?.tenantSlug ? (
              <LinhaDeConfiguracao
                href={`/b/${data.tenantSlug}`}
                icone={Share2}
                titulo="Ver página pública"
              />
            ) : null}
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>

        <SecaoDeConfiguracao titulo="Aparência e aplicativo">
          <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-2">
            <ThemeToggle
              identidadeDaBarbearia={data?.identidadeApp}
              tenantId={data?.tenantId ?? undefined}
              podeAlterarIdentidade={data?.papelNaEquipe === "dono"}
              emGrupo
            />
          </div>
          <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-2">
            <InstalarCortai emGrupo />
          </div>
        </SecaoDeConfiguracao>

        <SecaoDeConfiguracao>
          <GrupoDeLinhas>
            <LinhaDeConfiguracao
              icone={Info}
              titulo="Versão do aplicativo"
              fim={`Flow ${APP_VERSION}`}
            />
            <LinhaDeConfiguracao
              icone={LogOut}
              titulo={saindo ? "Saindo…" : "Sair da conta"}
              desabilitada={saindo}
              aoTocar={() => {
                setSaindo(true);
                void sair();
              }}
            />
          </GrupoDeLinhas>
        </SecaoDeConfiguracao>
      </div>

      {data?.permissoes.includes("alterar_dados_barbearia") ? (
        <section className="mb-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
          <label className="block text-xs font-medium text-mute">
            Tipo de negócio
            <select
              className="field-control mt-2 w-full"
              value={segmento}
              onChange={(event) => setSegmento(event.target.value as typeof segmento)}
            >
              {LISTA_DE_SEGMENTOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-mute">
            Ajusta sugestões e palavras. Seus serviços, clientes e horários não mudam.
          </p>
          <Button
            variant="outline"
            type="button"
            className="mt-3 min-h-12 w-full"
            disabled={salvandoSegmento || segmento === data.segmento}
            onClick={async () => {
              setSalvandoSegmento(true);
              try {
                const aplicarCores = await confirmar({
                  titulo: "Usar também as cores recomendadas?",
                  descricao: `Aplicar as cores recomendadas para ${termos(segmento).nome}.`,
                  confirmar: "Usar cores",
                  cancelar: "Manter as atuais",
                });
                const resultado = await salvarSegmento({ data: { segmento, aplicarCores } });
                if (aplicarCores) {
                  aplicarIdentidade(resultado.identidade);
                  aplicarModo(resultado.modo, true);
                }
                if (
                  resultado.ofereceTrocarAtalhos &&
                  (await confirmar({
                    titulo: "Trocar os atalhos da ficha do cliente?",
                    descricao: `Usar os atalhos sugeridos para ${termos(segmento).nome}.`,
                    confirmar: "Trocar atalhos",
                    cancelar: "Manter",
                  }))
                )
                  await trocarAtalhos();
                await queryClient.invalidateQueries({ queryKey: ["sessao"] });
                await queryClient.invalidateQueries({ queryKey: ["implantacao"] });
                aviso.ok("Tipo de negócio atualizado.");
              } catch (erro) {
                aviso.erro(erro instanceof Error ? erro.message : "Não foi possível atualizar.");
              } finally {
                setSalvandoSegmento(false);
              }
            }}
          >
            Salvar tipo de negócio
          </Button>
        </section>
      ) : null}

      <div className="cartao-config mb-3">
        <SegurancaDaConta />
      </div>
      <div className="cartao-config mb-3">
        <PreferenciasDicas />
      </div>
      <div className="rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-2">
        <PreferenciasDePrivacidade />
      </div>
    </Screen>
  );
}
