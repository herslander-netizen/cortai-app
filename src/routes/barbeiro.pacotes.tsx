import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Package, Percent, Plus } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { Campo } from "@/components/marca/editor/campos";
import { LinhaComSwitch } from "@/components/marca/editor/secoes/pecas";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { aviso } from "@/lib/avisos";
import { brl } from "@/lib/format";
import {
  centavosParaReais,
  economiaDoPacote,
  reaisParaCentavos,
  validadeEmTexto,
  type PacoteDoNegocio,
  type TipoDePacote,
} from "@/lib/pacotes";
import { getPacotes, salvarPacote } from "@/lib/pacotes.functions";

export const Route = createFileRoute("/barbeiro/pacotes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pacotes e combos — Painel do negócio | Flow" },
      {
        name: "description",
        content: "Pacotes de várias visitas e combos de serviços com desconto.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PacotesPage,
});

type Rascunho = {
  id?: string;
  tipo: TipoDePacote;
  nome: string;
  descricao: string;
  preco: string;
  validade: string;
  destaque: boolean;
  ativo: boolean;
  itens: Record<string, number>;
};

const NOVO = (tipo: TipoDePacote): Rascunho => ({
  tipo,
  nome: "",
  descricao: "",
  preco: "",
  validade: tipo === "pacote" ? "30" : "",
  destaque: false,
  ativo: true,
  itens: {},
});

function resumo(p: PacoteDoNegocio) {
  const itens = p.itens
    .map((i) => (p.tipo === "pacote" ? `${i.quantidade}× ${i.nome}` : i.nome))
    .join(", ");
  const validade = validadeEmTexto(p.validadeDias);
  return [brl(p.precoCentavos), itens, validade ? `válido por ${validade}` : null]
    .filter(Boolean)
    .join(" · ");
}

