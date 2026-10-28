import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, LockKeyhole, Plus } from "lucide-react";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TelaDeFormulario } from "@/components/ui/formulario/TelaDeFormulario";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { PaletaCategoria } from "@/components/servicos/PaletaCategoria";
import {
  listarCategoriasServicos,
  salvarCategoriaServico,
  type CategoriaDeServico,
} from "@/lib/categorias-servicos.functions";
import { cssDaCorCategoria, type CorCategoria } from "@/lib/categorias-servicos";
import { ESPERA_MS } from "@/lib/movimento-figaro";

export const Route = createFileRoute("/barbeiro/categorias")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Categorias — Serviços | Cortaí" },
      { name: "description", content: "Organize e personalize as categorias dos serviços do seu negócio." },
      { property: "og:title", content: "Categorias — Cortaí" },
      { property: "og:description", content: "Organize os serviços por categoria." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CategoriasPage,
});

type RascunhoCategoria = {
  id: string | null;
  nomeAnterior: string | null;
  nome: string;
  cor: CorCategoria;
  ordem: number;
};

function CategoriasPage() {
  const listar = useServerFn(listarCategoriasServicos);
  const salvar = useServerFn(salvarCategoriaServico);
  const query = useQuery({
    queryKey: ["categorias-servicos"],
    queryFn: () => listar(),
  });

  const [editor, setEditor] = useState<RascunhoCategoria | null>(null);
  const [original, setOriginal] = useState("");
  const [estado, setEstado] = useState<"pronto" | "salvando" | "salvo">("pronto");
  const [erro, setErro] = useState<string | null>(null);

  function abrirNova() {
    setEditor({ id: null, nomeAnterior: null, nome: "", cor: "roxo", ordem: 100 });
    setOriginal("");
    setErro(null);
    setEstado("pronto");
  }

  function abrirEdicao(categoria: CategoriaDeServico) {
    if (categoria.sistema || !query.data?.persistenciaDisponivel) return;
    const rascunho: RascunhoCategoria = {
      id: categoria.id,
      nomeAnterior: categoria.nome,
      nome: categoria.nome,
      cor: categoria.cor,
      ordem: categoria.ordem,
    };
    setEditor(rascunho);
    setOriginal(JSON.stringify(rascunho));
    setErro(null);
    setEstado("pronto");
  }

  function fecharEditor() {
    setEditor(null);
    setErro(null);
    setEstado("pronto");
  }

  async function salvarEditor() {
    if (!editor || estado === "salvando") return;
    const nome = editor.nome.trim();
    if (nome.length < 2) {
      setErro("Digite um nome com pelo menos 2 caracteres.");
      return;
    }
    if (nome.length > 40) {
      setErro("O nome pode ter no máximo 40 caracteres.");
      return;
    }
    if (!query.data?.persistenciaDisponivel) {
      setErro("A personalização de categorias ainda não foi ativada na prévia.");
      return;
    }

    setEstado("salvando");
    setErro(null);
    try {
      await salvar({
        data: {
          id: editor.id,
          nomeAnterior: editor.nomeAnterior,
          nome,
          cor: editor.cor,
          ordem: editor.ordem,
        },
      });
      await query.refetch();
      setEstado("salvo");
      await new Promise((resolver) => window.setTimeout(resolver, ESPERA_MS.sucessoDoBotao));
      fecharEditor();
    } catch (e) {
      setEstado("pronto");
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a categoria.");
    }
  }

  const categorias = query.data?.categorias ?? [];
  const rascunhoAlterado = editor ? JSON.stringify(editor) !== original : false;

  return (
    <>
      <Screen
        voltarPara="/barbeiro/servicos"
        title="Categorias"
        subtitle="Organize seus serviços em categorias."
      >
        {query.isLoading ? <EsqueletoFormulario campos={3} /> : null}

        {query.isError ? (
          <Aviso tom="acao" titulo="Não foi possível carregar as categorias">
            Confira sua conexão e tente abrir esta página novamente.
          </Aviso>
        ) : null}

        {query.data && !query.data.persistenciaDisponivel ? (
          <Aviso tom="atencao" titulo="Personalização aguardando ativação na prévia">
            As categorias atuais estão visíveis, mas criar ou personalizar nomes e cores só ficará disponível
            depois que a migração de categorias for ativada no banco de testes.
          </Aviso>
        ) : null}

        {!query.isLoading && !query.isError ? (
          <>
            <Button
              type="button"
              variant="primary"
              className="mb-5 mt-1 min-h-12 w-full"
              onClick={abrirNova}
              disabled={!query.data?.persistenciaDisponivel}
            >
              <Plus size={18} aria-hidden />
              Adicionar categoria
            </Button>

            {categorias.length ? (
              <Card density="none" className="overflow-hidden p-0">
                <ul className="divide-y divide-[var(--figaro-outline-variant,var(--line))]/30">
                  {categorias.map((categoria) => {
                    const quantidade =
                      categoria.quantidadeServicos === 0
                        ? "Sem serviços"
                        : categoria.quantidadeServicos === 1
                          ? "1 serviço"
                          : `${categoria.quantidadeServicos} serviços`;
                    const bloqueada = categoria.sistema || !query.data?.persistenciaDisponivel;
                    return (
                      <li key={categoria.id ?? `legada-${categoria.nome}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={bloqueada}
                          aria-label={categoria.sistema ? categoria.nome : `Editar categoria ${categoria.nome}`}
                          onClick={() => abrirEdicao(categoria)}
                          className="flex min-h-[72px] w-full items-center justify-between gap-3 rounded-none px-4 py-3 text-left"
                        >
                          <span
                            aria-hidden
                            className="size-5 shrink-0 rounded-full"
                            style={{ backgroundColor: cssDaCorCategoria(categoria.cor) }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-paper">
                              {categoria.nome}
                            </span>
                            <span className="mt-0.5 block text-xs text-mute">{quantidade}</span>
                          </span>
                          {categoria.sistema ? (
                            <LockKeyhole size={16} className="shrink-0 text-mute" aria-hidden />
                          ) : (
                            <ChevronRight size={18} className="shrink-0 text-mute" aria-hidden />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ) : (
              <Card density="default" className="text-center">
                <p className="font-semibold text-paper">Nenhuma categoria cadastrada</p>
                <p className="mt-2 text-sm text-mute">Adicione uma categoria para organizar os serviços.</p>
              </Card>
            )}
          </>
        ) : null}
      </Screen>

      {editor ? (
        <TelaDeFormulario
          titulo={editor.id || editor.nomeAnterior ? "Editar categoria" : "Nova categoria"}
          subtitulo="Dê um nome à categoria e escolha uma cor."
          sujo={rascunhoAlterado || (!editor.id && editor.nome.trim().length > 0)}
          onFechar={fecharEditor}
          acao={{
            rotulo: "Salvar",
            onClick: () => void salvarEditor(),
            desabilitada:
              estado === "salvando" ||
              editor.nome.trim().length < 2 ||
              !query.data?.persistenciaDisponivel,
            carregando: estado === "salvando",
            sucesso: estado === "salvo",
            morfo: true,
            flutuante: { icone: "visto" },
          }}
        >
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold text-mute">Detalhes da categoria</p>
              <label className="block text-xs text-mute">
                Nome
                <Input
                  autoFocus
                  value={editor.nome}
                  maxLength={40}
                  onChange={(event) => {
                    setEditor((atual) => atual ? { ...atual, nome: event.target.value } : atual);
                    setErro(null);
                  }}
                  placeholder="Ex.: Cortes"
                  className="field-control mt-1 min-h-12 rounded-lg px-3 text-sm"
                  aria-label="Nome da categoria"
                />
              </label>
              <p className="mt-1 text-right text-xs text-mute2">{editor.nome.length}/40</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-mute">Cor</p>
              <PaletaCategoria
                value={editor.cor}
                onChange={(cor) => setEditor((atual) => atual ? { ...atual, cor } : atual)}
                disabled={!query.data?.persistenciaDisponivel || estado === "salvando"}
              />
            </div>
            {erro ? (
              <Aviso tom="acao" titulo="Não foi possível salvar">{erro}</Aviso>
            ) : null}
          </div>
        </TelaDeFormulario>
      ) : null}
    </>
  );
}
