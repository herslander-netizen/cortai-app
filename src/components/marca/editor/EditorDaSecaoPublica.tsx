import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { CalendarDays, ExternalLink, ImagePlus, MapPin, MessageCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SecaoRedes } from "@/components/marca/editor/SecaoRedes";
import { SecaoTextos } from "@/components/marca/editor/SecaoTextos";
import { Campo } from "@/components/marca/editor/campos";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { componenteIds } from "@/lib/pagina-config";

type Secao = (typeof componenteIds)[number];
type Editor = ReturnType<typeof useEditorDaPagina>;
type DestinoGestao = "/barbeiro/servicos" | "/barbeiro/profissionais" | "/barbeiro/avaliacoes" | "/barbeiro/produtos" | "/barbeiro/horarios";

function IrParaGestao({ to, titulo, descricao }: { to: DestinoGestao; titulo: string; descricao: string }) {
  return (
    <section className="surface space-y-3 p-4">
      <div className="flex items-start gap-3">
        <ExternalLink size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-paper">{titulo}</h3>
          <p className="mt-1 text-sm leading-relaxed text-mute">{descricao}</p>
          <p className="mt-2 text-xs text-mute">Salve as alterações desta seção antes de sair, para não perder mudanças de visibilidade.</p>
        </div>
      </div>
      <Button asChild variant="outline" className="min-h-12 w-full">
        <Link to={to}>Abrir gerenciamento</Link>
      </Button>
    </section>
  );
}

export function EditorDaSecaoPublica({ secao, e }: { secao: Secao; e: Editor }) {
  switch (secao) {
    case "apresentacao":
      return <SecaoTextos config={e.config} setPagina={e.setPagina} form={e.form} setMarca={e.setMarca} vocabulario={e.vocabulario} />;
    case "servicos":
      return <IrParaGestao to="/barbeiro/servicos" titulo="Serviços cadastrados" descricao="Edite nomes, preços, duração e disponibilidade dos serviços que aparecem na página pública." />;
    case "profissionais":
      return <IrParaGestao to="/barbeiro/profissionais" titulo="Profissionais do negócio" descricao="Gerencie os profissionais cadastrados no negócio. A lista pública usa os dados reais da equipe." />;
    case "galeria":
      return <EditorGaleria e={e} />;
    case "avaliacoes":
      return <IrParaGestao to="/barbeiro/avaliacoes" titulo="Avaliações do negócio" descricao="Consulte e gerencie as avaliações reais. A página pública mostra apenas o resumo disponível." />;
    case "produtos":
      return <IrParaGestao to="/barbeiro/produtos" titulo="Catálogo de produtos" descricao="Gerencie produtos, fotos, preços e disponibilidade da loja." />;
    case "instagram":
      return <SecaoRedes form={e.form} setMarca={e.setMarca} config={e.config} setPagina={e.setPagina} />;
    case "localizacao":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-paper"><MapPin size={18} aria-hidden /> Endereço público</div>
          <Campo label="Endereço exibido na página" value={e.form.endereco} onChange={(value) => e.setMarca("endereco", value || null)} placeholder="Rua, número, bairro e cidade" />
        </div>
      );
    case "horarios":
      return <IrParaGestao to="/barbeiro/horarios" titulo="Horários de funcionamento" descricao="A página usa os horários reais do negócio. Altere os dias e horários na gestão de funcionamento." />;
    case "whatsapp":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-paper"><MessageCircle size={18} aria-hidden /> Canais de contato</div>
          <Campo label="WhatsApp público" value={e.form.whatsapp} onChange={(value) => e.setMarca("whatsapp", value || null)} placeholder="DDD + número" />
          <Campo label="Telefone" value={e.form.telefone} onChange={(value) => e.setMarca("telefone", value || null)} placeholder="DDD + número" />
        </div>
      );
    case "cta_final":
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-paper"><CalendarDays size={18} aria-hidden /> Chamada para agendar</div>
          <Campo label="Texto do botão" value={e.config.cta} onChange={(value) => e.setPagina("cta", value)} placeholder="Agendar agora" />
          <label className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-line px-4 py-2">
            <span className="text-sm text-paper">Manter botão de agendamento fixo no celular</span>
            <Switch checked={e.config.botaoFixo} onCheckedChange={(checked) => e.setPagina("botaoFixo", checked)} aria-label="Botão de agendamento fixo no celular" />
          </label>
        </div>
      );
    default:
      return <p className="text-sm text-mute">Esta seção não tem campos adicionais de página. Use o controle de visibilidade e salve; os dados são mantidos no cadastro do negócio.</p>;
  }
}

function EditorGaleria({ e }: { e: Editor }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-paper">Fotos da galeria</h3>
        <p className="mt-1 text-sm leading-relaxed text-mute">Adicione até 8 fotos JPG, PNG ou WebP. Remover uma foto da galeria não apaga o arquivo do armazenamento.</p>
      </div>
      {e.fotosPreview.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {e.fotosPreview.map((foto, index) => (
            <article key={foto.path} className="overflow-hidden rounded-xl border border-line bg-ink2">
              {foto.url ? (
                <img src={foto.url} alt={`Foto ${index + 1} da galeria`} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center px-3 text-center text-xs text-mute">Imagem indisponível</div>
              )}
              <div className="p-2">
                <Button type="button" variant="ghost" className="min-h-11 w-full" disabled={e.busy} onClick={() => e.removerFoto(foto.path)} aria-label={`Remover foto ${index + 1}`}>
                  <Trash2 size={16} aria-hidden />
                  Remover
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-mute">Nenhuma foto adicionada à galeria.</p>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void e.upload(event, "foto")} />
      <Button type="button" variant="outline" className="min-h-12 w-full" disabled={e.busy || e.form.fotos.length >= 8} onClick={() => inputRef.current?.click()}>
        <ImagePlus size={17} aria-hidden />
        {e.form.fotos.length >= 8 ? "Limite de 8 fotos atingido" : "Adicionar foto"}
      </Button>
    </div>
  );
}
