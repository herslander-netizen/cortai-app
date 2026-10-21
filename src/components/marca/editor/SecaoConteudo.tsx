import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  House,
  Images,
  Instagram,
  MapPin,
  MessageCircle,
  Package,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { componenteIds, type PaginaConfig } from "@/lib/pagina-config";
import type { SetPagina } from "./tipos";

type ComponenteId = (typeof componenteIds)[number];

const SECOES: Record<ComponenteId, { nome: string; descricao: string; icone: LucideIcon }> = {
  apresentacao: {
    nome: "Apresentação",
    descricao: "Frase de boas-vindas e apresentação do negócio.",
    icone: House,
  },
  servicos: {
    nome: "Serviços",
    descricao: "Serviços cadastrados, duração e preço.",
    icone: Clock3,
  },
  profissionais: {
    nome: "Equipe",
    descricao: "Profissionais e suas informações públicas.",
    icone: Users,
  },
  galeria: {
    nome: "Galeria",
    descricao: "Fotos para mostrar o espaço e o trabalho.",
    icone: Images,
  },
  avaliacoes: {
    nome: "Avaliações",
    descricao: "Notas e avaliações disponíveis do negócio.",
    icone: Star,
  },
  produtos: {
    nome: "Produtos",
    descricao: "Produtos do catálogo, quando a loja estiver ativa.",
    icone: Package,
  },
  instagram: {
    nome: "Instagram",
    descricao: "Link para o perfil do Instagram do negócio.",
    icone: Instagram,
  },
  localizacao: {
    nome: "Localização",
    descricao: "Endereço público e acesso ao mapa.",
    icone: MapPin,
  },
  horarios: {
    nome: "Horários",
    descricao: "Horários de funcionamento do negócio.",
    icone: Clock3,
  },
  whatsapp: {
    nome: "WhatsApp",
    descricao: "Atalho de contato pelo WhatsApp ou telefone cadastrado.",
    icone: MessageCircle,
  },
  cta_final: {
    nome: "Chamada final",
    descricao: "Convite para o cliente iniciar o agendamento no final da página.",
    icone: CalendarDays,
  },
};

export function SecaoConteudo({
  config,
  setPagina,
  somente,
  mostrarEdicao = true,
}: {
  config: PaginaConfig;
  setPagina: SetPagina;
  somente?: ComponenteId;
  mostrarEdicao?: boolean;
}) {
  const refs = useRef<Record<ComponenteId, HTMLButtonElement | null>>({} as Record<ComponenteId, HTMLButtonElement | null>);
  const focoPendente = useRef<ComponenteId | null>(null);
  const reduzirMovimento = useReducedMotion();

  // Se um bloco mudar de grupo ao ligar/desligar, preserva o foco do teclado.
  useEffect(() => {
    const id = focoPendente.current;
    if (!id) return;
    refs.current[id]?.focus();
    focoPendente.current = null;
  }, [config.componentes]);

  const ids = somente ? [somente] : componenteIds;
  const ativos = ids.filter((id) => config.componentes[id]);
  const inativos = ids.filter((id) => !config.componentes[id]);

  const grupo = (ids: ComponenteId[], ativo: boolean) => {
    if (somente && ids.length === 0) return null;
    return (
    <section className="space-y-3" aria-label={ativo ? "Seções ativas" : "Seções inativas"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-paper">{ativo ? "Seções ativas" : "Seções inativas"}</h3>
          <p className="mt-0.5 text-xs text-mute">
            {ativo ? "Visíveis quando há dados reais para exibir." : "Podem ser ativadas a qualquer momento."}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-ink2 px-2.5 py-1 text-xs font-semibold text-mute">
          {ids.length}
        </span>
      </div>

      {ids.length ? (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {ids.map((id) => {
              const secao = SECOES[id];
              const Icone = secao.icone;
              return (
              <motion.div
                key={id}
                layout
                initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.99 }}
                transition={{ duration: reduzirMovimento ? 0.12 : 0.2, ease: "easeOut" }}
                className="surface flex min-h-[76px] items-center gap-3 p-3 sm:gap-4 sm:p-4"
              >
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${ativo ? "bg-gold/10 text-gold" : "bg-ink2 text-mute"}`}>
                  <Icone size={19} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-paper">{secao.nome}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mute">{secao.descricao}</span>
                </span>
                {mostrarEdicao ? (
                  <Button type="button" variant="outline" size="sm" className="min-h-11 shrink-0" asChild>
                    <Link to="/barbeiro/marca/secao/$secao" params={{ secao: id }}>Editar</Link>
                  </Button>
                ) : null}
                <Switch
                  ref={(node) => { refs.current[id] = node; }}
                  checked={ativo}
                  onCheckedChange={(checked) => {
                    focoPendente.current = id;
                    setPagina("componentes", { ...config.componentes, [id]: checked });
                  }}
                  aria-label={`${checkedLabel(ativo)} ${secao.nome}`}
                />
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-mute">
          {ativo ? "Nenhuma seção está ativa." : "Todas as seções estão ativas."}
        </p>
      )}
    </section>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-mute">
        Organize o que aparece na sua página pública. Os blocos são exibidos quando existe informação real cadastrada; ocultar um bloco não apaga os dados do negócio.
      </p>
      {grupo(ativos, true)}
      <div className="border-t border-line" />
      {grupo(inativos, false)}
      <p className="flex items-start gap-2 rounded-lg border border-line bg-ink2 p-3 text-xs leading-relaxed text-mute">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-sage" aria-hidden />
        As seções podem ser reativadas sem recadastrar suas informações.
      </p>
    </div>
  );
}

function checkedLabel(ativo: boolean) {
  return ativo ? "Ocultar" : "Ativar";
}
