import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import type { EstadoDaFuncionalidade, Funcionalidade } from "@/lib/funcionalidades";

const SELO: Record<EstadoDaFuncionalidade, { texto: string; classe: string }> = {
  ativo: { texto: "Ativo", classe: "bg-sage/15 text-sage" },
  desativado: { texto: "Desativado", classe: "bg-ink3 text-mute" },
  fora_do_plano: { texto: "Disponível", classe: "bg-gold/15 text-gold" },
  sempre: { texto: "Na própria tela", classe: "bg-ink3 text-mute" },
};

type Props = {
  item: Funcionalidade;
  estado: EstadoDaFuncionalidade;
  planoMinimo?: string | undefined;
  editavel: boolean;
  salvando: boolean;
  onAlternar: (ativo: boolean) => void;
};

export function LinhaDeFuncionalidade({
  item,
  estado,
  planoMinimo,
  editavel,
  salvando,
  onAlternar,
}: Props) {
  const selo = SELO[estado];
  const comInterruptor = estado === "ativo" || estado === "desativado";
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[16px] font-medium text-paper">{item.rotulo}</p>
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${selo.classe}`}>
            {selo.texto}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-mute">
          {estado === "fora_do_plano"
            ? `Disponível no plano ${planoMinimo ?? "superior"}`
            : item.detalhe}
        </p>
        {item.configurar && estado !== "fora_do_plano" ? (
          <Link
            to={item.configurar}
            className="mt-1 inline-flex min-h-8 items-center gap-0.5 text-[13px] font-medium text-gold"
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
