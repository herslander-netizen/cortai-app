import type { ReactNode } from "react";
import { CabecalhoDeTela } from "@/components/layout/CabecalhoDeTela";
import { Aviso } from "@/components/ui/aviso";

export function AdminScreen({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-12 md:pt-6">
      <header className="mb-5 grid min-w-0 gap-4">
        {actions ? (
          <div className="flex min-h-12 min-w-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
        <CabecalhoDeTela title={title} {...(subtitle ? { subtitle } : {})} />
      </header>
      <main>{children}</main>
    </div>
  );
}

export function AdminNotice({ error }: { error: unknown }) {
  const message =
    error instanceof Error && !error.message.toLowerCase().includes("unauthorized")
      ? error.message
      : "Entre com a conta do dono da plataforma para ver estes dados.";
  return (
    <Aviso tom="acao" titulo="Acesso restrito">
      {message}
    </Aviso>
  );
}
