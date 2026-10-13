import type { ReactNode } from "react";
import { CabecalhoDeTela } from "@/components/layout/CabecalhoDeTela";

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
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-28 pt-8 md:px-8 md:pb-12 md:pt-10">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <CabecalhoDeTela title={title} subtitle={subtitle} eyebrow="Plataforma Cortaí" />
        {actions ? <div className="shrink-0">{actions}</div> : null}
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
    <div className="border-l-2 border-brick py-2 pl-4">
      <p className="text-sm font-semibold text-paper">Acesso restrito</p>
      <p className="mt-1 text-sm text-mute">{message}</p>
    </div>
  );
}
