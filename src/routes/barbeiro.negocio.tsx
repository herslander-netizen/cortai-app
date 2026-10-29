import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { SeletorDeFoto } from "@/components/fotos/SeletorDeFoto";
import { Screen } from "@/components/layout/Screen";
import { BotaoFab } from "@/components/ui/BotaoFab";
import { CampoDeFormulario } from "@/components/ui/formulario/CampoDeFormulario";
import { SecaoDeConfiguracao } from "@/components/ui/formulario/LinhasDeConfiguracao";
import { aviso } from "@/lib/avisos";
import { getConfiguracaoInicial, salvarDadosDaBarbearia } from "@/lib/onboarding.functions";
import { getSessao } from "@/lib/sessao.functions";
import { termos } from "@/lib/segmentos";

export const Route = createFileRoute("/barbeiro/negocio")({
  head: () => ({
    meta: [
      { title: "Informações básicas — Flow" },
      { name: "description", content: "Nome, logo e contato do negócio." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InformacoesBasicasPage,
});

/**
 * Informações básicas, como no Figaro (`BusinessInfoScreen`): descrição curta, seção da logo (foto quadrada
 * escolhida na galeria), seção do nome e a ação "Salvar alterações" flutuante. O WhatsApp fica aqui porque,
 * no Flow, é o contato do negócio com o cliente.
 */
function InformacoesBasicasPage() {
  const qc = useQueryClient();
  const salvar = useServerFn(salvarDadosDaBarbearia);
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const { data: inicial } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });
  const podeEditar = Boolean(sessao?.permissoes.includes("alterar_dados_barbearia"));
  const t = termos(sessao?.segmento ?? "outro");

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  // `undefined` = não mexeu na logo; `null` = removeu; texto = caminho da foto escolhida na galeria.
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [iniciado, setIniciado] = useState(false);
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo">("parado");
  const [erroNome, setErroNome] = useState<string | null>(null);

  useEffect(() => {
    if (!inicial || iniciado) return;
    setNome(inicial.tenant.nome);
    setWhatsapp(inicial.tenant.whatsapp ?? "");
    setIniciado(true);
  }, [inicial, iniciado]);

  const logoMostrada = logo === undefined ? (sessao?.tenantLogoUrl ?? null) : logoPreview;
  const temLogo = logo === undefined ? Boolean(inicial?.tenant.logoUrl) : logo !== null;

  async function aoSalvar() {
    if (nome.trim().length < 2) {
      setErroNome(`Informe o nome ${t.de}.`);
      return;
    }
    setErroNome(null);
    setEstado("salvando");
    try {
      await salvar({
        data: { nome: nome.trim(), whatsapp, ...(logo !== undefined ? { logoUrl: logo } : {}) },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sessao"] }),
        qc.invalidateQueries({ queryKey: ["configuracao-inicial"] }),
      ]);
      setLogo(undefined);
      setLogoPreview(null);
      setEstado("salvo");
      aviso.ok("Informações salvas.");
      window.setTimeout(() => setEstado("parado"), 1800);
    } catch (e) {
      setEstado("parado");
      aviso.erro(e instanceof Error ? e.message : "Não foi possível salvar agora.");
    }
  }

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="Informações básicas"
      subtitle={`Atualize o nome e a logo ${t.de} para os clientes sempre reconhecerem você.`}
    >
      <div className="pb-28">
        <SecaoDeConfiguracao
          titulo="Logo"
          rodape="Imagens quadradas ficam melhores. Use a logo do seu negócio."
        >
          <div className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
            <SeletorDeFoto
              rotulo="Logo"
              prefixo="foto"
              temFoto={temLogo}
              previewUrl={logoMostrada}
              onEscolher={(foto) => {
                setLogo(foto.path);
                setLogoPreview(foto.url);
              }}
              onRemover={() => {
                setLogo(null);
                setLogoPreview(null);
              }}
            />
          </div>
        </SecaoDeConfiguracao>

        <SecaoDeConfiguracao titulo="Informações básicas">
          <div className="space-y-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
            <CampoDeFormulario
              rotulo={`Nome ${t.de}`}
              value={nome}
              maxLength={80}
              disabled={!podeEditar}
              erro={erroNome}
              onChange={(e) => setNome(e.target.value)}
            />
            <CampoDeFormulario
              rotulo="WhatsApp"
              value={whatsapp}
              inputMode="tel"
              disabled={!podeEditar}
              dica="O número que o cliente usa para falar com você."
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </SecaoDeConfiguracao>

        {!podeEditar ? (
          <p className="mt-4 px-4 text-xs text-mute">
            Só quem cuida do negócio pode alterar estas informações.
          </p>
        ) : null}
      </div>

      {podeEditar ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto">
            <BotaoFab
              rotulo="Salvar alterações"
              icone={<Check />}
              carregando={estado === "salvando"}
              sucesso={estado === "salvo"}
              desabilitado={!iniciado}
              onClick={() => void aoSalvar()}
            />
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
