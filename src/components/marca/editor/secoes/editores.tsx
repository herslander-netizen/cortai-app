import { EsqueletoLista } from "@/components/layout/Esqueleto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ListaDeFotos } from "@/components/fotos/SeletorDeFoto";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Campo } from "@/components/marca/editor/campos";
import { getProfissionaisPerfil, salvarPerfilProfissional } from "@/lib/crescimento.functions";
import { LIMITES_DA_SECAO, type PaginaConfig } from "@/lib/pagina-config";
import type { useEditorDaPagina } from "../useEditorDaPagina";
import { GrupoDeCampos, LinhaComSwitch, OpcoesConectadas } from "./pecas";
import {
  erroDaBio,
  erroDeBiosObrigatorias,
  erroDoSubtituloDaGaleria,
  erroDoTituloDaGaleria,
} from "./validacao";

type Editor = ReturnType<typeof useEditorDaPagina>;
type Secoes = PaginaConfig["secoes"];

export type PropsDoEditor = {
  e: Editor;
  /** Cada editor avisa a rota do primeiro erro que impede salvar (ou `null`). */
  reportarErro: (erro: string | null) => void;
};

function useSecao<K extends keyof Secoes>(e: Editor, chave: K) {
  const atual = e.config.secoes[chave];
  const alterar = (parte: Partial<Secoes[K]>) =>
    e.setPagina("secoes", { ...e.config.secoes, [chave]: { ...atual, ...parte } });
  return [atual, alterar] as const;
}

/** Serviços (`service-list`): serviços populares em destaque, mostrar ou ocultar. */
export function EditorDeServicos({ e, reportarErro }: PropsDoEditor) {
  const [secao, alterar] = useSecao(e, "servicos");
  useEffect(() => reportarErro(null), [reportarErro]);
  return (
    <>
      <GrupoDeCampos titulo="Serviços populares">
        <OpcoesConectadas
          rotulo="Serviços populares"
          valor={secao.populares ? "mostrar" : "ocultar"}
          opcoes={[
            { valor: "mostrar", texto: "Mostrar" },
            { valor: "ocultar", texto: "Ocultar" },
          ]}
          onChange={(v) => alterar({ populares: v === "mostrar" })}
        />
        <p className="text-sm leading-snug text-mute">
          Mostra no topo os serviços mais agendados do negócio.
        </p>
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Cadastro">
        <p className="text-sm leading-relaxed text-mute">
          Nomes, preços e duração vêm dos serviços cadastrados no negócio.
        </p>
        <Button asChild variant="outline" className="min-h-12 w-full">
          <Link to="/barbeiro/servicos">Abrir serviços</Link>
        </Button>
      </GrupoDeCampos>
    </>
  );
}

