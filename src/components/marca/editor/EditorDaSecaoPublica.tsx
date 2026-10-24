import { Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SecaoRedes } from "@/components/marca/editor/SecaoRedes";
import { Campo } from "@/components/marca/editor/campos";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { componenteIds } from "@/lib/pagina-config";
import {
  EditorDeAvaliacoes,
  EditorDeEquipe,
  EditorDeGaleria,
  EditorDeLocalizacao,
  EditorDeServicos,
  type PropsDoEditor,
} from "./secoes/editores";
import { EditorDeHero } from "./secoes/EditorDeHero";

type Secao = (typeof componenteIds)[number];
type Editor = ReturnType<typeof useEditorDaPagina>;
type DestinoGestao =
  | "/barbeiro/servicos"
  | "/barbeiro/profissionais"
  | "/barbeiro/avaliacoes"
  | "/barbeiro/produtos"
  | "/barbeiro/horarios";

function IrParaGestao({
  to,
  titulo,
  descricao,
}: {
  to: DestinoGestao;
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="surface space-y-3 p-4">
      <div className="flex items-start gap-3">
        <ExternalLink size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-paper">{titulo}</h3>
          <p className="mt-1 text-sm leading-relaxed text-mute">{descricao}</p>
          <p className="mt-2 text-xs text-mute">
            Salve as alterações desta seção antes de sair, para não perder mudanças de visibilidade.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" className="min-h-12 w-full">
        <Link to={to}>Abrir gerenciamento</Link>
      </Button>
    </section>
  );
}

export function EditorDaSecaoPublica({ secao, e, reportarErro }: { secao: Secao } & PropsDoEditor) {
  switch (secao) {
    case "apresentacao":
      return <EditorDeHero e={e} reportarErro={reportarErro} />;
    case "servicos":
      return <EditorDeServicos e={e} reportarErro={reportarErro} />;
    case "profissionais":
      return <EditorDeEquipe e={e} reportarErro={reportarErro} />;
    case "galeria":
      return <EditorDeGaleria e={e} reportarErro={reportarErro} />;
    case "avaliacoes":
      return <EditorDeAvaliacoes e={e} reportarErro={reportarErro} />;
    case "produtos":
      return (
        <IrParaGestao
          to="/barbeiro/produtos"
          titulo="Catálogo de produtos"
          descricao="Gerencie produtos, fotos, preços e disponibilidade da loja."
        />
      );
    case "instagram":
      return (
        <SecaoRedes form={e.form} setMarca={e.setMarca} config={e.config} setPagina={e.setPagina} />
      );
    case "localizacao":
      return <EditorDeLocalizacao e={e} reportarErro={reportarErro} />;
    case "horarios":
      return (
        <IrParaGestao
          to="/barbeiro/horarios"
          titulo="Horários de funcionamento"
          descricao="A página usa os horários reais do negócio. Altere os dias e horários na gestão de funcionamento."
        />
      );
    case "whatsapp":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-paper">
            <MessageCircle size={18} aria-hidden /> Canais de contato
          </div>
          <Campo
            label="WhatsApp público"
            value={e.form.whatsapp}
            onChange={(value) => e.setMarca("whatsapp", value || null)}
            placeholder="DDD + número"
          />
          <Campo
            label="Telefone"
            value={e.form.telefone}
            onChange={(value) => e.setMarca("telefone", value || null)}
            placeholder="DDD + número"
          />
        </div>
      );
    case "cta_final":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-paper">
            <CalendarDays size={18} aria-hidden /> Chamada para agendar
          </div>
          <Campo
            label="Texto do botão"
            value={e.config.cta}
            onChange={(value) => e.setPagina("cta", value)}
            placeholder="Agendar agora"
          />
          <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-line px-4 py-2">
            <span className="text-sm text-paper">Manter botão de agendamento fixo no celular</span>
            <Switch
              checked={e.config.botaoFixo}
              onCheckedChange={(checked) => e.setPagina("botaoFixo", checked)}
              aria-label="Botão de agendamento fixo no celular"
            />
          </label>
        </div>
      );
    default:
      return (
        <p className="text-sm text-mute">
          Esta seção não tem campos adicionais de página. Use o controle de visibilidade e salve; os
          dados são mantidos no cadastro do negócio.
        </p>
      );
  }
}
