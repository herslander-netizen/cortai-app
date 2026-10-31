import { ConteudoDoTicket } from "@/components/comanda/FolhaDoTicket";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidarComandas, ROTULO_DA_ETAPA_EQUIPE } from "@/lib/comanda-ticket";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mascaraTelefone } from "@/lib/previa";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  CalendarPlus,
  Check,
  Copy,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  Send,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StatusBadge } from "@/components/ui/badge";
import { FotoDoCorte } from "@/components/cliente-perfil/FotoDoCorte";
import { brl, hora } from "@/lib/format";
import { EsqueletoComanda } from "@/components/layout/Esqueleto";
import {
  criarRetorno,
  enviarParaRecepcao,
  getFechamentoComanda,
  getSugestaoRetorno,
  identificarClienteAvulso,
  pagarComanda,
  pagarComPlano,
  salvarComanda,
} from "@/lib/financeiro.functions";

type Item = {
  tipo: "servico" | "produto";
  id: string;
  descricao: string;
  quantidade: number;
  valor_unitario_centavos: number;
  percentual: number;
};
type DadosFechamento = Awaited<ReturnType<typeof getFechamentoComanda>>;
type ItemSalvo = DadosFechamento["itens"][number];
type ServicoDoCatalogo = DadosFechamento["servicos"][number];
type ProdutoDoCatalogo = DadosFechamento["produtos"][number];
type RegistroDoCatalogo = (ServicoDoCatalogo | ProdutoDoCatalogo) & {
  comissao_percentual?: number | string | null;
};
type Forma = "pix" | "dinheiro" | "cartao" | "fiado";