/** Equipe (`team`): foto, detalhes (bio) e a bio de cada profissional. */
export function EditorDeEquipe({ e, reportarErro }: PropsDoEditor) {
  const [secao, alterar] = useSecao(e, "profissionais");
  const queryClient = useQueryClient();
  const salvar = useServerFn(salvarPerfilProfissional);
  const query = useQuery({
    queryKey: ["profissionais-perfil"],
    queryFn: () => getProfissionaisPerfil(),
  });
  const membros = (query.data ?? []).filter((p) => p.ativo);
  const [editando, setEditando] = useState<(typeof membros)[number] | null>(null);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  const erro = erroDeBiosObrigatorias(
    secao.mostrarDetalhes,
    membros.map((m) => m.descricao),
    "equipe",
  );
  useEffect(() => reportarErro(erro), [erro, reportarErro]);

  const abrir = (membro: (typeof membros)[number]) => {
    setEditando(membro);
    setTexto(membro.descricao ?? "");
    setFalha(null);
  };
  const salvarBio = async () => {
    if (!editando) return;
    const problema = erroDaBio(texto);
    if (problema) return setFalha(problema);
    setSalvando(true);
    try {
      await salvar({
        data: {
          id: editando.id,
          descricao: texto.trim(),
          portfolio: editando.portfolio.slice(0, 6),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["profissionais-perfil"] });
      setEditando(null);
    } catch (error) {
      setFalha(error instanceof Error ? error.message : "Não foi possível salvar a bio.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <GrupoDeCampos titulo="Exibição">
        <LinhaComSwitch
          rotulo="Exibir foto"
          marcado={secao.mostrarFoto}
          onChange={(v) => alterar({ mostrarFoto: v })}
        />
        <LinhaComSwitch
          rotulo="Exibir detalhes"
          marcado={secao.mostrarDetalhes}
          onChange={(v) => alterar({ mostrarDetalhes: v })}
        />
        {erro ? (
          <p role="alert" className="text-sm text-brick">
            {erro}
          </p>
        ) : null}
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Profissionais">
        {query.isLoading ? <EsqueletoLista linhas={3} /> : null}
        {!query.isLoading && membros.length === 0 ? (
          <p className="text-sm text-mute">Nenhum profissional cadastrado.</p>
        ) : null}
        <ul className="divide-y divide-line">
          {membros.map((m) => (
            <li key={m.id} className="flex min-h-14 items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base text-paper">{m.nome}</span>
                {m.descricao?.trim() ? null : (
                  <span className="block text-sm text-brick">Sem bio</span>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => abrir(m)}
              >
                {m.descricao?.trim() ? "Editar bio" : "Bio"}
              </Button>
            </li>
          ))}
        </ul>
      </GrupoDeCampos>
      <Sheet open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>{editando ? `Bio de ${editando.nome}` : "Bio"}</SheetTitle>
            <SheetDescription>
              Aparece na página pública quando os detalhes estão ligados.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <Field label="Bio">
              <Textarea
                className="mt-2 min-h-32"
                value={texto}
                maxLength={LIMITES_DA_SECAO.bio + 200}
                placeholder="Ex: Cuidando do visual dos clientes desde os anos 90…"
                onChange={(ev) => setTexto(ev.target.value)}
              />
            </Field>
            <p className="text-right text-xs text-mute" aria-live="polite">
              {texto.trim().length}/{LIMITES_DA_SECAO.bio}
            </p>
            {(falha ?? erroDaBio(texto)) ? (
              <p role="alert" className="text-sm text-brick">
                {falha ?? erroDaBio(texto)}
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              className="min-h-12"
              loading={salvando}
              disabled={Boolean(erroDaBio(texto))}
              onClick={() => void salvarBio()}
            >
              Salvar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Galeria (`photo-gallery`): título, subtítulo e fotos. */
export function EditorDeGaleria({ e, reportarErro }: PropsDoEditor) {
  const [secao, alterar] = useSecao(e, "galeria");
  const erroTitulo = erroDoTituloDaGaleria(secao.titulo);
  const erroSubtitulo = erroDoSubtituloDaGaleria(secao.subtitulo);
  const erro = erroTitulo ?? erroSubtitulo;
  useEffect(() => reportarErro(erro), [erro, reportarErro]);
  return (
    <>
      <GrupoDeCampos titulo="Fotos">
        <p className="text-sm leading-relaxed text-mute">
          Escolha até 8 fotos na galeria ou envie novas do aparelho. Remover uma foto da galeria não
          apaga o arquivo.
        </p>
        <ListaDeFotos
          fotos={e.fotosPreview.map((f) => ({ valor: f.path, url: f.url ?? "" }))}
          max={8}
          prefixo="foto"
          titulo="Fotos da galeria da página"
          onChange={(fotos) => e.definirFotos(fotos.map((f) => f.valor))}
        />
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Título">
        <Campo
          label="Título"
          value={secao.titulo}
          placeholder="Ex: Alguns dos nossos trabalhos"
          onChange={(v) => alterar({ titulo: v.slice(0, LIMITES_DA_SECAO.tituloDaGaleria.max) })}
        />
        {erroTitulo ? (
          <p role="alert" className="text-sm text-brick">
            {erroTitulo}
          </p>
        ) : null}
        <Campo
          label="Subtítulo (opcional)"
          value={secao.subtitulo}
          placeholder="Ex: Uma mostra do que fazemos, com orgulho."
          onChange={(v) =>
            alterar({ subtitulo: v.slice(0, LIMITES_DA_SECAO.subtituloDaGaleria.max) })
          }
        />
        {erroSubtitulo ? (
          <p role="alert" className="text-sm text-brick">
            {erroSubtitulo}
          </p>
        ) : null}
        <p className="text-xs text-mute">Sem título, a página usa “Destaques”.</p>
      </GrupoDeCampos>
    </>
  );
}

/** Avaliações (`ratings`): ordem e resumo. */
export function EditorDeAvaliacoes({ e, reportarErro }: PropsDoEditor) {
  const [secao, alterar] = useSecao(e, "avaliacoes");
  useEffect(() => reportarErro(null), [reportarErro]);
  return (
    <>
      <GrupoDeCampos titulo="Ordenar por">
        <OpcoesConectadas
          rotulo="Ordenar avaliações por"
          valor={secao.ordem}
          opcoes={[
            { valor: "data", texto: "Data" },
            { valor: "nota", texto: "Avaliação" },
          ]}
          onChange={(v) => alterar({ ordem: v })}
        />
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Resumo">
        <LinhaComSwitch
          rotulo="Exibir estatísticas"
          marcado={secao.mostrarResumo}
          onChange={(v) => alterar({ mostrarResumo: v })}
        />
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Cadastro">
        <p className="text-sm leading-relaxed text-mute">
          As avaliações são reais e vêm dos atendimentos concluídos.
        </p>
        <Button asChild variant="outline" className="min-h-12 w-full">
          <Link to="/barbeiro/avaliacoes">Abrir avaliações</Link>
        </Button>
      </GrupoDeCampos>
    </>
  );
}

/** Localização (`locations`): endereço, detalhes e bio. */
export function EditorDeLocalizacao({ e, reportarErro }: PropsDoEditor) {
  const [secao, alterar] = useSecao(e, "localizacao");
  const erro =
    erroDaBio(secao.bio) ??
    erroDeBiosObrigatorias(secao.mostrarDetalhes, [secao.bio], "localização");
  useEffect(() => reportarErro(erro), [erro, reportarErro]);
  return (
    <>
      <GrupoDeCampos titulo="Endereço">
        <Campo
          label="Endereço exibido na página"
          value={e.form.endereco}
          placeholder="Rua, número, bairro e cidade"
          onChange={(v) => e.setMarca("endereco", v || null)}
        />
      </GrupoDeCampos>
      <GrupoDeCampos titulo="Detalhes extra">
        <LinhaComSwitch
          rotulo="Exibir detalhes"
          marcado={secao.mostrarDetalhes}
          onChange={(v) => alterar({ mostrarDetalhes: v })}
        />
        <Field label="Bio do local">
          <Textarea
            className="mt-2 min-h-28"
            value={secao.bio}
            placeholder="Ex: Desde 1930 estamos nesta região, no coração do bairro…"
            onChange={(ev) => alterar({ bio: ev.target.value })}
          />
        </Field>
        <p className="text-right text-xs text-mute" aria-live="polite">
          {secao.bio.trim().length}/{LIMITES_DA_SECAO.bio}
        </p>
        {erro ? (
          <p role="alert" className="text-sm text-brick">
            {erro}
          </p>
        ) : null}
      </GrupoDeCampos>
    </>
  );
}