function PacotesPage() {
  const queryClient = useQueryClient();
  const salvar = useServerFn(salvarPacote);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pacotes"],
    queryFn: () => getPacotes(),
    retry: false,
  });
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const servicos = data?.servicos ?? [];
  const pacotes = (data?.pacotes ?? []).filter((p) => p.tipo === "pacote");
  const combos = (data?.pacotes ?? []).filter((p) => p.tipo === "combo");

  const abrir = (p: PacoteDoNegocio) => {
    setErro(null);
    setRascunho({
      id: p.id,
      tipo: p.tipo,
      nome: p.nome,
      descricao: p.descricao ?? "",
      preco: centavosParaReais(p.precoCentavos),
      validade: p.validadeDias ? String(p.validadeDias) : "",
      destaque: p.destaque,
      ativo: p.ativo,
      itens: Object.fromEntries(p.itens.map((i) => [i.servicoId, i.quantidade])),
    });
  };

  const selecionados = rascunho ? servicos.filter((s) => (rascunho.itens[s.id] ?? 0) > 0) : [];
  const centavos = rascunho ? reaisParaCentavos(rascunho.preco) : null;
  const separado = selecionados.reduce(
    (total, s) => total + s.preco_centavos * (rascunho?.itens[s.id] ?? 0),
    0,
  );
  const problema = !rascunho
    ? null
    : rascunho.nome.trim().length < 2
      ? "Dê um nome ao pacote."
      : selecionados.length === 0
        ? "Escolha pelo menos um serviço."
        : centavos === null
          ? "Informe o preço."
          : null;

  const gravar = async () => {
    if (!rascunho || problema || centavos === null) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvar({
        data: {
          ...(rascunho.id ? { id: rascunho.id } : {}),
          tipo: rascunho.tipo,
          nome: rascunho.nome.trim(),
          descricao: rascunho.descricao.trim() || null,
          precoCentavos: centavos,
          validadeDias:
            rascunho.tipo === "pacote" && Number(rascunho.validade) > 0
              ? Math.min(730, Math.round(Number(rascunho.validade)))
              : null,
          destaque: rascunho.destaque,
          ativo: rascunho.ativo,
          itens: selecionados.map((s) => ({
            servicoId: s.id,
            quantidade: rascunho.tipo === "combo" ? 1 : (rascunho.itens[s.id] ?? 1),
          })),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["pacotes"] });
      aviso.ok(
        rascunho.id ? "Alterações salvas." : "Criado. Aparece na página quando estiver ativo.",
      );
      setRascunho(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Screen
      voltarPara="/barbeiro/marca"
      title="Pacotes e combos"
      subtitle="Pacotes têm várias visitas e prazo; combos juntam serviços na mesma visita. Só os ativos aparecem na página."
    >
      {isLoading ? <EsqueletoFormulario campos={4} /> : null}
      {isError ? (
        <div className="space-y-3">
          <Aviso tom="acao" titulo="Não foi possível carregar">
            Confira a conexão e tente de novo. Nada foi alterado.
          </Aviso>
          <Button variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {data && !data.disponivel ? (
        <Aviso tom="info" titulo="Pacotes ainda não estão liberados">
          Esta função será liberada em breve para o seu negócio. Quando chegar, é aqui que você cria
          os pacotes e combos.
        </Aviso>
      ) : null}
      {data?.disponivel ? (
        <div className="space-y-4 pb-8">
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={servicos.length === 0}
              onClick={() => {
                setErro(null);
                setRascunho(NOVO("pacote"));
              }}
            >
              <Plus aria-hidden /> Novo pacote
            </Button>
            <Button
              variant="outline"
              disabled={servicos.length === 0}
              onClick={() => {
                setErro(null);
                setRascunho(NOVO("combo"));
              }}
            >
              <Plus aria-hidden /> Novo combo
            </Button>
          </div>
          {servicos.length === 0 ? (
            <Aviso tom="atencao" titulo="Cadastre serviços primeiro">
              Pacotes e combos usam os serviços do seu negócio.
            </Aviso>
          ) : null}
          {(
            [
              ["Pacotes", pacotes, Package],
              ["Combos", combos, Percent],
            ] as const
          ).map(([titulo, lista, Icone]) => (
            <section key={titulo} aria-label={titulo} className="space-y-2">
              <h3 className="px-2 text-sm font-medium text-mute">{titulo}</h3>
              {lista.length ? (
                <GrupoDeLinhas>
                  {lista.map((p) => (
                    <LinhaDeConfiguracao
                      key={p.id}
                      icone={Icone}
                      titulo={p.nome}
                      suporte={resumo(p)}
                      fim={p.ativo ? (p.destaque ? "Mais vendido" : null) : "Inativo"}
                      aoTocar={() => abrir(p)}
                    />
                  ))}
                </GrupoDeLinhas>
              ) : (
                <p className="px-2 text-sm text-mute">Nenhum por aqui ainda.</p>
              )}
            </section>
          ))}
        </div>
      ) : null}

      <Sheet open={rascunho !== null} onOpenChange={(aberto) => !aberto && setRascunho(null)}>
        <SheetContent side="bottom" className="rounded-t-[28px]">
          {rascunho ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  {rascunho.id ? "Editar" : "Novo"} {rascunho.tipo}
                </SheetTitle>
                <SheetDescription>
                  {rascunho.tipo === "pacote"
                    ? "Várias visitas pelo preço combinado, dentro do prazo."
                    : "Serviços feitos juntos, na mesma visita, com desconto."}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <OpcoesConectadas
                  rotulo="Tipo"
                  valor={rascunho.tipo}
                  opcoes={[
                    { valor: "pacote", texto: "Pacote" },
                    { valor: "combo", texto: "Combo" },
                  ]}
                  onChange={(tipo) =>
                    setRascunho({
                      ...rascunho,
                      tipo,
                      validade: tipo === "pacote" ? rascunho.validade || "30" : "",
                    })
                  }
                />
                <Campo
                  label="Nome"
                  value={rascunho.nome}
                  placeholder={rascunho.tipo === "pacote" ? "Corte mensal" : "Corte + Barba"}
                  onChange={(nome) => setRascunho({ ...rascunho, nome: nome.slice(0, 80) })}
                />
                <Field label="Serviços incluídos">
                  <ul className="mt-2 space-y-1">
                    {servicos.map((s) => {
                      const quantidade = rascunho.itens[s.id] ?? 0;
                      return (
                        <li
                          key={s.id}
                          className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-1"
                        >
                          <input
                            type="checkbox"
                            aria-label={`Incluir ${s.nome}`}
                            checked={quantidade > 0}
                            onChange={(ev) =>
                              setRascunho({
                                ...rascunho,
                                itens: { ...rascunho.itens, [s.id]: ev.target.checked ? 1 : 0 },
                              })
                            }
                          />
                          <span className="min-w-0 flex-1 text-sm text-paper">
                            {s.nome}
                            <span className="block text-xs text-mute">{brl(s.preco_centavos)}</span>
                          </span>
                          {rascunho.tipo === "pacote" && quantidade > 0 ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={50}
                              aria-label={`Quantidade de ${s.nome}`}
                              className="field-control w-20 text-center"
                              value={quantidade}
                              onChange={(ev) =>
                                setRascunho({
                                  ...rascunho,
                                  itens: {
                                    ...rascunho.itens,
                                    [s.id]: Math.max(1, Math.min(50, Number(ev.target.value) || 1)),
                                  },
                                })
                              }
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </Field>
                <Campo
                  label="Preço do conjunto (R$)"
                  value={rascunho.preco}
                  placeholder="170,00"
                  onChange={(preco) => setRascunho({ ...rascunho, preco })}
                />
                {separado > 0 && centavos !== null ? (
                  <p className="text-sm text-mute" aria-live="polite">
                    Separado: {brl(separado)}.{" "}
                    {economiaDoPacote({
                      precoCentavos: centavos,
                      itens: selecionados.map((s) => ({
                        quantidade: rascunho.itens[s.id] ?? 1,
                        precoCentavos: s.preco_centavos,
                      })),
                    }).centavos > 0
                      ? `O cliente economiza ${brl(separado - centavos)}.`
                      : "Sem desconto sobre o preço avulso."}
                  </p>
                ) : null}
                {rascunho.tipo === "pacote" ? (
                  <Campo
                    label="Validade (dias)"
                    value={rascunho.validade}
                    placeholder="30"
                    onChange={(validade) =>
                      setRascunho({
                        ...rascunho,
                        validade: validade.replace(/\D/g, "").slice(0, 3),
                      })
                    }
                  />
                ) : null}
                <Field label="Descrição (opcional)">
                  <Textarea
                    className="mt-2 min-h-20"
                    maxLength={300}
                    value={rascunho.descricao}
                    onChange={(ev) => setRascunho({ ...rascunho, descricao: ev.target.value })}
                  />
                </Field>
                <LinhaComSwitch
                  rotulo="Ativo na página"
                  marcado={rascunho.ativo}
                  onChange={(ativo) => setRascunho({ ...rascunho, ativo })}
                />
                <LinhaComSwitch
                  rotulo="Marcar como mais vendido"
                  marcado={rascunho.destaque}
                  onChange={(destaque) => setRascunho({ ...rascunho, destaque })}
                />
                {erro ? (
                  <p role="alert" className="text-sm text-brick">
                    {erro}
                  </p>
                ) : problema ? (
                  <p className="text-sm text-mute">{problema}</p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setRascunho(null)}>
                    Cancelar
                  </Button>
                  <Button
                    loading={salvando}
                    disabled={Boolean(problema)}
                    onClick={() => void gravar()}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
