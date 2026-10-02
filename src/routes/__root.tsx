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
import { RouteError } from "@/components/layout/RouteError";
import { GlobalDesign } from "@/components/layout/GlobalDesign";
import { GuiaProvider } from "@/components/guia/GuiaProvider";
import { supabase } from "@/integrations/supabase/client";
import { BannerDeCookies } from "@/components/privacidade/BannerDeCookies";
import { AvisoDeVersao } from "@/components/pwa/AvisoDeVersao";
import { AvisosDoApp } from "@/components/layout/AvisosDoApp";
import { TransicaoDePagina } from "@/components/layout/TransicaoDePagina";
import { NovidadesDaVersao } from "@/components/sistema/NovidadesDaVersao";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { title: "Cortaí — Gestão e tecnologia para negócios de Beleza" },
      {
        name: "description",
        content:
          "Agenda, clientes, equipe, vendas, caixa e presença digital para negócios de Beleza.",
      },
      { property: "og:site_name", content: "Cortaí" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Cortaí" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
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
            __html: `try{var d=document.documentElement,m=localStorage.getItem("cortai-modo-v2")||"escuro",l=m==="claro"||(m==="sistema"&&matchMedia("(prefers-color-scheme: light)").matches);d.dataset.identidade="moderno";d.classList.toggle("light",l);d.classList.toggle("dark",!l);var t=document.createElement("meta");t.name="theme-color";t.content=l?"#F7FAFF":"#021A46";document.head.appendChild(t)}catch{}`,
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
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") limparCacheAgenda();
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
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
