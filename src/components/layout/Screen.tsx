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
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col pb-28">
      <header className="px-5 pb-5 pt-8">
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-mute">{subtitle}</p> : null}
      </header>
      <main className="flex-1 px-5">{children}</main>
      <Signature />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="border-y border-line py-8 text-center">
      <p className="text-sm text-mute">{text}</p>
    </div>
  );
}
