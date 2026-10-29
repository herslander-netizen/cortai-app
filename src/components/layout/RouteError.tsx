import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { classificarErro, recuperarDeChunk, type TipoDeErro } from "@/lib/pwa/recuperar-chunk";
import { registrar } from "@/lib/diagnostico/telemetria";
import { useEffect } from "react";

export function mensagemDeAcessoNegado(error: unknown) {
  return classificarErro(error) === "permissao";
}

const TEXTOS: Record<TipoDeErro, { titulo: string; texto: string; acao: string | null }> = {
  chunk: {
    titulo: "O Flow foi atualizado",
    texto: "Vamos carregar a versão mais nova. Seus dados continuam salvos.",
    acao: "Carregar versão nova",
  },
  autenticacao: {
    titulo: "Sua sessão terminou",
    texto: "Entre de novo para continuar de onde parou.",
    acao: "Entrar novamente",
  },
  permissao: {
    titulo: "Você não tem acesso a esta área",
    texto: "Seu acesso continua protegido pelas permissões do seu negócio.",
    acao: null,
  },
  rede: {
    titulo: "Sem conexão",
    texto: "Confira a internet do aparelho e tente de novo.",
    acao: "Tentar novamente",
  },
  servidor: {
    titulo: "O serviço está instável",
    texto: "Isso costuma passar rápido. Tente de novo em instantes.",
    acao: "Tentar novamente",
  },
  desconhecido: {
    titulo: "Esta página não carregou",
    texto: "Algo não saiu como esperado. Você pode tentar novamente ou voltar.",
    acao: "Tentar novamente",
  },
};

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const tipo = classificarErro(error);
  const t = TEXTOS[tipo];

  useEffect(() => {
    registrar(
      "erro-rota",
      {
        tipo,
        msg: error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160),
      },
      true,
    );
    // Chunk antigo: tenta recarregar sozinho uma vez (a trava evita loop).
    if (tipo === "chunk") recuperarDeChunk();
  }, [error, tipo]);

  function agir() {
    if (tipo === "chunk") return void recuperarDeChunk(true);
    if (tipo === "autenticacao") return void window.location.assign("/login");
    void router.invalidate();
    reset();
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <Card density="none" className="w-full max-w-md rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">{t.titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.texto}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => window.history.back()}>
            <ArrowLeft aria-hidden /> Voltar
          </Button>
          {t.acao ? (
            <Button onClick={agir}>
              <RotateCcw aria-hidden /> {t.acao}
            </Button>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
