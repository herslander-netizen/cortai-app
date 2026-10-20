import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Seções reais da apresentação (ids estáveis em ShowroomCortai). */
const SECOES = [
  { href: "#demo-interativa", rotulo: "Demonstração" },
  { href: "#para-quem", rotulo: "Para quem é" },
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#recursos", rotulo: "Recursos" },
  { href: "#planos", rotulo: "Planos" },
  { href: "#duvidas", rotulo: "Dúvidas" },
] as const;

/** Menu do cabeçalho no celular: a navegação some abaixo de 900px, então ele a substitui. */
export function MenuDaApresentacao() {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="showroom-menu-botao"
        aria-label="Abrir menu"
        aria-expanded={aberto}
        aria-controls="showroom-menu"
        onClick={() => setAberto(true)}
      >
        <Menu />
      </Button>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="right" id="showroom-menu" className="showroom-menu">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Ir para uma seção ou entrar.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Seções da apresentação" className="showroom-menu-lista">
            {SECOES.map((s) => (
              <a key={s.href} href={s.href} onClick={fechar}>
                {s.rotulo}
              </a>
            ))}
          </nav>
          <div className="showroom-menu-acoes">
            <Button asChild variant="outline">
              <Link to="/login" onClick={fechar}>
                Entrar
              </Link>
            </Button>
            <Button asChild>
              <Link to="/login" search={{ proximo: "/comecar", aba: "criar" }} onClick={fechar}>
                Começar grátis
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
