import type { ReactNode } from "react";
import { ChevronRight, CircleAlert, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * MODELO PADRÃO de gaveta do Flow (dono, 31/10): o desenho da ficha do atendimento na Agenda.
 * Toda gaveta nova nasce destas peças — nunca um layout próprio:
 * - `FolhaPadrao`: gaveta de baixo no fundo da tela, cantos de 28, alça e arrastar para fechar (sem "Cancelar":
 *   fecha pela alça ou tocando fora). O primeiro cartão traz o título, a descrição e o que resume o assunto.
 * - `SecaoDaFolha`: rótulo pequeno acima de um grupo ("Serviços", "Horário").
 * - `CartaoDaFolha`: o cartão (branco no claro, um degrau acima do fundo no escuro), cantos de 20.
 * - `LinhaDaFolha`: linha tocável dentro do cartão (rótulo à esquerda, valor e seta à direita).
 * - `NotaDaFolha`: aviso discreto com ícone; `tom="erro"` para o que impede salvar.
 * - `rodape`: uma ação principal em pílula, à direita (e no máximo uma secundária em texto).
 * Uma função, um controle: não repetir o mesmo ajuste em botões diferentes.
 * Referência: `docs/ordem-padrao-figaro.md` (Modelo de gaveta).
 */
export function FolhaPadrao({
  aberto,
  onAberto,
  titulo,
  descricao,
  resumo,
  children,
  rodape,
  className,
}: {
  aberto: boolean;
  onAberto: (aberto: boolean) => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  /** Conteúdo extra do primeiro cartão (linha de horário, selo de estado…). */
  resumo?: ReactNode;
  children?: ReactNode;
  rodape?: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        // Sem foco automático na alça: o contorno de foco aparecia como uma linha azul sobre o primeiro cartão.
        onOpenAutoFocus={(evento) => evento.preventDefault()}
        className={cn(
          "folha-padrao mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto overscroll-contain rounded-t-[28px] border-0 bg-ink px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-10",
          className,
        )}
      >
        <CartaoDaFolha>
          <SheetHeader className="space-y-1 p-4 text-left">
            <SheetTitle className="text-xl font-bold text-paper">{titulo}</SheetTitle>
            {descricao ? (
              <SheetDescription className="text-sm font-semibold text-mute">
                {descricao}
              </SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{titulo}</SheetDescription>
            )}
            {resumo}
          </SheetHeader>
        </CartaoDaFolha>
        {children}
        {rodape ? <div className="mt-6 flex items-center justify-end gap-3">{rodape}</div> : null}
      </SheetContent>
    </Sheet>
  );
}

export function SecaoDaFolha({ titulo }: { titulo: ReactNode }) {
  return <p className="mb-2 mt-5 px-1 text-sm font-semibold text-mute">{titulo}</p>;
}

export function CartaoDaFolha({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[20px] bg-[var(--agenda-cartao,var(--figaro-card-tile))] divide-y divide-line",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function LinhaDaFolha({
  rotulo,
  valor,
  icone,
  onClick,
  rotuloAcessivel,
}: {
  rotulo: ReactNode;
  valor?: ReactNode;
  icone?: ReactNode;
  onClick?: () => void;
  rotuloAcessivel?: string;
}) {
  const conteudo = (
    <>
      {icone ? <span className="shrink-0 text-mute [&_svg]:size-5">{icone}</span> : null}
      <span className="min-w-0 flex-1 truncate text-[15px] text-paper">{rotulo}</span>
      {valor !== undefined ? (
        <span className="shrink-0 text-[15px] font-semibold tabular-nums text-paper">{valor}</span>
      ) : null}
      {onClick ? <ChevronRight className="size-4 shrink-0 text-mute" aria-hidden /> : null}
    </>
  );
  const classe = "flex min-h-14 w-full items-center gap-3 px-4 text-left";
  return onClick ? (
    <button type="button" className={classe} onClick={onClick} aria-label={rotuloAcessivel}>
      {conteudo}
    </button>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export function NotaDaFolha({
  children,
  tom = "info",
}: {
  children: ReactNode;
  tom?: "info" | "erro";
}) {
  const Icone = tom === "erro" ? CircleAlert : Info;
  return (
    <p
      className={`mt-4 flex items-start gap-2 px-1 text-[13px] leading-5 ${tom === "erro" ? "text-brick" : "text-mute"}`}
      role={tom === "erro" ? "alert" : undefined}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Ação principal do rodapé, em pílula como na ficha. */
export function AcaoDaFolha(props: React.ComponentProps<typeof Button>) {
  return <Button size="lg" {...props} className={cn("h-14 rounded-full px-6", props.className)} />;
}
