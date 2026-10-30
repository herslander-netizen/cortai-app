import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { limparCacheAgenda } from "@/lib/agenda-cache";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";
import mobileInteractionsCss from "../mobile-interactions.css?url";
import { manifestDaRota } from "@/lib/manifest";
import { iniciarServiceWorker } from "@/lib/pwa/registro";
import { appDefasado, vigiarDefasagem } from "@/lib/pwa/defasagem";
import { instalarRecuperacaoDeChunk } from "@/lib/pwa/recuperar-chunk";
import { RouteError } from "@/components/layout/RouteError";
import { GlobalDesign } from "@/components/layout/GlobalDesign";
import { GuiaProvider } from "@/components/guia/GuiaProvider";
import { supabase } from "@/integrations/supabase/client";
import { BannerDeCookies } from "@/components/privacidade/BannerDeCookies";
import { AvisoDeVersao } from "@/components/pwa/AvisoDeVersao";
import { AvisosDoApp } from "@/components/layout/AvisosDoApp";
import { TransicaoDePagina } from "@/components/layout/TransicaoDePagina";
import { NovidadesDaVersao } from "@/components/sistema/NovidadesDaVersao";
import { efeitoDoEventoDeAutenticacao } from "@/lib/auth-eventos";
import { fotoDoRoteador, instalarTelemetria, registrar } from "@/lib/diagnostico/telemetria";
import { vigiarTela } from "@/lib/diagnostico/vigia-de-tela";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este endereço não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { title: "Flow — Gestão e tecnologia para negócios de Beleza" },
      {
        name: "description",
        content: "Agenda, WhatsApp e gestão para barbearias, salões e negócios de beleza.",
      },
      { property: "og:site_name", content: "Flow" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Flow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: mobileInteractionsCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon-flow-v2-256.png", type: "image/png", sizes: "any" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon-flow-v2.png" },
      { rel: "manifest", href: manifestDaRota(matches.map((m) => m.routeId)) },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RouteError,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement,m=localStorage.getItem("cortai-modo-v2")||"escuro",l=m==="claro"||(m==="sistema"&&matchMedia("(prefers-color-scheme: light)").matches);d.dataset.identidade="moderno";if(/^\\/barbeiro(?:\\/agenda)?\\/?$/.test(location.pathname))d.dataset.telaAgenda="";else delete d.dataset.telaAgenda;d.classList.toggle("light",l);d.classList.toggle("dark",!l);var t=document.createElement("meta");t.name="theme-color";t.content=l?"#E9F1EB":"#1A1F1C";document.head.appendChild(t)}catch{}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    instalarRecuperacaoDeChunk();
    void iniciarServiceWorker();
    vigiarDefasagem();
    instalarTelemetria();
  }, []);

  // Tela vazia não fica vazia: recarrega as rotas e, se preciso, a página (com aviso). Ver vigia-de-tela.ts.
  useEffect(() => {
    vigiarTela(router);
    const sair = (["onBeforeNavigate", "onResolved"] as const).map((ev) =>
      router.subscribe(ev, (e) =>
        registrar("rota", {
          ev,
          de: e.fromLocation?.pathname ?? null,
          para: e.toLocation.pathname,
          mudou: e.pathChanged ? 1 : 0,
          ...fotoDoRoteador(router),
        }),
      ),
    );
    return () => sair.forEach((f) => f());
  }, [router]);

  // Publicação nova com o app aberto: os arquivos das telas mudaram de nome. Em vez de abrir uma tela cujo
  // arquivo não existe mais (branco e recarga), o toque vira uma navegação normal do navegador, ao destino.
  useEffect(
    () =>
      router.subscribe("onBeforeNavigate", ({ toLocation, pathChanged }) => {
        if (pathChanged && appDefasado()) {
          registrar("defasagem", { para: toLocation.pathname }, true);
          window.location.assign(toLocation.href);
        }
      }),
    [router],
  );

  useEffect(() => {
    let contaConhecida: string | null | undefined = undefined;
    const { data } = supabase.auth.onAuthStateChange((event, sessaoAuth) => {
      const conta = sessaoAuth?.user?.id ?? null;
      const efeito = efeitoDoEventoDeAutenticacao(event, contaConhecida, conta);
      registrar("auth", {
        ev: event,
        efeito,
        antes: contaConhecida === undefined ? "?" : contaConhecida ? 1 : 0,
      });
      contaConhecida = conta;
      if (efeito === "nada") return;
      if (event === "SIGNED_OUT") limparCacheAgenda();
      // Reemissão para a mesma conta (voltar ao app) não reinicia rotas nem consultas.
      if (efeito === "conta") void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <GlobalDesign>
        <GuiaProvider>
          <TransicaoDePagina>
            <Outlet />
          </TransicaoDePagina>
          <AvisosDoApp />
          <BannerDeCookies />
          <AvisoDeVersao />
          <NovidadesDaVersao />
        </GuiaProvider>
      </GlobalDesign>
    </QueryClientProvider>
  );
}
