import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ClipboardList,
  LayoutTemplate,
  MessageCircle,
  Megaphone,
  Palette,
  KeyRound,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";

import { TrocarPainel } from "@/components/acesso/TrocarPainel";
import { AdminScreen } from "@/components/layout/AdminScreen";
import { GrupoDeLinhas, LinhaDeConfiguracao } from "@/components/ui/formulario/LinhasDeConfiguracao";

export const Route = createFileRoute("/admin/mais")({
  head: () => ({
    meta: [
      { title: "Mais — Administração Flow" },
      {
        name: "description",
        content: "Configurações e áreas administrativas da plataforma Flow.",
      },
      { property: "og:title", content: "Mais — Administração Flow" },
      {
        property: "og:description",
        content: "Configurações e áreas administrativas da plataforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminMaisPage,
});

const grupos = [
  {
    titulo: "Operação da plataforma",
    itens: [
      {
        to: "/admin/pedidos",
        label: "Pedidos",
        detail: "Solicitações e prioridades dos negócios",
        icon: ClipboardList,
      },
      {
        to: "/admin/whatsapp",
        label: "WhatsApp",
        detail: "Conexão, QR Code e notificações de cada estabelecimento",
        icon: MessageCircle,
      },
    ],
  },
  {
    titulo: "Conteúdo público",
    itens: [
      {
        to: "/admin/marketing",
        label: "Marketing",
        detail: "Abrir e compartilhar a apresentação do Flow",
        icon: Megaphone,
      },
      {
        to: "/admin/home",
        label: "Home pública",
        detail: "Textos, perguntas e SEO da Home oficial (/apresentacao)",
        icon: LayoutTemplate,
      },
      {
        to: "/admin/parceiros",
        label: "Parceiros",
        detail: "Faixa pública e parcerias ativas",
        icon: UsersRound,
      },
    ],
  },
  {
    titulo: "Configurações",
    itens: [
      {
        to: "/admin/ajustes",
        label: "Aparência e padrões",
        detail: "Identidade visual e configurações globais",
        icon: Palette,
      },
      {
        to: "/admin/recursos",
        label: "Recursos dos planos",
        detail: "Matriz de disponibilidade por plano",
        icon: SlidersHorizontal,
      },
      {
        to: "/admin/asaas",
        label: "Conta Asaas",
        detail: "Chave de API e teste de conexão",
        icon: KeyRound,
      },
      {
        to: "/admin/perfil",
        label: "Perfil",
        detail: "Conta e segurança do administrador",
        icon: UserRound,
      },
    ],
  },
] as const;

function AdminMaisPage() {
  return (
    <AdminScreen title="Mais" subtitle="Configurações e áreas menos frequentes da plataforma.">
      <div className="space-y-4">
        <TrocarPainel />
        {grupos.map((grupo) => (
          <section key={grupo.titulo}>
            <h2 className="mb-2 px-1 text-base font-semibold text-paper">{grupo.titulo}</h2>
            <GrupoDeLinhas>
              {grupo.itens.map((item) => (
                <LinhaDeConfiguracao
                  key={item.to}
                  icone={item.icon}
                  titulo={item.label}
                  suporte={item.detail}
                  para={item.to}
                />
              ))}
            </GrupoDeLinhas>
          </section>
        ))}
      </div>
    </AdminScreen>
  );
}
