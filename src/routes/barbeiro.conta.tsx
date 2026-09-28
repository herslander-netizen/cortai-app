import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ChevronRight, LogOut, Palette, Share2, UserRound } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { AlterarSenha } from "@/components/acesso/AlterarSenha";
import { PreferenciasDicas } from "@/components/guia/PreferenciasDicas";
import { InstalarCortai } from "@/components/pwa/InstalarCortai";
import { PreferenciasDePrivacidade } from "@/components/privacidade/PreferenciasDePrivacidade";
import { getSessao } from "@/lib/sessao.functions";
import { sair } from "@/lib/guarda";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { alterarSegmento } from "@/lib/onboarding.functions";
import { LISTA_DE_SEGMENTOS, termos } from "@/lib/segmentos";
import { aplicarIdentidade, aplicarModo } from "@/lib/aparencia";
import { aviso } from "@/lib/avisos";

export const Route = createFileRoute("/barbeiro/conta")({
  head: () => ({
    meta: [
      { title: "Conta e barbearia — Cortaí Gestão" },
      { name: "description", content: "Dados da sua conta, da barbearia e saída segura do Cortaí." },
      { property: "og:title", content: "Conta e barbearia — Cortaí Gestão" },
      { property: "og:description", content: "Sua conta e sua barbearia no Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ContaPage,
});

function ContaPage() {
  const { data } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });
  const [saindo, setSaindo] = useState(false);
  const queryClient = useQueryClient();
  const salvarSegmento = useServerFn(alterarSegmento);
  const [segmento, setSegmento] = useState(data?.segmento ?? "barbearia");
  const [salvandoSegmento, setSalvandoSegmento] = useState(false);

  useEffect(() => {
    if (data?.segmento) setSegmento(data.segmento);
  }, [data?.segmento]);

  return (
    <Screen voltarPara="/barbeiro/mais" title="Conta" subtitle="Seus dados e os da sua barbearia.">
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink2 text-gold">
          <UserRound size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-paper">{data?.nome ?? "Minha conta"}</p>
          <p className="mt-1 truncate text-xs text-mute">{data?.email ?? "Conta conectada"}</p>
        </div>
      </div>

      <ul className="mt-3">
        {data?.permissoes.includes("alterar_dados_barbearia") ? <li className="border-b border-line">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5">
            <Building2 size={18} className="text-mute" />
            <span className="min-w-0">
              <span className="block text-sm text-paper">Barbearia</span>
              <span className="mt-0.5 block truncate text-xs text-mute">
                {data?.tenantNome ?? "Sem barbearia vinculada"}
              </span>
            </span>
          </div>
        </li> : null}
        {data?.tenantSlug ? (
          <li className="border-b border-line">
            <a
              href={`/b/${data.tenantSlug}`}
              target="_blank"
              rel="noreferrer"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
            >
              <Share2 size={18} className="text-mute" />
              <span className="text-sm text-paper">Ver página pública</span>
              <ChevronRight size={16} className="text-mute2" />
            </a>
          </li>
        ) : null}
        <li className="border-b border-line">
          <Link
            to="/barbeiro/marca"
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
          >
            <Palette size={18} className="text-mute" />
            <span className="text-sm text-paper">Página e marca</span>
            <ChevronRight size={16} className="text-mute2" />
          </Link>
        </li>
        <li>
          <AlterarSenha />
        </li>
        <li><ThemeToggle identidadeDaBarbearia={data?.identidadeApp} tenantId={data?.tenantId ?? undefined} podeAlterarIdentidade={data?.papelNaEquipe === "dono"} /></li>
        <li><InstalarCortai /></li>
        <li className="border-b border-line">
          <Button variant="ghost"
            type="button"
            disabled={saindo}
            onClick={() => {
              setSaindo(true);
              void sair();
            }}
            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left disabled:opacity-50"
          >
            <LogOut size={18} className="text-mute" />
            <span className="text-sm text-paper">{saindo ? "Saindo…" : "Sair da conta"}</span>
            <ChevronRight size={16} className="text-mute2" />
          </Button>
        </li>
      </ul>

      {data?.permissoes.includes("alterar_dados_barbearia") ? <section className="border-b border-line py-5">
        <label className="block text-xs font-medium text-mute">Tipo de negócio<select className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-3 text-sm text-paper" value={segmento} onChange={(event) => setSegmento(event.target.value as typeof segmento)}>{LISTA_DE_SEGMENTOS.map((item) => <option key={item.id} value={item.id}>{item.rotulo}</option>)}</select></label>
        <p className="mt-2 text-xs text-mute">Ajusta sugestões e palavras. Seus serviços, clientes e horários não mudam.</p>
        <Button variant="outline" type="button" className="mt-3 min-h-12 w-full" disabled={salvandoSegmento || segmento === data.segmento} onClick={async () => { setSalvandoSegmento(true); try { const aplicarCores = window.confirm(`Usar também as cores recomendadas para ${termos(segmento).nome}?`); const resultado = await salvarSegmento({ data: { segmento, aplicarCores } }); if (aplicarCores) { aplicarIdentidade(resultado.identidade); aplicarModo(resultado.modo, true); } await queryClient.invalidateQueries({ queryKey: ["sessao"] }); await queryClient.invalidateQueries({ queryKey: ["implantacao"] }); aviso.ok("Tipo de negócio atualizado."); } catch (erro) { aviso.erro(erro instanceof Error ? erro.message : "Não foi possível atualizar."); } finally { setSalvandoSegmento(false); } }}>Salvar tipo de negócio</Button>
      </section> : null}

      <PreferenciasDicas />
      <PreferenciasDePrivacidade />
    </Screen>
  );
}
