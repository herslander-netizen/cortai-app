import { Link } from "@tanstack/react-router";
import { ChevronRight, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Switch } from "@/components/ui/switch";
import type {
  EstadoDaFuncionalidade,
  Funcionalidade,
  PendenciaDeFuncionalidade,
} from "@/lib/funcionalidades";

const SELO: Record<EstadoDaFuncionalidade, { texto: string; classe: string }> = {
  ativo: { texto: "Ativo", classe: "bg-sage/15 text-sage" },
  desativado: { texto: "Desativado", classe: "bg-ink3 text-mute" },
  fora_do_plano: { texto: "Disponível", classe: "bg-[var(--figaro-primary-container)] text-[var(--figaro-primary)]" },
  sempre: { texto: "Na própria tela", classe: "bg-ink3 text-mute" },
};

type Props = {
  item: Funcionalidade;
  estado: EstadoDaFuncionalidade;
  planoMinimo?: string | undefined;
  dependencia?: PendenciaDeFuncionalidade | null;
  editavel: boolean;
  salvando: boolean;
  onAlternar: (ativo: boolean) => void;
};

export function LinhaDeFuncionalidade({
  item,
  estado,
  planoMinimo,
  dependencia,
  editavel,
  salvando,
  onAlternar,
}: Props) {
  const selo = SELO[estado];
  const comInterruptor = estado === "ativo" || estado === "desativado";
  return (
    <li id={`funcionalidade-${item.chave}`} className="flex min-h-16 scroll-mt-20 items-center gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[16px] font-medium text-paper">{item.rotulo}</p>
          {dependencia ? (
            <Badge variant="outline" className="min-h-6 gap-1.5 text-paper">
              <CircleAlert aria-hidden />
              {dependencia.motivo === "fora_do_plano"
                ? `Requer plano com ${dependencia.rotulo}`
                : `Requer ${dependencia.rotulo}`}
            </Badge>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${selo.classe}`}>
              {selo.texto}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-mute">
          {estado === "fora_do_plano"
            ? `Disponível no plano ${planoMinimo ?? "superior"}`
            : item.detalhe}
        </p>
        {dependencia && (
          <p className="mt-1 text-[12px] leading-5 text-mute">
            {dependencia.motivo === "fora_do_plano" ? (
              <Link to="/barbeiro/plano" className="font-medium text-[var(--figaro-primary,var(--primary))]">
                Ver plano necessário
              </Link>
            ) : (
              <>
                <a
                  href={`#funcionalidade-${dependencia.chave}`}
                  className="font-medium text-[var(--figaro-primary,var(--primary))]"
                >
                  Ativar {dependencia.rotulo}
                </a>{" "}
                para usar esta opção.
              </>
            )}
          </p>
        )}
        {item.configurar && estado !== "fora_do_plano" && !dependencia ? (
          <Link
            to={item.configurar}
            className="mt-1 inline-flex min-h-8 items-center gap-0.5 text-[13px] font-medium text-[var(--figaro-primary,var(--primary))]"
          >
            Configurar <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {comInterruptor ? (
        <div className="grid min-h-12 min-w-12 place-items-center">
          <Switch
            checked={estado === "ativo"}
            disabled={!editavel || salvando}
            onCheckedChange={onAlternar}
            aria-label={`${item.rotulo}: ${estado === "ativo" ? "ativo" : "desativado"}`}
          />
        </div>
      ) : null}
    </li>
  );
}
