import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, Pencil, Plus } from "lucide-react";

import { Screen } from "@/components/layout/Screen";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { EditorDeServicos, type ServicoEditavel } from "@/components/onboarding/EditorDeServicos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirmar } from "@/components/ui/useConfirmar";
import {
  getConfiguracaoInicial,
  removerServico,
  salvarServicos,
  type ConfiguracaoInicial,
} from "@/lib/onboarding.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/barbeiro/servicos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Serviços — Painel do negócio | Cortaí" },
      { name: "description", content: "Defina serviços, duração e preços do seu negócio." },
      { property: "og:title", content: "Serviços — Cortaí" },
      { property: "og:description", content: "Cortes, duração e preços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ServicosPage,
});

function mapearServicos(config: ConfiguracaoInicial): ServicoEditavel[] {
  return config.servicos
    .filter((servico) => servico.ativo)
    .map((servico) => ({
      id: servico.id,
      nome: servico.nome,
      categoria: servico.categoria,
      duracaoMin: servico.duracaoMin,
      precoCentavos: servico.precoCentavos,
      profissionalIds: servico.profissionalIds,
      retornoDias: servico.retornoDias,
      fotoUrl: servico.fotoUrl,
    }));
}

function ServicosPage() {
  const salvar = useServerFn(salvarServicos);
  const remover = useServerFn(removerServico);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["configuracao-inicial"],
    queryFn: () => getConfiguracaoInicial(),
  });
  const [servicos, setServicos] = useState<ServicoEditavel[]>([]);
  const [iniciado, setIniciado] = useState(false);
  const [estado, setEstado] = useState<"pronto" | "salvando" | "salvo">("pronto");
  const [erro, setErro] = useState<string | null>(null);
  const [modoEditor, setModoEditor] = useState<"novo" | "existente" | null>(null);
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<ServicoEditavel[]>([]);
  const [rascunhoOriginal, setRascunhoOriginal] = useState("");
  const [confirmar, dialogoConfirmar] = useConfirmar();

  useEffect(() => {
    if (!data || iniciado) return;
    setServicos(mapearServicos(data));
    setIniciado(true);
  }, [data, iniciado]);

  function abrirServico(indice: number) {
    const servico = servicos[indice];
    if (!servico) return;
    const copia = [{ ...servico }];
    setIdEditando(servico.id ?? null);
    setRascunho(copia);
    setRascunhoOriginal(JSON.stringify(copia));
    setModoEditor("existente");
    setEstado("pronto");
    setErro(null);
  }

  function novoServico() {
    const copia: ServicoEditavel[] = [
      { nome: "", categoria: "Serviço", duracaoMin: 30, precoCentavos: 3500 },
    ];
    setIdEditando(null);
    setRascunho(copia);
    setRascunhoOriginal(JSON.stringify(copia));
    setModoEditor("novo");
    setEstado("pronto");
    setErro(null);
  }

  async function voltarParaLista() {
    if (JSON.stringify(rascunho) !== rascunhoOriginal) {
      const sair = await confirmar({
        titulo: "Descartar alterações?",
        descricao: "As alterações deste serviço ainda não foram salvas.",
        confirmar: "Descartar",
        cancelar: "Continuar editando",
        destrutivo: true,
      });
      if (!sair) return;
    }
    setModoEditor(null);
    setIdEditando(null);
    setRascunho([]);
    setErro(null);
    setEstado("pronto");
  }

  function alterarRascunho(proximo: ServicoEditavel[]) {
    if (
      modoEditor === "existente" &&
      proximo.length === 0 &&
      servicos.filter((servico) => servico.nome.trim().length >= 2).length <= 1
    ) {
      setErro("Mantenha pelo menos um serviço ativo. Cadastre outro antes de remover este.");
      return;
    }
    setRascunho(proximo);
    setErro(null);
  }

  async function salvarEditor() {
    if (estado === "salvando") return;
    const originais = [...servicos];
    const original = idEditando ? originais.find((servico) => servico.id === idEditando) : null;

    if (modoEditor === "existente" && original && rascunho.length === 0) {
      if (originais.filter((servico) => servico.nome.trim().length >= 2).length <= 1) {
        setErro("Mantenha pelo menos um serviço ativo.");
        return;
      }
      setEstado("salvando");
      setErro(null);
      try {
        await remover({ data: { id: original.id! } });
        const atualizados = originais.filter((servico) => servico.id !== original.id);
        setServicos(atualizados);
        setModoEditor(null);
        setIdEditando(null);
        setRascunho([]);
        setEstado("salvo");
        return;
      } catch (e) {
        setEstado("pronto");
        setErro(e instanceof Error ? e.message : "Não foi possível remover o serviço.");
        return;
      }
    }

    const validosDoRascunho = rascunho.filter((servico) => servico.nome.trim().length >= 2);
    if (validosDoRascunho.length === 0) {
      setErro("Informe o nome do serviço antes de salvar.");
      return;
    }

    let merged: ServicoEditavel[];
    let removerOriginalDepois = false;
    if (modoEditor === "novo") {
      merged = [...originais, ...validosDoRascunho];
    } else if (original) {
      const editado = validosDoRascunho.find((servico) => servico.id === original.id);
      if (editado) {
        merged = originais.map((servico) => (servico.id === original.id ? editado : servico));
        merged.push(...validosDoRascunho.filter((servico) => servico.id !== original.id));
      } else {
        merged = [...originais.filter((servico) => servico.id !== original.id), ...validosDoRascunho];
        removerOriginalDepois = true;
      }
    } else {
      setErro("Não encontrei o serviço que você estava editando. Volte à lista e tente de novo.");
      return;
    }

    const validos = merged.filter((servico) => servico.nome.trim().length >= 2);
    if (!validos.length) {
      setErro("O catálogo precisa manter pelo menos um serviço.");
      return;
    }

    setEstado("salvando");
    setErro(null);
    try {
      await salvar({
        data: {
          servicos: validos.map((servico) => ({
            ...(servico.id ? { id: servico.id } : {}),
            nome: servico.nome.trim(),
            duracaoMin: servico.duracaoMin,
            precoCentavos: servico.precoCentavos,
            categoria: servico.categoria,
            ...(servico.profissionalIds !== undefined
              ? { profissionalIds: servico.profissionalIds }
              : {}),
            ...(servico.retornoDias !== undefined ? { retornoDias: servico.retornoDias } : {}),
            ...(servico.fotoUrl !== undefined ? { fotoUrl: servico.fotoUrl } : {}),
          })),
        },
      });
      if (removerOriginalDepois && original?.id) await remover({ data: { id: original.id } });
      const atualizado = await refetch();
      if (atualizado.data) setServicos(mapearServicos(atualizado.data));
      else setServicos(validos);
      setModoEditor(null);
      setIdEditando(null);
      setRascunho([]);
      setRascunhoOriginal("");
      setEstado("salvo");
    } catch (e) {
      setEstado("pronto");
      setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
    }
  }

  const podeSalvar = modoEditor === "existente" && rascunho.length === 0
    ? servicos.filter((servico) => servico.nome.trim().length >= 2).length > 1
    : rascunho.some((servico) => servico.nome.trim().length >= 2);

  return (
    <Screen
      voltarPara={modoEditor ? undefined : "/barbeiro/mais"}
      title="Serviços"
      subtitle={modoEditor ? "Edite um serviço por vez, sem perder o restante do catálogo." : "Seus serviços, duração e preços."}
    >
      {isLoading ? <EsqueletoFormulario campos={4} onTentarDeNovo={() => void refetch()} /> : null}

      {modoEditor ? (
        <>
          <Button
            variant="ghost"
            type="button"
            className="mb-4 min-h-12 rounded-full px-3"
            onClick={() => void voltarParaLista()}
          >
            <ArrowLeft size={18} aria-hidden />
            Voltar aos serviços
          </Button>
          <EditorDeServicos
            servicos={rascunho}
            onChange={alterarRascunho}
            segmento={data?.tenant.segmento ?? "outro"}
            apenasUm
            semSugestoes
          />
          <Button
            variant="primary"
            type="button"
            className="mt-6 min-h-12 w-full"
            disabled={estado === "salvando" || !podeSalvar}
            onClick={() => void salvarEditor()}
          >
            {estado === "salvando"
              ? "Salvando…"
              : modoEditor === "existente" && rascunho.length === 0
                ? "Remover serviço"
                : "Salvar serviço"}
          </Button>
        </>
      ) : (
        <>
          {!isLoading && servicos.length ? (
            <ul className="space-y-3">
              {servicos.map((servico, indice) => (
                <li key={servico.id ?? "servico-" + indice}>
                  <Card variant="touchable" density="none" className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink3 text-gold">
                        <Clock3 size={19} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-paper">{servico.nome}</p>
                        <p className="mt-1 text-xs text-mute">{servico.categoria || "Serviço"}</p>
                        <p className="mt-2 text-sm text-mute">
                          {servico.duracaoMin} min <span aria-hidden>·</span> {brl(servico.precoCentavos)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        type="button"
                        aria-label={"Editar " + servico.nome}
                        className="min-h-12 shrink-0 rounded-full px-3"
                        onClick={() => abrirServico(indice)}
                      >
                        <Pencil size={16} aria-hidden />
                        Editar
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : !isLoading ? (
            <Card density="default" className="text-center">
              <p className="font-semibold text-paper">Nenhum serviço cadastrado</p>
              <p className="mt-2 text-sm text-mute">Adicione o primeiro serviço para abrir seu catálogo.</p>
            </Card>
          ) : null}

          {!isLoading ? (
            <Button
              variant="primary"
              type="button"
              className="mt-5 min-h-12 w-full"
              onClick={novoServico}
            >
              <Plus size={18} aria-hidden />
              Novo serviço
            </Button>
          ) : null}
          {estado === "salvo" ? (
            <p className="mt-3 text-center text-sm text-mute" role="status">
              Alterações salvas.
            </p>
          ) : null}
        </>
      )}

      {erro ? (
        <p className="mt-3 text-sm text-brick" role="alert">
          {erro}
        </p>
      ) : null}
      {dialogoConfirmar}
    </Screen>
  );
}
