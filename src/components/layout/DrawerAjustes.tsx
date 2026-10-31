import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarCog,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Eye,
  LogOut,
  Repeat,
  Settings,
  Share2,
  SlidersHorizontal,
  Store,
} from "lucide-react";

import { IconeDoMenu } from "@/components/layout/IconeDoMenu";
import { Button } from "@/components/ui/button";
import { IconeAjustesFigaro } from "@/components/ui/icones-figaro";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sair } from "@/lib/guarda";

type Props = {
  identidade?: string | undefined;
  tenantId?: string | undefined;
  podeAlterarIdentidade: boolean;
  fecharDrawer: () => void;
};

const ITENS = [
  {
    label: "Informações básicas",
    detalhe: "Nome, logo e contato do negócio",
    to: "/barbeiro/negocio",
    icon: Store,
  },
  {
    label: "Opções de agendamento",
    detalhe: "Horários oferecidos, antecedência e cancelamento",
    to: "/barbeiro/agendamento",
    icon: CalendarCog,
  },
  {
    label: "Opções da conta",
    detalhe: "Perfil, formas de entrar e segurança",
    to: "/barbeiro/conta",
    icon: Settings,
  },
  {
    label: "Sua Página",
    detalhe: "Personalize a página pública, layout e seções",
    to: "/barbeiro/marca",
    icon: Eye,
  },
  {
    label: "Funcionalidades",
    detalhe: "Ligue só o que você usa",
    to: "/barbeiro/funcionalidades",
    icon: SlidersHorizontal,
  },
  {
    label: "Redes sociais",
    detalhe: "Instagram e TikTok conectados",
    to: "/barbeiro/redes",
    icon: Share2,
  },
  {
    label: "Plano",
    detalhe: "Assinatura, cobranças e histórico",
    to: "/barbeiro/plano",
    icon: CreditCard,
  },
  {
    label: "Notificações",
    detalhe: "Onde receber cada aviso",
    to: "/barbeiro/notificacoes",
    icon: Bell,
  },
  { label: "Ajuda e suporte", detalhe: "Ajustes e ajuda", to: "/barbeiro/mais", icon: CircleHelp },
] as const;

const CARTAO =
  "min-h-14 w-full rounded-[18px] border border-drawer-borda bg-drawer-card px-4 py-3 hover:bg-drawer-card";
const LINHA = "grid w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3";

export function DrawerAjustes({
  identidade,
  tenantId,
  podeAlterarIdentidade,
  fecharDrawer,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const gatilhoRef = useRef<HTMLButtonElement | null>(null);

  function navegar() {
    setAberto(false);
    fecharDrawer();
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          ref={gatilhoRef}
          variant="icon"
          size="icon"
          aria-label="Abrir ajustes"
          className="size-11 shrink-0 rounded-full text-menu-icone hover:bg-drawer-card"
        >
          {/* O botão encolhe todo ícone para 16 px; aqui ele sai no tamanho do Figaro (~20 de desenho). */}
          <IconeAjustesFigaro className="!size-[26px]" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        arrastarParaFechar
        onCloseAutoFocus={(evento) => {
          evento.preventDefault();
          gatilhoRef.current?.focus();
        }}
        className="z-[70] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-[28px] border-line bg-drawer-surface px-4 pt-5"
      >
        <div className="shrink-0 pb-4">
          <SheetTitle className="text-xl text-paper">Ajustes</SheetTitle>
          <SheetDescription className="mt-1 text-sm text-mute">
            Conta e preferências do aplicativo. A aparência fica no menu.
          </SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mt-1 space-y-1.5">
            {ITENS.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.label} asChild variant="ghost" size="bloco" className={CARTAO}>
                  <Link to={item.to} onClick={navegar}>
                    <span className={LINHA}>
                      <IconeDoMenu icone={Icon} />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-paper">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-normal text-mute">
                          {item.detalhe}
                        </span>
                      </span>
                      <ChevronRight className="size-5 text-mute2" aria-hidden />
                    </span>
                  </Link>
                </Button>
              );
            })}

            {ITENS.slice(3).map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.label} asChild variant="ghost" size="bloco" className={CARTAO}>
                  <Link to={item.to} onClick={navegar}>
                    <span className={LINHA}>
                      <IconeDoMenu icone={Icon} />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold text-paper">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-normal text-mute">
                          {item.detalhe}
                        </span>
                      </span>
                      <ChevronRight className="size-5 text-mute2" aria-hidden />
                    </span>
                  </Link>
                </Button>
              );
            })}

            <Button asChild variant="ghost" size="bloco" className={CARTAO}>
              <Link to="/escolher" onClick={navegar}>
                <span className={LINHA}>
                  <IconeDoMenu icone={Repeat} />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-paper">
                      Trocar de perfil
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-mute">
                      Cliente ou negócio, sem sair da conta
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-mute2" aria-hidden />
                </span>
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="bloco"
                  className={`${CARTAO} text-brick hover:bg-brick-soft`}
                >
                  <span className="flex w-full items-center gap-3">
                    <LogOut className="size-6" aria-hidden />
                    <span className="text-base font-semibold">Sair da conta</span>
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                overlayClassName="z-[80]"
                className="z-[80] w-[calc(100%-2rem)] rounded-[20px] border-line bg-ink3"
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você precisará entrar novamente para acessar o seu negócio.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuar conectado</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void sair()}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
