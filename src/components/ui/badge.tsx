import * as React from "react";
import { CalendarClock, Check, Circle, Clock3, HandCoins, Scissors, UserRoundPlus, UserX, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { termosDoSegmento, type Segmento } from "@/lib/segmentos";

const badgeVariants = cva(
  "inline-flex min-h-6 shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold whitespace-nowrap [&_svg]:size-3.5",
  { variants: { variant: {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    success: "border-sage bg-sage-soft text-sage",
    strong: "border-foreground bg-foreground text-background",
    destructive: "border-destructive bg-brick-soft text-destructive",
    outline: "border-line2 bg-transparent text-muted-foreground",
  } }, defaultVariants: { variant: "default" } },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) { return <span className={cn(badgeVariants({ variant }), className)} {...props} />; }

const STATUS = {
  agendado: { label: "Agendado", variant: "outline", Icon: Clock3 },
  confirmado: { label: "Confirmado", variant: "outline", Icon: Check },
  chegou: { label: "Chegou", variant: "success", Icon: UserRoundPlus },
  na_cadeira: { label: "Na cadeira", variant: "default", Icon: Scissors },
  finalizado: { label: "Finalizado", variant: "strong", Icon: Check },
  remarcado: { label: "Remarcado", variant: "outline", Icon: CalendarClock },
  cancelado: { label: "Cancelado", variant: "destructive", Icon: X },
  nao_compareceu: { label: "Não compareceu", variant: "destructive", Icon: UserX },
  encaixe: { label: "Encaixe", variant: "outline", Icon: Scissors },
  aguardando_pagamento: { label: "Aguardando pagamento", variant: "outline", Icon: HandCoins },
  pago: { label: "Pago", variant: "success", Icon: Check },
  pendente: { label: "Pendente", variant: "outline", Icon: Clock3 },
  livre: { label: "Livre", variant: "outline", Icon: Circle },
} as const;

export type StatusKey = keyof typeof STATUS;
export function StatusBadge({ status, label, className, segmento = "barbearia" }: { status: StatusKey | string; label?: string; className?: string; segmento?: Segmento }) {
  const fallback = STATUS.agendado;
  const item = STATUS[status as StatusKey] ?? fallback;
  const Icon = item.Icon;
  const rotulo = status === "na_cadeira" ? termosDoSegmento(segmento).statusAtendimento : item.label;
  return <Badge variant={item.variant} className={cn("status-badge", `status-badge-${status}`, className)}><Icon aria-hidden />{label ?? rotulo}</Badge>;
}

export { Badge, badgeVariants };