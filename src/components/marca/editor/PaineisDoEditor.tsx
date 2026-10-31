import { FaixaDeEstado } from "@/components/marca/editor/FaixaDeEstado";
import { SecaoAjustesFinos } from "@/components/marca/editor/SecaoAjustesFinos";
import { SecaoImagens } from "@/components/marca/editor/SecaoImagens";
import { SecaoRecepcao } from "@/components/marca/editor/SecaoRecepcao";
import { SecaoLink } from "@/components/marca/editor/SecaoLink";
import { SecaoRedes } from "@/components/marca/editor/SecaoRedes";
import { SecaoVersoes } from "@/components/marca/editor/SecaoVersoes";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AjustadorImagem } from "@/components/ui/ajustador-imagem";
import { motion } from "framer-motion";
import { useState } from "react";
import type { MarcaData, getMarca } from "@/lib/marca.functions";
import { pagina } from "@/lib/motion";

function Item({
  id,
  titulo,
  descricao,
  children,
}: {
  id: string;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={id} className="border-line">
      <AccordionTrigger className="min-h-14 text-paper hover:no-underline">
        <span className="min-w-0 pr-3 text-left">
          <span className="block">{titulo}</span>
          <span className="mt-0.5 block text-xs font-normal leading-relaxed text-mute">
            {descricao}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-6 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

export type AbaPainelDoEditor = "detalhes" | "divulgacao" | "historico";

export function PaineisDoEditor({
  e,
  initial,
  versions,
  abaAtiva,
  onAbaChange,
}: {
  e: ReturnType<typeof useEditorDaPagina>;
  initial: MarcaData;
  versions: NonNullable<Awaited<ReturnType<typeof getMarca>>>["versoes"];
  abaAtiva?: AbaPainelDoEditor;
  onAbaChange?: (aba: AbaPainelDoEditor) => void;
}) {
  const [abaLocal, setAbaLocal] = useState<AbaPainelDoEditor>("detalhes");
  const aba = abaAtiva ?? abaLocal;
  const mudarAba = (value: string) => {
    const proxima = value as AbaPainelDoEditor;
    setAbaLocal(proxima);
    onAbaChange?.(proxima);
  };
  return (
    <>
      <Tabs value={aba} onValueChange={mudarAba}>
        <TabsList
          aria-label="Áreas de configuração da página"
          className="flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain bg-ink2 p-1"
        >
          <TabsTrigger value="detalhes" className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm">
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="divulgacao" className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm">
            Divulgação
          </TabsTrigger>
          <TabsTrigger value="historico" className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm">
            Histórico
          </TabsTrigger>
        </TabsList>



        <TabsContent value="detalhes" className="mt-2">
          <motion.div {...pagina}>
            <Accordion type="multiple" defaultValue={["imagens"]}>
              <Item
                id="imagens"
                titulo="Logo e imagens"
                descricao="Defina a identidade visual que seus clientes vão reconhecer."
              >
                <SecaoImagens
                  coverRef={e.coverRef}
                  fileRef={e.fileRef}
                  coverPreview={e.coverPreview}
                  logoPreview={e.logoPreview}
                  logoAtual={e.form.logo_url}
                  busy={e.busy}
                  upload={e.upload}
                  usarLogo={e.usarLogo}
                  removerLogo={e.removerLogo}
                />
              </Item>
              <Item
                id="recepcao"
                titulo="Foto da recepção"
                descricao="Personalize a imagem que identifica a recepção no atendimento por conversa."
              >
                <SecaoRecepcao
                  config={e.config}
                  setPagina={e.setPagina}
                  avatarRef={e.avatarRef}
                  avatarPreview={e.avatarPreview}
                  setAvatarPreview={e.setAvatarPreview}
                  upload={e.upload}
                />
              </Item>
              <Item
                id="ajustes"
                titulo="Cores, fontes e detalhes"
                descricao="Personalize cores, tipografia, espaçamento, cantos e botões."
              >
                <SecaoAjustesFinos config={e.config} setPagina={e.setPagina} />
              </Item>
            </Accordion>
          </motion.div>
        </TabsContent>

        <TabsContent value="divulgacao" className="mt-2">
          <motion.div {...pagina}>
            <Accordion type="multiple" defaultValue={["link"]}>
              <Item
                id="link"
                titulo="Link e contato"
                descricao="Edite o endereço público e as formas de contato."
              >
                <SecaoLink
                  slug={e.slug}
                  setSlug={e.setSlug}
                  slugInicial={initial.slug}
                  busy={e.busy}
                  salvarSlug={e.salvarSlug}
                  form={e.form}
                  setMarca={e.setMarca}
                />
              </Item>
              <Item
                id="redes"
                titulo="Redes sociais"
                descricao="Conecte os perfis do seu negócio à página."
              >
                <SecaoRedes
                  form={e.form}
                  setMarca={e.setMarca}
                  config={e.config}
                  setPagina={e.setPagina}
                />
              </Item>
            </Accordion>
          </motion.div>
        </TabsContent>

        <TabsContent value="historico" className="mt-2">
          <motion.div {...pagina}>
            <Accordion type="multiple" defaultValue={["versoes"]}>
              <Item
                id="versoes"
                titulo="Versões anteriores"
                descricao="Consulte e restaure uma versão salva como rascunho."
              >
                <SecaoVersoes versions={versions} busy={e.busy} restaurar={e.restaurar} />
              </Item>
            </Accordion>
          </motion.div>
        </TabsContent>
      </Tabs>

      {e.imagemPendente ? (
        <AjustadorImagem
          file={e.imagemPendente.file}
          titulo={
            e.imagemPendente.kind === "capa"
              ? "Ajustar foto de capa"
              : e.imagemPendente.kind === "logo"
                ? "Ajustar logo"
                : "Ajustar foto da recepção"
          }
          proporcao={e.imagemPendente.kind === "capa" ? 16 / 9 : 1}
          fit={e.imagemPendente.kind === "logo" ? "contain" : "cover"}
          onCancelar={e.cancelarImagem}
          onConfirmar={e.confirmarImagem}
        />
      ) : null}

      <FaixaDeEstado
        fase={e.fase}
        erro={e.erro}
        status={e.status}
        naoSalvo={e.naoSalvo}
        pendente={e.pendente}
      />
    </>
  );
}
