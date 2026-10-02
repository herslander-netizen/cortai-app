import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RegiaoProps = {
  children: ReactNode;
  className?: string;
  onTentarDeNovo?: () => void;
};

type TentativaProps = Pick<RegiaoProps, "onTentarDeNovo">;

/** Uma região de espera anuncia o estado uma vez; os blocos internos são decorativos. */
export function RegiaoDeEsqueleto({ children, className, onTentarDeNovo }: RegiaoProps) {
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDemorou(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  if (demorou) {
    return (
      <div role="alert" className={cn("surface p-5", className)}>
        <p className="text-sm font-semibold text-paper">Não conseguimos carregar agora.</p>
        <p className="mt-1 text-xs text-mute">Confira sua conexão e tente novamente.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={onTentarDeNovo ?? (() => window.location.reload())}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("esqueleto-regiao", className)}
    >
      <span className="sr-only">Carregando</span>
      {children}
    </div>
  );
}

export function Barra({
  w = "60%",
  h = 12,
  className,
}: {
  w?: string;
  h?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("esqueleto-barra block rounded-sm bg-ink3", className)}
      style={{ width: w, height: `${h}px` }}
      aria-hidden="true"
    />
  );
}

export function BlocoEsqueleto({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("esqueleto-barra block rounded-md bg-ink3", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

function Linhas({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="min-w-0 space-y-2">
      <Barra w="55%" h={13} />
      {linhas > 1 ? <Barra w="78%" h={10} /> : null}
      {linhas > 2 ? <Barra w="42%" h={10} /> : null}
    </div>
  );
}

export function EsqueletoLista({
  linhas = 5,
  onTentarDeNovo,
}: { linhas?: number } & TentativaProps) {
  return (
    <RegiaoDeEsqueleto className="mt-2" onTentarDeNovo={onTentarDeNovo}>
      <div className="divide-y divide-line">
        {Array.from({ length: linhas }).map((_, i) => (
          <div
            key={i}
            className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4"
          >
            <Linhas />
            <Barra w="52px" h={12} />
          </div>
        ))}
      </div>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoMetricas({
  colunas = 3,
  onTentarDeNovo,
}: { colunas?: number } & TentativaProps) {
  return (
    <RegiaoDeEsqueleto
      className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      onTentarDeNovo={onTentarDeNovo}
    >
      {Array.from({ length: colunas }).map((_, i) => (
        <div key={i} className="min-h-24 rounded-md border border-line bg-ink2 px-3 py-4">
          <Barra w="60%" h={10} />
          <Barra w="45%" h={24} className="mt-3" />
        </div>
      ))}
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoTimeline({
  blocos = 3,
  onTentarDeNovo,
}: { blocos?: number } & TentativaProps) {
  return (
    <RegiaoDeEsqueleto
      className="relative mt-4 h-[420px]"
      onTentarDeNovo={onTentarDeNovo}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 flex items-center gap-3"
          style={{ top: i * 56 }}
        >
          <Barra w="36px" h={10} />
          <div className="h-px flex-1 bg-line" aria-hidden="true" />
        </div>
      ))}
      {Array.from({ length: blocos }).map((_, i) => (
        <div
          key={`b${i}`}
          className="absolute space-y-2 rounded-md border border-line bg-ink2 p-3"
          style={{ top: 20 + i * 130, left: 56, right: 4, height: 72 }}
        >
          <Barra w="50%" h={13} />
          <Barra w="35%" h={10} />
        </div>
      ))}
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoAgenda({
  linhas = 4,
  onTentarDeNovo,
}: { linhas?: number } & TentativaProps) {
  return (
    <RegiaoDeEsqueleto className="mt-4 space-y-2" onTentarDeNovo={onTentarDeNovo}>
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          className="grid min-h-[72px] grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-md border border-line bg-ink2 p-3"
        >
          <Barra w="42px" h={14} />
          <Linhas linhas={2} />
        </div>
      ))}
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoFormulario({
  campos = 4,
  onTentarDeNovo,
}: { campos?: number } & TentativaProps) {
  return (
    <RegiaoDeEsqueleto className="space-y-5" onTentarDeNovo={onTentarDeNovo}>
      {Array.from({ length: campos }).map((_, i) => (
        <div key={i}>
          <Barra w={i % 2 ? "36%" : "28%"} h={11} />
          <BlocoEsqueleto className="mt-2 h-12 w-full" />
        </div>
      ))}
      <BlocoEsqueleto className="h-12 w-full" />
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoFicha({ onTentarDeNovo }: TentativaProps = {}) {
  return (
    <RegiaoDeEsqueleto className="space-y-6" onTentarDeNovo={onTentarDeNovo}>
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <BlocoEsqueleto className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Linhas linhas={2} />
        </div>
      </div>
      <BlocoEsqueleto className="h-32 w-full" />
      <div className="divide-y divide-line">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="py-4">
            <Linhas linhas={2} />
          </div>
        ))}
      </div>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoComanda({ onTentarDeNovo }: TentativaProps = {}) {
  return (
    <RegiaoDeEsqueleto className="space-y-4 py-2" onTentarDeNovo={onTentarDeNovo}>
      <Barra w="48%" h={24} />
      <div className="divide-y divide-line">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4"
          >
            <Linhas />
            <Barra w="52px" h={12} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BlocoEsqueleto className="h-14" />
        <BlocoEsqueleto className="h-14" />
      </div>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoPainel({ onTentarDeNovo }: TentativaProps = {}) {
  return (
    <RegiaoDeEsqueleto onTentarDeNovo={onTentarDeNovo}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <BlocoEsqueleto key={i} className="h-24" />
        ))}
      </div>
      <BlocoEsqueleto className="mt-8 h-52 w-full" />
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoPaginaPublica({ onTentarDeNovo }: TentativaProps = {}) {
  return (
    <RegiaoDeEsqueleto className="min-h-screen bg-ink" onTentarDeNovo={onTentarDeNovo}>
      <BlocoEsqueleto className="h-[62vh] min-h-[420px] w-full rounded-none" />
      <div className="mx-auto max-w-5xl space-y-4 px-5 py-8">
        <Barra w="28%" h={12} />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BlocoEsqueleto key={i} className="h-20" />
          ))}
        </div>
      </div>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoCockpit() {
  return (
    <RegiaoDeEsqueleto className="flex min-h-dvh flex-col bg-ink p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line pb-3">
        <Barra w="72px" h={16} />
        <Barra w="74px" h={28} />
        <Barra w="44px" h={44} className="justify-self-end rounded-full" />
      </div>
      <div className="mt-3 grid flex-1 gap-3 lg:grid-cols-[1.45fr_.8fr]">
        <div className="rounded-md border border-line bg-ink2 p-5">
          <Barra w="28%" h={15} />
          <Barra w="68%" h={40} className="mt-7" />
          <Barra w="42%" h={16} className="mt-3" />
          <BlocoEsqueleto className="mt-8 h-3 w-full rounded-full" />
          <BlocoEsqueleto className="mt-8 h-36 w-full" />
        </div>
        <BlocoEsqueleto className="h-48 w-full self-end" />
      </div>
      <div className="mt-3 grid grid-cols-[64px_1fr] gap-2">
        <BlocoEsqueleto className="h-16" />
        <BlocoEsqueleto className="h-16" />
      </div>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoCascoEquipe() {
  return <EsqueletoCockpit />;
}

export function EsqueletoCascoCliente() {
  return (
    <RegiaoDeEsqueleto className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-24 pt-7">
      <div className="flex items-center gap-3">
        <BlocoEsqueleto className="size-11 rounded-full" />
        <div className="flex-1">
          <Linhas linhas={2} />
        </div>
      </div>
      <BlocoEsqueleto className="mt-6 min-h-[340px] w-full flex-1" />
      <div className="fixed inset-x-0 bottom-0 grid h-[72px] grid-cols-4 gap-3 border-t border-line bg-ink2 px-5 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <BlocoEsqueleto key={i} className="h-10" />
        ))}
      </div>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoCascoAdmin() {
  return (
    <RegiaoDeEsqueleto className="min-h-dvh bg-ink md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-line p-6 md:block">
        <Barra w="132px" h={42} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Barra key={i} w="80%" h={16} className="mt-8" />
        ))}
      </aside>
      <main className="px-5 py-8 md:px-8">
        <Barra w="190px" h={28} />
        <Barra w="320px" h={12} className="mt-3 max-w-full" />
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BlocoEsqueleto key={i} className="h-24" />
          ))}
        </div>
        <BlocoEsqueleto className="mt-8 h-52 w-full" />
      </main>
    </RegiaoDeEsqueleto>
  );
}

export function EsqueletoGenerico() {
  return (
    <RegiaoDeEsqueleto className="mx-auto min-h-dvh w-full max-w-3xl bg-ink px-5 py-8">
      <Barra w="42%" h={28} />
      <Barra w="68%" h={12} className="mt-3" />
      <div className="mt-8 divide-y divide-line">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-4">
            <Linhas />
          </div>
        ))}
      </div>
    </RegiaoDeEsqueleto>
  );
}