function dataRetorno(iso: string, fuso: string) {
  const d = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
    .format(d)
    .replace(".", "");
  const h = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${dia} às ${h}`;
}

export function FechamentoComanda({
  agendamentoId,
  onFechar,
  onConcluido,
}: {
  agendamentoId: string;
  onFechar: () => void;
  onConcluido: () => void;
}) {
  const queryClient = useQueryClient();
  const buscar = useServerFn(getFechamentoComanda);
  const salvar = useServerFn(salvarComanda);
  const pagar = useServerFn(pagarComanda);
  const identificar = useServerFn(identificarClienteAvulso);
  const enviar = useServerFn(enviarParaRecepcao);
  const pagarPlano = useServerFn(pagarComPlano);
  const sugerir = useServerFn(getSugestaoRetorno);
  const marcar = useServerFn(criarRetorno);
  // Como no Figaro (vídeo do dono, 31/10): "itens" é o checkout (revisar a conta) e "forma" é escolher a forma e
  // confirmar. Antes um toque no botão da forma já registrava o pagamento.
  const [etapa, setEtapa] = useState<"itens" | "forma" | "pix" | "retorno">("itens");
  const [forma, setForma] = useState<Forma | "plano" | null>(null);
  const [recebido, setRecebido] = useState("");
  const [adicionando, setAdicionando] = useState<"servico" | "produto" | null>(null);
  const query = useQuery({
    queryKey: ["fechamento-comanda", agendamentoId],
    queryFn: () => buscar({ data: { agendamentoId } }),
    staleTime: 0,
    // Enquanto aguarda o Pix, acompanha o "Já paguei" do cliente na mesma comanda.
    refetchInterval: etapa === "pix" ? 15_000 : false,
  });
  const [confirmarAberto, setConfirmarAberto] = useState(false);
  const [itens, setItens] = useState<Item[]>([]);
  const [desconto, setDesconto] = useState("");
  const [verDesconto, setVerDesconto] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [retorno, setRetorno] = useState<{ inicio: string; fuso: string; cliente: string } | null>(
    null,
  );
  const [retornoFeito, setRetornoFeito] = useState(false);
  const [verTicket, setVerTicket] = useState(false);

  useEffect(() => {
    if (!query.data || itens.length) return;
    setItens(
      query.data.itens.map((i: ItemSalvo) => ({
        tipo: i.tipo as Item["tipo"],
        id: (i.servico_id ?? i.produto_id) as string,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario_centavos: i.valor_unitario_centavos,
        percentual: Number(i.comissao_percentual),
      })),
    );
  }, [query.data, itens.length]);
  const subtotal = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * i.valor_unitario_centavos, 0),
    [itens],
  );
  const descontoCentavos = Math.min(subtotal, Math.max(0, Math.round(Number(desconto || 0) * 100)));
  const total = subtotal - descontoCentavos;
  const d = query.data;
  const comandaId = d?.comanda.id;
  const statusComanda = (d?.comanda as { status?: string } | undefined)?.status ?? "";
  const formaEscolhida = (d?.comanda as { forma_escolhida?: string | null } | undefined)
    ?.forma_escolhida;
  const pixInformado = statusComanda === "aguardando_confirmacao_pix";
  // Comanda reaberta já aguardando Pix: volta direto para a conferência, sem refazer a escolha.
  useEffect(() => {
    if (etapa !== "itens" && etapa !== "forma") return;
    if (pixInformado || (statusComanda === "aguardando_pagamento" && formaEscolhida === "pix"))
      setEtapa("pix");
  }, [etapa, pixInformado, statusComanda, formaEscolhida]);

  function alterar(index: number, delta: number) {
    setItens((lista) =>
      lista
        .map((item, i) =>
          i === index ? { ...item, quantidade: Math.max(0, item.quantidade + delta) } : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  }
  function adicionar(tipo: "servico" | "produto", id: string) {
    const fonte = tipo === "servico" ? d?.servicos : d?.produtos;
    const registro = (fonte as RegistroDoCatalogo[] | undefined)?.find((x) => x.id === id);
    if (!registro) return;
    setItens((lista) => {
      const idx = lista.findIndex((i) => i.tipo === tipo && i.id === id);
      if (idx >= 0)
        return lista.map((i, n) => (n === idx ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [
        ...lista,
        {
          tipo,
          id,
          descricao: registro.nome,
          quantidade: 1,
          valor_unitario_centavos: registro.preco_centavos,
          percentual: Number(
            registro.comissao_percentual ??
              (tipo === "servico"
                ? (d?.config?.comissao_servico_percentual ?? 50)
                : (d?.config?.comissao_produto_percentual ?? 10)),
          ),
        },
      ];
    });
  }
  const payload = () => ({
    comandaId: comandaId!,
    itens: itens.map(({ tipo, id, quantidade, valor_unitario_centavos }) => ({
      tipo,
      id,
      quantidade,
      valor_unitario_centavos,
    })),
    descontoCentavos,
  });

  async function executar(chave: string, acao: () => Promise<void>) {
    if (!comandaId || !itens.length || ocupado) return;
    setOcupado(chave);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setOcupado(null);
      // Salvar/pagar mudam o mesmo ticket: lista e ticket abertos se atualizam sozinhos.
      invalidarComandas(queryClient);
    }
  }
  async function aposPagar() {
    try {
      const s = await sugerir({ data: { comandaId: comandaId! } });
      if (s) setRetorno(s);
    } catch {
      /* sugestão é opcional */
    }
    setEtapa("retorno");
  }
  const receber = (forma: Forma) =>
    executar(forma, async () => {
      await salvar({ data: payload() });
      const pixConfigurado = Boolean(d?.config?.pix_ativo && d.config.pix_chave);
      if (forma === "pix" && pixConfigurado) {
        await pagar({ data: { comandaId: comandaId!, forma, prepararPix: true } });
        setEtapa("pix");
        return;
      }
      await pagar({ data: { comandaId: comandaId!, forma, prepararPix: false } });
      await aposPagar();
    });
  const usarPlano = () =>
    executar("plano", async () => {
      await salvar({ data: payload() });
      await pagarPlano({ data: { comandaId: comandaId! } });
      await aposPagar();
    });
  const paraRecepcao = () =>
    executar("recepcao", async () => {
      await enviar({ data: payload() });
      onConcluido();
    });
  const confirmarPix = () =>
    executar("confirmar", async () => {
      await pagar({ data: { comandaId: comandaId!, forma: "pix", prepararPix: false } });
      await aposPagar();
    });
  const marcarRetorno = () =>
    executar("retorno", async () => {
      await marcar({ data: { comandaId: comandaId!, inicio: retorno!.inicio } });
      setRetornoFeito(true);
      window.setTimeout(onConcluido, 900);
    });

  const qtdServicos = itens
    .filter((i) => i.tipo === "servico")
    .reduce((s, i) => s + i.quantidade, 0);
  const temProduto = itens.some((i) => i.tipo === "produto");
  const planoDisponivel = Boolean(
    d &&
    !temProduto &&
    qtdServicos > 0 &&
    d.plano.creditos + (d.plano.reservado ? 1 : 0) >= qtdServicos,
  );
  const fiadoDisponivel = Boolean(d && d.fiadoDisponivel > 0 && d.fiadoDisponivel >= total);
  const atalhos = (d?.maisVendidos ?? [])
    .map((id: string) => d?.produtos.find((p: ProdutoDoCatalogo) => p.id === id))
    .filter((p): p is ProdutoDoCatalogo => Boolean(p));
  const mensagem = d
    ? `Olá! Segue o comprovante Pix de ${d.comanda.clientes?.nome ?? "cliente"}, ${itens.map((i) => i.descricao).join(" + ")}, ${d.comanda.agendamentos?.inicio ? `${hora(d.comanda.agendamentos.inicio)}, ` : ""}${brl(total)}, comanda #${d.comanda.numero}.`
    : "";
  const formas: Array<{
    v: Forma | "plano";
    rotulo: string;
    Icone: typeof Banknote;
    detalhe?: string;
  }> = [
    ...(planoDisponivel
      ? [
          {
            v: "plano" as const,
            rotulo: "Plano do cliente",
            Icone: Ticket,
            detalhe: "Usa os créditos do plano",
          },
        ]
      : []),
    { v: "dinheiro", rotulo: "Dinheiro", Icone: Banknote },
    { v: "pix", rotulo: "Pix", Icone: QrCode },
    { v: "cartao", rotulo: "Cartão", Icone: CreditCard },
    ...(fiadoDisponivel ? [{ v: "fiado" as const, rotulo: "Fiado", Icone: Wallet }] : []),
  ];
  const recebidoCentavos = Math.round(Number(recebido.replace(",", ".") || 0) * 100);
  const troco = forma === "dinheiro" && recebidoCentavos > total ? recebidoCentavos - total : 0;
  const confirmarForma = () => {
    if (forma === "plano") void usarPlano();
    else if (forma) void receber(forma);
  };
  const iniciais = (nome: string | undefined) =>
    (nome ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("");
  /** Linhas agrupadas do Figaro: 20 px nas pontas do grupo, 4 px no meio. */
  const forma_da_linha = (i: number, total_: number) =>
    total_ <= 1
      ? "rounded-[20px]"
      : i === 0
        ? "rounded-t-[20px] rounded-b-[4px]"
        : i === total_ - 1
          ? "rounded-b-[20px] rounded-t-[4px]"
          : "rounded-[4px]";
  const cartao = "bg-[var(--figaro-card-tile,var(--ink2))]";
  const rotuloSecao = "mb-2 mt-5 px-1 text-[13px] font-semibold text-mute";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-[rgb(0_0_0/0.32)] pt-[env(safe-area-inset-top)] md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Fechar comanda"
    >
      <div className="max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-line bg-ink px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 md:max-w-xl md:rounded-xl">
        <div className="sticky -top-5 z-10 -mx-5 flex items-start justify-between gap-4 bg-ink px-5 pb-4 pt-5 -mt-5">
          {verTicket || etapa === "forma" ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={verTicket ? "Voltar para o pagamento" : "Voltar para o checkout"}
              onClick={() => (verTicket ? setVerTicket(false) : setEtapa("itens"))}
            >
              <ArrowLeft />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-paper">
              {etapa === "forma"
                ? "Pagamento"
                : etapa === "itens"
                  ? "Checkout"
                  : (d?.comanda.clientes?.nome ?? "Comanda")}
            </h2>
            <p className="text-xs text-mute">
              Comanda{d ? ` #${d.comanda.numero}` : ""}
              {etapa === "itens" || etapa === "forma"
                ? ""
                : ` · ${d?.comanda.profissionais?.nome ?? "Profissional"}`}
            </p>
          </div>
          {comandaId && (etapa === "itens" || etapa === "forma") && !verTicket ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ver comanda"
              onClick={() => setVerTicket(true)}
            >
              <FileText />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onFechar}>
            <X />
          </Button>
        </div>
        {query.isLoading ? <EsqueletoComanda onTentarDeNovo={() => void query.refetch()} /> : null}
        {query.error ? (
          <p className="py-6 text-sm text-paper" role="alert">
            {(query.error as Error).message}
          </p>
        ) : null}

        {d && etapa === "itens" && !verTicket ? (
          <>
            {d.comanda.clientes?.telefone === "avulso" ? (
              <IdentificarAvulso
                comandaId={d.comanda.id}
                numero={d.comanda.numero}
                onSalvar={async (nome, telefone) => {
                  await identificar({ data: { comandaId: d.comanda.id, nome, telefone } });
                  await query.refetch();
                }}
              />
            ) : (
              <>
                <p className={rotuloSecao}>Cliente</p>
                <div
                  className={`flex min-h-14 items-center gap-3 px-4 py-2 ${cartao} rounded-[20px]`}
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-sm font-semibold text-paper"
                  >
                    {iniciais(d.comanda.clientes?.nome)}
                  </span>
                  <span className="truncate text-[15px] font-medium text-paper">
                    {d.comanda.clientes?.nome ?? "Cliente"}
                  </span>
                </div>
              </>
            )}

            <p className={rotuloSecao}>Itens</p>
            <ul className="grid gap-[2px]">
              {itens.map((item, index) => (
                <li
                  key={`${item.tipo}-${item.id}`}
                  className={`grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 ${cartao} ${forma_da_linha(index, itens.length)}`}
                >
                  <span
                    aria-hidden
                    className="grid size-9 place-items-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))] text-xs font-semibold text-paper"
                  >
                    {item.tipo === "servico"
                      ? iniciais(d.comanda.profissionais?.nome)
                      : iniciais(item.descricao)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-paper">
                      {item.descricao}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-mute">
                      {item.tipo === "servico"
                        ? (d.comanda.profissionais?.nome ?? "Serviço")
                        : "Produto"}
                      {item.quantidade > 1
                        ? ` · ${item.quantidade}× ${brl(item.valor_unitario_centavos)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="money-value text-[15px] font-semibold text-paper">
                      {brl(item.quantidade * item.valor_unitario_centavos)}
                    </span>
                    <span className="flex items-center rounded-full bg-[var(--figaro-surface-container-highest,var(--ink3))]">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-full [&_svg]:size-3.5"
                        aria-label={`Remover um ${item.descricao}`}
                        onClick={() => alterar(index, -1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-5 text-center text-xs font-semibold tabular-nums text-paper">
                        {item.quantidade}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-full [&_svg]:size-3.5"
                        aria-label={`Adicionar um ${item.descricao}`}
                        onClick={() => alterar(index, 1)}
                      >
                        <Plus />
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["servico", "produto"] as const).map((tipo) => (
                <Button
                  key={tipo}
                  type="button"
                  size="sm"
                  aria-expanded={adicionando === tipo}
                  aria-label={tipo === "servico" ? "Adicionar serviço" : "Adicionar produto"}
                  onClick={() => setAdicionando((a) => (a === tipo ? null : tipo))}
                  className="rounded-full bg-[var(--figaro-primary-container,var(--ink3))] text-[var(--figaro-on-primary-container,var(--paper))] hover:brightness-105"
                >
                  <Plus aria-hidden />
                  {tipo === "servico" ? "Serviço" : "Produto"}
                </Button>
              ))}
            </div>
            {adicionando ? (
              <ul className="mt-2 grid max-h-64 gap-[2px] overflow-y-auto">
                {(adicionando === "servico" ? d.servicos : d.produtos).map(
                  (x: ServicoDoCatalogo | ProdutoDoCatalogo, i: number, todos: unknown[]) => {
                    const semEstoque =
                      adicionando === "produto" &&
                      (x as ProdutoDoCatalogo).controla_estoque &&
                      (x as ProdutoDoCatalogo).quantidade < 1;
                    return (
                      <li key={x.id}>
                        <button
                          type="button"
                          disabled={semEstoque}
                          onClick={() => {
                            adicionar(adicionando, x.id);
                            setAdicionando(null);
                          }}
                          className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm text-paper disabled:opacity-40 ${cartao} ${forma_da_linha(i, todos.length)}`}
                        >
                          <span className="truncate">{x.nome}</span>
                          <span className="money-value shrink-0 text-mute">
                            {semEstoque ? "Sem estoque" : brl(x.preco_centavos)}
                          </span>
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            ) : null}
            {atalhos.length ? (
              <div className="mt-4">
                <p className="px-1 text-[13px] font-semibold text-mute">Mais vendidos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {atalhos.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={p.controla_estoque && p.quantidade < 1}
                      onClick={() => adicionar("produto", p.id)}
                      className="rounded-full"
                    >
                      <Plus aria-hidden />
                      {p.nome}
                      <span className="money-value text-xs text-mute">{brl(p.preco_centavos)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Rodapé do Figaro: valores e a ação principal em pílula, presos embaixo. */}
            <div className="sticky -bottom-[calc(1.25rem+env(safe-area-inset-bottom))] -mx-5 mt-6 border-t border-line bg-ink px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-baseline justify-between text-xs text-mute">
                <span>Valor dos itens</span>
                <span className="money-value">{brl(subtotal)}</span>
              </div>
              {verDesconto ? (
                <label className="mt-2 flex items-center justify-between gap-3 text-xs text-mute">
                  Desconto (R$)
                  <input
                    className="field-control h-10 max-w-[140px] text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    placeholder="0,00"
                    autoFocus
                  />
                </label>
              ) : (
                <div className="mt-1 flex items-baseline justify-between text-xs text-mute">
                  <span>Desconto sobre o total</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs text-primary"
                    onClick={() => setVerDesconto(true)}
                  >
                    Adicionar desconto
                  </Button>
                </div>
              )}
              {erro ? (
                <p className="mt-3 rounded-md bg-brick px-3 py-2 text-sm text-ink" role="alert">
                  {erro}
                </p>
              ) : null}
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-paper">Total a cobrar</span>
                <span className="money-value text-xl font-bold text-paper">{brl(total)}</span>
              </div>
              {d.podeReceber ? (
                <Button
                  size="lg"
                  className="mt-3 h-14 w-full rounded-full"
                  disabled={Boolean(ocupado) || !itens.length}
                  onClick={() => {
                    setErro(null);
                    setEtapa("forma");
                  }}
                >
                  <ArrowRight aria-hidden />
                  Escolher pagamento
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="mt-3 h-14 w-full rounded-full"
                    loading={ocupado === "recepcao"}
                    disabled={Boolean(ocupado) || !itens.length}
                    onClick={paraRecepcao}
                  >
                    <Send aria-hidden />
                    {ocupado === "recepcao" ? "Enviando…" : "Enviar para a recepção"}
                  </Button>
                  <p className="mt-2 text-center text-xs text-mute">
                    A comanda fica aguardando pagamento na recepção.
                  </p>
                </>
              )}
            </div>
          </>
        ) : null}

        {d && etapa === "forma" && !verTicket ? (
          <>
            <p className={rotuloSecao}>Forma de pagamento</p>
            <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-[2px]">
              {formas.map(({ v, rotulo, Icone, detalhe }, i) => {
                const marcada = forma === v;
                return (
                  <div key={v} className={`${cartao} ${forma_da_linha(i, formas.length)}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={marcada}
                      onClick={() => setForma(v)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
                    >
                      <Icone aria-hidden className="size-5 shrink-0 text-paper" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-paper">{rotulo}</span>
                        {detalhe ? (
                          <span className="block text-xs text-mute">{detalhe}</span>
                        ) : null}
                      </span>
                      <span
                        aria-hidden
                        className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${marcada ? "border-primary bg-primary text-primary-foreground" : "border-[var(--figaro-outline,var(--line2))]"}`}
                      >
                        {marcada ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                    </button>
                    {marcada && v === "dinheiro" ? (
                      <div className="px-4 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { rotulo: "Valor exato", centavos: total },
                            ...[10000, 20000]
                              .filter((c) => c > total)
                              .map((c) => ({ rotulo: `R$ ${c / 100}`, centavos: c })),
                          ].map((op) => (
                            <Chip
                              key={op.rotulo}
                              selecionado={recebidoCentavos === op.centavos}
                              onClick={() =>
                                setRecebido((op.centavos / 100).toFixed(2).replace(".", ","))
                              }
                            >
                              {op.rotulo}
                            </Chip>
                          ))}
                        </div>
                        <label className="mt-3 block text-xs text-mute">
                          <span className="sr-only">Valor recebido</span>
                          <input
                            className="field-control"
                            type="text"
                            inputMode="decimal"
                            value={recebido}
                            onChange={(e) => setRecebido(e.target.value)}
                            placeholder="Valor recebido"
                          />
                        </label>
                        {troco ? (
                          <p className="mt-2 text-sm font-semibold text-paper">
                            Troco: <span className="money-value">{brl(troco)}</span>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="sticky -bottom-[calc(1.25rem+env(safe-area-inset-bottom))] -mx-5 mt-6 border-t border-line bg-ink px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-baseline justify-between text-xs text-mute">
                <span>Valor dos itens</span>
                <span className="money-value">{brl(subtotal)}</span>
              </div>
              {descontoCentavos ? (
                <div className="mt-1 flex items-baseline justify-between text-xs text-mute">
                  <span>Desconto</span>
                  <span className="money-value">− {brl(descontoCentavos)}</span>
                </div>
              ) : null}
              {erro ? (
                <p className="mt-3 rounded-md bg-brick px-3 py-2 text-sm text-ink" role="alert">
                  {erro}
                </p>
              ) : null}
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-paper">Total a cobrar</span>
                <span className="money-value text-xl font-bold text-paper">{brl(total)}</span>
              </div>
              <Button
                size="lg"
                className="mt-3 h-14 w-full rounded-full"
                loading={Boolean(ocupado)}
                disabled={!forma || Boolean(ocupado) || !itens.length}
                onClick={confirmarForma}
              >
                <Check aria-hidden />
                {forma === "pix" && d.config?.pix_ativo && d.config.pix_chave
                  ? "Gerar cobrança Pix"
                  : "Confirmar pagamento"}
              </Button>
            </div>
          </>
        ) : null}

        {d && etapa === "pix" && !verTicket ? (
          <div className="py-3">
            <StatusBadge
              status={pixInformado ? "pendente" : "aguardando_pagamento"}
              label={
                ROTULO_DA_ETAPA_EQUIPE[
                  pixInformado ? "pagamento_informado" : "aguardando_pagamento"
                ]
              }
            />
            <h3 className="mt-2 text-lg font-bold text-paper">
              {pixInformado ? "Pagamento informado pelo cliente" : "Aguardando pagamento via Pix"}
            </h3>
            <p className="mt-1 text-sm text-mute">
              {pixInformado
                ? "O cliente avisou que pagou. Confira no banco antes de confirmar."
                : "Confirme só depois de conferir o valor no banco."}
            </p>
            <div className="mt-5 border-y border-line py-4">
              <p className="text-xs text-mute">Valor</p>
              <p className="mt-1 text-2xl font-bold text-paper">{brl(total)}</p>
              <p className="mt-3 break-all text-sm text-paper">{d.config?.pix_chave}</p>
            </div>
            <div className="mt-4 grid gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(d.config?.pix_chave ?? "");
                  setCopiado(true);
                }}
              >
                <Copy />
                {copiado ? "Chave copiada" : "Copiar chave Pix"}
              </Button>
              {d.config?.pix_whatsapp ? (
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${d.config.pix_whatsapp}?text=${encodeURIComponent(mensagem)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Enviar comprovante pelo WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button
                variant={pixInformado ? "default" : "secondary"}
                className="h-12"
                disabled={Boolean(ocupado)}
                onClick={() => setConfirmarAberto(true)}
              >
                <Check />
                {ocupado === "confirmar"
                  ? "Confirmando…"
                  : pixInformado
                    ? "Verificar e confirmar recebimento"
                    : "Verificar pagamento"}
              </Button>
              <Button
                variant="ghost"
                className="h-12"
                disabled={Boolean(ocupado)}
                onClick={() => setEtapa("itens")}
              >
                Receber de outra forma
              </Button>
            </div>
            <AlertDialog open={confirmarAberto} onOpenChange={setConfirmarAberto}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar recebimento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirme que o valor de {brl(total)} foi recebido no banco. Esta ação fechará a
                    comanda.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setConfirmarAberto(false);
                      void confirmarPix();
                    }}
                  >
                    Confirmar recebimento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        {comandaId && etapa === "pix" && !verTicket ? (
          <Button
            variant="ghost"
            className="mt-4 h-12 w-full rounded-full"
            onClick={() => setVerTicket(true)}
          >
            <FileText aria-hidden />
            Ver comanda
          </Button>
        ) : null}
        {verTicket && comandaId ? (
          <div className="pb-2">
            <ConteudoDoTicket comandaId={comandaId} />
            <Button
              variant="ghost"
              className="mt-4 h-12 w-full rounded-full"
              onClick={() => setVerTicket(false)}
            >
              <ArrowLeft aria-hidden />
              Voltar para o pagamento
            </Button>
          </div>
        ) : null}
        {etapa === "retorno" && !verTicket ? (
          <div className="py-3">
            <StatusBadge status="pago" label="Pagamento registrado" />
            {comandaId ? (
              <Button
                variant="secondary"
                className="mt-4 h-12 w-full rounded-full"
                onClick={() => setVerTicket(true)}
              >
                <FileText aria-hidden />
                Ver comanda
              </Button>
            ) : null}
            {d?.comanda.cliente_id && d.comanda.clientes?.telefone !== "avulso" ? (
              <div className="mt-5 border-y border-line py-3">
                <FotoDoCorte
                  clienteId={d.comanda.cliente_id}
                  agendamentoId={d.comanda.agendamento_id}
                  segmento={d.segmento}
                />
              </div>
            ) : null}
            {!retorno ? (
              <Button size="lg" className="mt-5 h-14 w-full" onClick={onConcluido}>
                <Check aria-hidden />
                Concluir
              </Button>
            ) : retornoFeito ? (
              <p className="mt-6 text-center text-sm font-semibold text-paper">Retorno marcado.</p>
            ) : (
              <>
                <p className="mt-6 text-lg font-bold text-paper">
                  Marcar retorno: {dataRetorno(retorno.inicio, retorno.fuso)}?
                </p>
                <div className="mt-4 grid gap-2">
                  <Button
                    size="lg"
                    className="h-14"
                    disabled={Boolean(ocupado)}
                    onClick={() => void marcarRetorno()}
                  >
                    <CalendarPlus aria-hidden />
                    {ocupado === "retorno" ? "Marcando…" : "Marcar retorno"}
                  </Button>
                  <Button variant="ghost" className="h-12" onClick={onConcluido}>
                    Agora não
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
        {erro && etapa !== "itens" && etapa !== "forma" ? (
          <p className="mt-4 rounded-md bg-brick px-3 py-2 text-sm text-ink" role="alert">
            {erro}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function IdentificarAvulso({
  comandaId,
  numero,
  onSalvar,
}: {
  comandaId: string;
  numero: number | string;
  onSalvar: (nome: string, telefone: string) => Promise<void>;
}) {
  const [nome, setNome] = useState(`Cliente avulso · ${numero ?? comandaId.slice(0, 4)}`);
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar(nome.trim(), telefone.trim());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }
  return (
    <div className="mb-5 border-b border-line pb-5">
      <p className="text-xs font-semibold text-mute">Quem é o cliente? (opcional)</p>
      <label className="mt-2 block text-xs text-mute">
        Nome
        <input
          className="field-control"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
        />
      </label>
      <label className="mt-3 block text-xs text-mute">
        Telefone / WhatsApp
        <input
          className="field-control"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={telefone}
          onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          placeholder="(11) 99999-9999"
        />
      </label>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        loading={salvando}
        disabled={salvando || nome.trim().length < 2}
        onClick={salvar}
      >
        {salvando ? "Salvando…" : "Salvar cliente"}
      </Button>
      {erro ? (
        <p className="mt-2 text-sm text-paper" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
