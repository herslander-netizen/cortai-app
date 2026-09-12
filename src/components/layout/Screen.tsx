import type { ReactNode } from "react";
import { Signature } from "./Signature";

export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] pb-24">
      <header className="px-5 pb-6 pt-10">
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-mute">{subtitle}</p> : null}
      </header>
      <main className="px-5">{children}</main>
      <Signature />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink2 px-5 py-10 text-center">
      <p className="text-sm text-mute">{text}</p>
    </div>
  );
}
