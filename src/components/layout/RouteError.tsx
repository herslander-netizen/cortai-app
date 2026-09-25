import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { useEffect } from "react";

export function mensagemDeAcessoNegado(error: unknown) {
  const mensagem = error instanceof Error ? error.message : String(error ?? "");
  return /sem permiss[aã]o|não tem permiss[aã]o|unauthorized|forbidden|status.?403/i.test(mensagem);
}

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const semAcesso = mensagemDeAcessoNegado(error);

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_route_error_component" });
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <div className="w-full max-w-md border-y border-border py-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {semAcesso ? "Você não tem acesso a esta área" : "Esta página não carregou"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {semAcesso
            ? "Seu acesso continua protegido pelas permissões da barbearia."
            : "Algo não saiu como esperado. Você pode tentar novamente ou voltar."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => window.history.back()}>
            <ArrowLeft aria-hidden /> Voltar
          </Button>
          {!semAcesso ? (
            <Button onClick={() => { router.invalidate(); reset(); }}>
              <RotateCcw aria-hidden /> Tentar novamente
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}