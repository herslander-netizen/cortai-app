import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, History, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";
import { InterruptorApresentacao } from "@/components/admin/InterruptorApresentacao";
import { AdminNotice, AdminScreen } from "@/components/layout/AdminScreen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  APRESENTACAO_PADRAO,
  SEO_APRESENTACAO_PADRAO,
  esquemaApresentacao,
  normalizarApresentacao,
  type ChaveBloco,
  type ConteudoApresentacao,
} from "@/lib/apresentacao-conteudo";
import type { ConfigHome } from "@/lib/home-publica";
import {
  descartarRascunhoHome,
  getHomeAdmin,
  publicarHome,
  restaurarVersaoHome,
  salvarRascunhoHome,
} from "@/lib/home.functions";

export const Route = createFileRoute("/admin/home")({
  head: () => ({
    meta: [
      { title: "Home pública — Administração Flow" },
      {
        name: "description",
        content: "Edite os textos, perguntas e SEO da Home pública oficial do Flow.",
      },
      { property: "og:title", content: "Home pública — Administração Flow" },
      { property: "og:description", content: "Editor da Home pública oficial do Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditorDaHome,
});

const BLOCOS: Array<{ chave: ChaveBloco; rotulo: string }> = [
  { chave: "agenda", rotulo: "Agenda" },
  { chave: "foco", rotulo: "Modo Foco" },
  { chave: "clientes", rotulo: "Clientes" },
  { chave: "secretaria", rotulo: "WhatsApp" },
  { chave: "recursos", rotulo: "Recursos" },
  { chave: "caixa", rotulo: "Comanda e Caixa" },
  { chave: "segmentos", rotulo: "Segmentos" },
  { chave: "planos", rotulo: "Planos" },
  { chave: "duvidas", rotulo: "Dúvidas (cabeçalho)" },
  { chave: "final", rotulo: "Chamada final" },
];

const DATA = (valor?: string | null) =>
  valor ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

type Seo = { titulo: string; descricao: string };

function EditorDaHome() {
  const cliente = useQueryClient();
  const getFn = useServerFn(getHomeAdmin);
  const salvarFn = useServerFn(salvarRascunhoHome);
  const publicarFn = useServerFn(publicarHome);
  const descartarFn = useServerFn(descartarRascunhoHome);
  const restaurarFn = useServerFn(restaurarVersaoHome);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "home"],
    queryFn: () => getFn(),
  });
  const [conteudo, setConteudo] = useState<ConteudoApresentacao>(APRESENTACAO_PADRAO);
  const [seo, setSeo] = useState<Seo>(SEO_APRESENTACAO_PADRAO);

  useEffect(() => {
    if (!data) return;
    const r = data.rascunho as ConfigHome;
    setConteudo(normalizarApresentacao(r.apresentacao));
    setSeo(
      r.apresentacao
        ? { titulo: r.seo.titulo, descricao: r.seo.descricao }
        : SEO_APRESENTACAO_PADRAO,
    );
  }, [data]);

  const montar = (): ConfigHome | null => {
    if (!data) return null;
    const valido = esquemaApresentacao.safeParse(conteudo);
    if (!valido.success) {
      toast.error("Revise os campos: títulos e perguntas não podem ficar vazios.");
      return null;
    }
    if (!seo.titulo.trim()) {
      toast.error("O título para buscadores não pode ficar vazio.");
      return null;
    }
    const base = data.rascunho as ConfigHome;
    return {
      ...base,
      seo: { ...base.seo, titulo: seo.titulo, descricao: seo.descricao },
      apresentacao: valido.data,
    };
  };

  const invalidar = () => cliente.invalidateQueries({ queryKey: ["admin", "home"] });
  const salvar = useMutation({
    mutationFn: (c: ConfigHome) => salvarFn({ data: c }),
    onSuccess: () => {
      toast.success("Rascunho salvo.");
      void invalidar();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });
  const publicar = useMutation({
    mutationFn: (c: ConfigHome) => publicarFn({ data: c }),
    onSuccess: () => {
      toast.success("Home pública atualizada.");
      void invalidar();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível publicar."),
  });
  const descartar = useMutation({
    mutationFn: () => descartarFn(),
    onSuccess: () => {
      toast.success("Rascunho descartado.");
      void invalidar();
    },
  });
  const restaurar = useMutation({
    mutationFn: (id: string) => restaurarFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Versão restaurada no rascunho.");
      void invalidar();
    },
  });

  const bloco = (chave: ChaveBloco, campo: "etiqueta" | "titulo" | "texto", valor: string) =>
    setConteudo((c) => ({ ...c, [chave]: { ...c[chave], [campo]: valor } }));
  const pergunta = (i: number, campo: "pergunta" | "resposta", valor: string) =>
    setConteudo((c) => ({
      ...c,
      perguntas: c.perguntas.map((q, j) => (j === i ? { ...q, [campo]: valor } : q)),
    }));

  const ocupado = salvar.isPending || publicar.isPending;

  return (
    <AdminScreen
      title="Home pública"
      subtitle="Conteúdo da Home oficial do Flow, em /apresentacao."
      actions={
        <Button size="sm" variant="outline" asChild>
          <a href="/apresentacao" target="_blank" rel="noreferrer">
            <Eye size={14} /> Ver
          </a>
        </Button>
      }
    >
      {error ? <AdminNotice error={error} /> : null}
      {isLoading ? (
        <EsqueletoFormulario campos={6} onTentarDeNovo={() => void refetch()} />
      ) : data ? (
        <div className="max-w-3xl space-y-6">
          <p className="text-sm text-mute">
            {data.temRascunho ? "Há alterações não publicadas." : "Tudo publicado."} Última
            publicação: {DATA(data.publicadoEm)}.
          </p>

          <InterruptorApresentacao />
          <Tabs defaultValue="topo">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="topo">Topo</TabsTrigger>
              <TabsTrigger value="secoes">Seções</TabsTrigger>
              <TabsTrigger value="duvidas">Dúvidas</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="versoes">Versões</TabsTrigger>
            </TabsList>

            <TabsContent value="topo" className="space-y-4 pt-4">
              <Field label="Etiqueta">
                <Input
                  value={conteudo.hero.etiqueta}
                  maxLength={80}
                  onChange={(e) =>
                    setConteudo((c) => ({ ...c, hero: { ...c.hero, etiqueta: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Título" hint="Use uma quebra de linha para separar as duas frases.">
                <Textarea
                  rows={2}
                  value={conteudo.hero.titulo}
                  maxLength={200}
                  onChange={(e) =>
                    setConteudo((c) => ({ ...c, hero: { ...c.hero, titulo: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Texto">
                <Textarea
                  rows={3}
                  value={conteudo.hero.texto}
                  maxLength={400}
                  onChange={(e) =>
                    setConteudo((c) => ({ ...c, hero: { ...c.hero, texto: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Botão principal">
                <Input
                  value={conteudo.hero.cta}
                  maxLength={40}
                  onChange={(e) =>
                    setConteudo((c) => ({ ...c, hero: { ...c.hero, cta: e.target.value } }))
                  }
                />
              </Field>
            </TabsContent>

            <TabsContent value="secoes" className="space-y-2 pt-2">
              {BLOCOS.map(({ chave, rotulo }) => (
                <fieldset key={chave} className="grid gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
                  <legend className="sr-only">{rotulo}</legend>
                  <p className="text-sm font-semibold text-paper">{rotulo}</p>
                  <Field label="Etiqueta">
                    <Input
                      value={conteudo[chave].etiqueta}
                      maxLength={80}
                      onChange={(e) => bloco(chave, "etiqueta", e.target.value)}
                    />
                  </Field>
                  <Field label="Título">
                    <Input
                      value={conteudo[chave].titulo}
                      maxLength={160}
                      onChange={(e) => bloco(chave, "titulo", e.target.value)}
                    />
                  </Field>
                  <Field label="Texto (opcional)">
                    <Textarea
                      rows={2}
                      value={conteudo[chave].texto}
                      maxLength={400}
                      onChange={(e) => bloco(chave, "texto", e.target.value)}
                    />
                  </Field>
                </fieldset>
              ))}
              <p className="py-4 text-xs text-mute">
                Preços e planos vêm da tabela oficial de planos e não são editados aqui.
              </p>
            </TabsContent>

            <TabsContent value="duvidas" className="space-y-5 pt-4">
              {conteudo.perguntas.map((q, i) => (
                <div key={i} className="grid gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
                  <Field label={`Pergunta ${i + 1}`}>
                    <Input
                      value={q.pergunta}
                      maxLength={160}
                      onChange={(e) => pergunta(i, "pergunta", e.target.value)}
                    />
                  </Field>
                  <Field label="Resposta">
                    <Textarea
                      rows={2}
                      value={q.resposta}
                      maxLength={500}
                      onChange={(e) => pergunta(i, "resposta", e.target.value)}
                    />
                  </Field>
                  {conteudo.perguntas.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="justify-self-start"
                      onClick={() =>
                        setConteudo((c) => ({
                          ...c,
                          perguntas: c.perguntas.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 size={14} /> Remover
                    </Button>
                  ) : null}
                </div>
              ))}
              {conteudo.perguntas.length < 10 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConteudo((c) => ({
                      ...c,
                      perguntas: [...c.perguntas, { pergunta: "", resposta: "" }],
                    }))
                  }
                >
                  <Plus size={14} /> Adicionar pergunta
                </Button>
              ) : null}
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 pt-4">
              <Field label="Título para buscadores" hint={`${seo.titulo.length}/70`}>
                <Input
                  value={seo.titulo}
                  maxLength={70}
                  onChange={(e) => setSeo((s) => ({ ...s, titulo: e.target.value }))}
                />
              </Field>
              <Field label="Descrição" hint={`${seo.descricao.length}/180`}>
                <Textarea
                  rows={3}
                  value={seo.descricao}
                  maxLength={180}
                  onChange={(e) => setSeo((s) => ({ ...s, descricao: e.target.value }))}
                />
              </Field>
            </TabsContent>

            <TabsContent value="versoes" className="pt-4">
              {data.versoes.length ? (
                <ul className="space-y-2">
                  {data.versoes.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-sm">
                      <span className="flex items-center gap-2 text-mute">
                        <History size={14} /> {v.rotulo} · {DATA(v.criado_em)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restaurar.mutate(v.id)}
                        disabled={restaurar.isPending}
                      >
                        <RotateCcw size={14} /> Restaurar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-mute">Nenhuma versão anterior.</p>
              )}
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap gap-2 bg-[var(--figaro-background,var(--ink))] py-3 md:bottom-0">
            <Button
              size="lg"
              onClick={() => {
                const c = montar();
                if (c) publicar.mutate(c);
              }}
              disabled={ocupado}
            >
              {publicar.isPending ? (
                <IndicadorDeCarregamento tamanho={18} decorativo className="text-current" />
              ) : null}{" "}
              Publicar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const c = montar();
                if (c) salvar.mutate(c);
              }}
              disabled={ocupado}
            >
              Salvar rascunho
            </Button>
            {data.temRascunho ? (
              <Button
                variant="ghost"
                onClick={() => descartar.mutate()}
                disabled={descartar.isPending}
              >
                Descartar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </AdminScreen>
  );
}
