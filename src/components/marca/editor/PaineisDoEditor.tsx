import { LacunasDaPagina } from "@/components/marca/editor/LacunasDaPagina";
import { FaixaDeEstado } from "@/components/marca/editor/FaixaDeEstado";
import { SecaoAjustesFinos } from "@/components/marca/editor/SecaoAjustesFinos";
import { SecaoConteudo } from "@/components/marca/editor/SecaoConteudo";
import { SecaoExperiencia } from "@/components/marca/editor/SecaoExperiencia";
import { SecaoImagens } from "@/components/marca/editor/SecaoImagens";
import { SecaoLink } from "@/components/marca/editor/SecaoLink";
import { SecaoRedes } from "@/components/marca/editor/SecaoRedes";
import { SecaoRecepcao } from "@/components/marca/editor/SecaoRecepcao";
import { SecaoTema } from "@/components/marca/editor/SecaoTema";
import { SecaoTextos } from "@/components/marca/editor/SecaoTextos";
import { SecaoVersoes } from "@/components/marca/editor/SecaoVersoes";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MarcaData, getMarca } from "@/lib/marca.functions";
import { TEMAS } from "@/lib/pagina-config";

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

export function PaineisDoEditor({
  e,
  initial,
  versions,
}: {
  e: ReturnType<typeof useEditorDaPagina>;
  initial: MarcaData;
  versions: NonNullable<Awaited<ReturnType<typeof getMarca>>>["versoes"];
}) {
  return (
    <>
      <Tabs defaultValue="conteudo">
        <TabsList
          aria-label="Áreas de configuração da página"
          className="grid h-auto w-full grid-cols-2 gap-1 bg-ink2 p-1 sm:grid-cols-4"
        >
          <TabsTrigger
            value="conteudo"
            className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm"
          >
            Conteúdo
          </TabsTrigger>
          <TabsTrigger
            value="aparencia"
            className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm"
          >
            Aparência
          </TabsTrigger>
          <TabsTrigger
            value="divulgacao"
            className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm"
          >
            Divulgação
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="min-h-12 whitespace-normal px-2 text-xs sm:text-sm"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conteudo" className="mt-2">
          <Accordion type="multiple" defaultValue={["experiencia"]}>
            <Item
              id="experiencia"
              titulo="Experiência de agendamento"
              descricao="Escolha como seus clientes vão iniciar o agendamento."
            >
              <SecaoExperiencia config={e.config} setPagina={e.setPagina} />
              {e.usaConversa ? (
                <div className="mt-6 border-t border-line pt-6">
                  <h3 className="mb-4 text-sm font-semibold text-paper">Recepção</h3>
                  <SecaoRecepcao
                    config={e.config}
                    setPagina={e.setPagina}
                    avatarRef={e.avatarRef}
                    avatarPreview={e.avatarPreview}
                    setAvatarPreview={e.setAvatarPreview}
                    upload={e.upload}
                  />
                </div>
              ) : null}
            </Item>
            <Item
              id="conteudo"
              titulo="Blocos da página"
              descricao="Mostre serviços, equipe, avaliações e outras informações reais."
            >
              <SecaoConteudo config={e.config} setPagina={e.setPagina} />
            </Item>
            <Item
              id="textos"
              titulo="Textos e botão"
              descricao="Ajuste sua apresentação, endereço e chamada para agendar."
            >
              <SecaoTextos
                config={e.config}
                setPagina={e.setPagina}
                form={e.form}
                setMarca={e.setMarca}
                vocabulario={e.vocabulario}
              />
            </Item>
          </Accordion>
          <LacunasDaPagina lacunas={initial.lacunas} />
        </TabsContent>

        <TabsContent value="aparencia" className="mt-2">
          <Accordion type="multiple" defaultValue={["tema"]}>
            <Item id="tema" titulo="Tema e cores" descricao="Escolha o estilo visual da página.">
              <SecaoTema
                config={e.config}
                segmento={initial.segmento}
                escolher={(tema) =>
                  e.setConfig((old) => ({ ...old, tema, cores: TEMAS[tema].cores }))
                }
              />
            </Item>
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
              id="ajustes"
              titulo="Detalhes visuais"
              descricao="Personalize pequenos ajustes de layout e apresentação."
            >
              <SecaoAjustesFinos config={e.config} setPagina={e.setPagina} />
            </Item>
          </Accordion>
        </TabsContent>

        <TabsContent value="divulgacao" className="mt-2">
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
        </TabsContent>

        <TabsContent value="historico" className="mt-2">
          <Accordion type="multiple" defaultValue={["versoes"]}>
            <Item
              id="versoes"
              titulo="Versões anteriores"
              descricao="Consulte e restaure uma versão salva como rascunho."
            >
              <SecaoVersoes versions={versions} busy={e.busy} restaurar={e.restaurar} />
            </Item>
          </Accordion>
        </TabsContent>
      </Tabs>

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
