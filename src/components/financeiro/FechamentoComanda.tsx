import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, CalendarPlus, Check, Copy, CreditCard, Minus, Plus, QrCode, Send, Ticket, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FotoDoCorte } from "@/components/cliente-perfil/FotoDoCorte";
import { brl, hora } from "@/lib/format";
import {
  criarRetorno, enviarParaRecepcao, getFechamentoComanda, getSugestaoRetorno, identificarClienteAvulso, pagarComanda, pagarComPlano, salvarComanda,
} from "@/lib/financeiro.functions";

type Item = { tipo: "servico" | "produto"; id: string; descricao: string; quantidade: number; valor_unitario_centavos: number; percentual: number };
type Forma = "pix" | "dinheiro" | "cartao" | "fiado";

function dataRetorno(iso: string, fuso: string) {
  const d = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, weekday: "short", day: "2-digit", month: "2-digit" }).format(d).replace(".", "");
  const h = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(d);
  return `${dia} às ${h}`;
}

export function FechamentoComanda({ agendamentoId, onFechar, onConcluido }: { agendamentoId: string; onFechar: () => void; onConcluido: () => void }) {
  const buscar = useServerFn(getFechamentoComanda); const salvar = useServerFn(salvarComanda); const pagar = useServerFn(pagarComanda);
  const identificar = useServerFn(identificarClienteAvulso); const enviar = useServerFn(enviarParaRecepcao); const pagarPlano = useServerFn(pagarComPlano);
  const sugerir = useServerFn(getSugestaoRetorno); const marcar = useServerFn(criarRetorno);
  const query = useQuery({ queryKey: ["fechamento-comanda", agendamentoId], queryFn: () => buscar({ data: { agendamentoId } }), staleTime: 0 });
  const [itens, setItens] = useState<Item[]>([]); const [desconto, setDesconto] = useState(""); const [verDesconto, setVerDesconto] = useState(false);
  const [etapa, setEtapa] = useState<"itens" | "pix" | "retorno">("itens"); const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null); const [copiado, setCopiado] = useState(false);
  const [retorno, setRetorno] = useState<{ inicio: string; fuso: string; cliente: string } | null>(null); const [retornoFeito, setRetornoFeito] = useState(false);

  useEffect(() => { if (!query.data || itens.length) return; setItens(query.data.itens.map((i: any) => ({ tipo: i.tipo, id: i.servico_id ?? i.produto_id, descricao: i.descricao, quantidade: i.quantidade, valor_unitario_centavos: i.valor_unitario_centavos, percentual: Number(i.comissao_percentual) }))); }, [query.data, itens.length]);
  const subtotal = useMemo(() => itens.reduce((s, i) => s + i.quantidade * i.valor_unitario_centavos, 0), [itens]);
  const descontoCentavos = Math.min(subtotal, Math.max(0, Math.round(Number(desconto || 0) * 100))); const total = subtotal - descontoCentavos;
  const d = query.data;
  const comandaId = d?.comanda.id;

  function alterar(index: number, delta: number) { setItens((lista) => lista.map((item, i) => i === index ? { ...item, quantidade: Math.max(0, item.quantidade + delta) } : item).filter((item) => item.quantidade > 0)); }
  function adicionar(tipo: "servico" | "produto", id: string) {
    const fonte = tipo === "servico" ? d?.servicos : d?.produtos; const registro: any = fonte?.find((x: any) => x.id === id); if (!registro) return;
    setItens((lista) => { const idx = lista.findIndex((i) => i.tipo === tipo && i.id === id); if (idx >= 0) return lista.map((i, n) => n === idx ? { ...i, quantidade: i.quantidade + 1 } : i); return [...lista, { tipo, id, descricao: registro.nome, quantidade: 1, valor_unitario_centavos: registro.preco_centavos, percentual: Number(registro.comissao_percentual ?? (tipo === "servico" ? d?.config?.comissao_servico_percentual ?? 50 : d?.config?.comissao_produto_percentual ?? 10)) }]; });
  }
  const payload = () => ({ comandaId: comandaId!, itens: itens.map(({ tipo, id, quantidade, valor_unitario_centavos }) => ({ tipo, id, quantidade, valor_unitario_centavos })), descontoCentavos });

  async function executar(chave: string, acao: () => Promise<void>) {
    if (!comandaId || !itens.length || ocupado) return; setOcupado(chave); setErro(null);
    try { await acao(); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível concluir."); } finally { setOcupado(null); }
  }
  async function aposPagar() {
    try { const s = await sugerir({ data: { comandaId: comandaId! } }); if (s) setRetorno(s); } catch { /* sugestão é opcional */ }
    setEtapa("retorno");
  }
  const receber = (forma: Forma) => executar(forma, async () => {
    await salvar({ data: payload() });
    const pixConfigurado = Boolean(d?.config?.pix_ativo && d.config.pix_chave);
    if (forma === "pix" && pixConfigurado) { await pagar({ data: { comandaId: comandaId!, forma, prepararPix: true } }); setEtapa("pix"); return; }
    await pagar({ data: { comandaId: comandaId!, forma, prepararPix: false } }); await aposPagar();
  });
  const usarPlano = () => executar("plano", async () => { await salvar({ data: payload() }); await pagarPlano({ data: { comandaId: comandaId! } }); await aposPagar(); });
  const paraRecepcao = () => executar("recepcao", async () => { await enviar({ data: payload() }); onConcluido(); });
  const confirmarPix = () => executar("confirmar", async () => { await pagar({ data: { comandaId: comandaId!, forma: "pix", prepararPix: false } }); await aposPagar(); });
  const marcarRetorno = () => executar("retorno", async () => { await marcar({ data: { comandaId: comandaId!, inicio: retorno!.inicio } }); setRetornoFeito(true); window.setTimeout(onConcluido, 900); });

  const qtdServicos = itens.filter((i) => i.tipo === "servico").reduce((s, i) => s + i.quantidade, 0);
  const temProduto = itens.some((i) => i.tipo === "produto");
  const planoDisponivel = Boolean(d && !temProduto && qtdServicos > 0 && (d.plano.creditos + (d.plano.reservado ? 1 : 0)) >= qtdServicos);
  const fiadoDisponivel = Boolean(d && d.fiadoDisponivel > 0 && d.fiadoDisponivel >= total);
  const atalhos = (d?.maisVendidos ?? []).map((id: string) => d?.produtos.find((p: any) => p.id === id)).filter(Boolean) as any[];
  const mensagem = d ? `Olá! Segue o comprovante Pix de ${d.comanda.clientes?.nome ?? "cliente"}, ${itens.map((i) => i.descricao).join(" + ")}, ${d.comanda.agendamentos?.inicio ? `${hora(d.comanda.agendamentos.inicio)}, ` : ""}${brl(total)}, comanda #${d.comanda.numero}.` : "";
  const botaoForma = (forma: Forma, rotulo: string, Icone: typeof Banknote) => (
    <Button key={forma} variant="secondary" className="h-14 flex-col gap-1 px-1 text-xs" loading={ocupado === forma} disabled={Boolean(ocupado) || !itens.length} onClick={() => receber(forma)}>
      <Icone aria-hidden className="size-5" />{ocupado === forma ? "…" : rotulo}
    </Button>
  );

  return <div className="fixed inset-0 z-[80] flex items-end bg-overlay/70 md:items-center md:justify-center" role="dialog" aria-modal="true" aria-label="Fechar comanda"><div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-ink px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 md:max-w-xl md:rounded-xl">
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-ink pb-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-mute">Comanda{d ? ` #${d.comanda.numero}` : ""}</p><h2 className="mt-1 truncate text-xl font-bold text-paper">{d?.comanda.clientes?.nome ?? "Preparando comanda…"}</h2><p className="text-xs text-mute">{d?.comanda.profissionais?.nome ?? "Profissional"}</p></div><Button variant="ghost" size="icon" aria-label="Fechar" onClick={onFechar}><X /></Button></div>
    {query.isLoading ? <p className="py-10 text-center text-sm text-mute">Preparando comanda…</p> : null}
    {query.error ? <p className="py-6 text-sm text-paper" role="alert">{(query.error as Error).message}</p> : null}

    {d && etapa === "itens" ? <>
      {d.comanda.clientes?.telefone === "avulso" ? <IdentificarAvulso comandaId={d.comanda.id} numero={d.comanda.numero} onSalvar={async (nome, telefone) => { await identificar({ data: { comandaId: d.comanda.id, nome, telefone } }); await query.refetch(); }} /> : null}
      <ul className="divide-y divide-line border-y border-line">{itens.map((item, index) => <li key={`${item.tipo}-${item.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-paper">{item.descricao}</p><p className="mt-0.5 text-xs text-mute">{brl(item.valor_unitario_centavos)}</p></div><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label={`Remover um ${item.descricao}`} onClick={() => alterar(index, -1)}><Minus /></Button><span className="w-5 text-center text-sm font-semibold text-paper">{item.quantidade}</span><Button size="icon" variant="ghost" aria-label={`Adicionar um ${item.descricao}`} onClick={() => alterar(index, 1)}><Plus /></Button></div></li>)}</ul>
      {atalhos.length ? <div className="mt-4"><p className="text-xs font-semibold text-mute">Mais vendidos</p><div className="mt-2 flex flex-wrap gap-2">{atalhos.map((p) => <Button key={p.id} type="button" variant="secondary" size="sm" disabled={p.controla_estoque && p.quantidade < 1} onClick={() => adicionar("produto", p.id)} className="rounded-full"><Plus aria-hidden />{p.nome}<span className="money-value text-xs text-mute">{brl(p.preco_centavos)}</span></Button>)}</div></div> : null}
      <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs text-mute">Outro serviço<select className="input-premium" value="" onChange={(e) => { if (e.target.value) adicionar("servico", e.target.value); }}><option value="">Escolher</option>{d.servicos.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label><label className="text-xs text-mute">Outro produto<select className="input-premium" value="" onChange={(e) => { if (e.target.value) adicionar("produto", e.target.value); }}><option value="">Escolher</option>{d.produtos.map((p: any) => <option key={p.id} value={p.id} disabled={p.controla_estoque && p.quantidade < 1}>{p.nome}</option>)}</select></label></div>
      {verDesconto ? <label className="mt-4 block text-xs text-mute">Desconto (R$)<input className="input-premium" type="number" min="0" step="0.01" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" autoFocus /></label> : <Button variant="link" size="sm" className="mt-2 px-0 text-xs" onClick={() => setVerDesconto(true)}>Aplicar desconto</Button>}
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-4"><span className="text-sm text-mute">{descontoCentavos ? `Total (− ${brl(descontoCentavos)})` : "Total"}</span><span className="money-value text-2xl text-paper">{brl(total)}</span></div>

      {d.podeReceber ? <div className="mt-4 space-y-2">
        {planoDisponivel ? <Button size="lg" className="w-full" loading={ocupado === "plano"} disabled={Boolean(ocupado)} onClick={usarPlano}><Ticket aria-hidden />{ocupado === "plano" ? "Usando plano…" : "Usar plano"}</Button> : null}
        <div className={`grid gap-2 ${fiadoDisponivel ? "grid-cols-4" : "grid-cols-3"}`}>
          {botaoForma("pix", "Pix", QrCode)}{botaoForma("cartao", "Cartão", CreditCard)}{botaoForma("dinheiro", "Dinheiro", Banknote)}{fiadoDisponivel ? botaoForma("fiado", "Fiado", Wallet) : null}
        </div>
      </div> : <div className="mt-4"><Button size="lg" className="w-full" loading={ocupado === "recepcao"} disabled={Boolean(ocupado) || !itens.length} onClick={paraRecepcao}><Send aria-hidden />{ocupado === "recepcao" ? "Enviando…" : "Enviar para a recepção"}</Button><p className="mt-2 text-center text-xs text-mute">A comanda fica aguardando pagamento na recepção.</p></div>}
    </> : null}

    {d && etapa === "pix" ? <div className="py-3"><h3 className="text-lg font-bold text-paper">Aguardando Pix</h3><p className="mt-1 text-sm text-mute">Confirme depois de conferir o recebimento.</p><div className="mt-5 border-y border-line py-4"><p className="text-xs text-mute">Valor</p><p className="mt-1 text-2xl font-bold text-paper">{brl(total)}</p><p className="mt-3 break-all text-sm text-paper">{d.config?.pix_chave}</p></div><div className="mt-4 grid gap-2"><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(d.config?.pix_chave ?? ""); setCopiado(true); }}><Copy />{copiado ? "Chave copiada" : "Copiar chave Pix"}</Button>{d.config?.pix_whatsapp ? <Button variant="outline" asChild><a href={`https://wa.me/${d.config.pix_whatsapp}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer">Enviar comprovante pelo WhatsApp</a></Button> : null}<Button size="lg" className="h-14" disabled={Boolean(ocupado)} onClick={() => void confirmarPix()}><Check />{ocupado === "confirmar" ? "Confirmando…" : "Pix recebido"}</Button></div></div> : null}

    {etapa === "retorno" ? <div className="py-3"><StatusBadge status="pago" label="Pagamento registrado" />
      {d?.comanda.cliente_id && d.comanda.clientes?.telefone !== "avulso" ? <div className="mt-5 border-y border-line py-3"><FotoDoCorte clienteId={d.comanda.cliente_id} agendamentoId={d.comanda.agendamento_id} segmento={d.segmento} /></div> : null}
      {!retorno ? <Button size="lg" className="mt-5 h-14 w-full" onClick={onConcluido}><Check aria-hidden />Concluir</Button> : retornoFeito ? <p className="mt-6 text-center text-sm font-semibold text-paper">Retorno marcado.</p> : <>
        <p className="mt-6 text-lg font-bold text-paper">Marcar retorno: {dataRetorno(retorno.inicio, retorno.fuso)}?</p>
        <div className="mt-4 grid gap-2"><Button size="lg" className="h-14" disabled={Boolean(ocupado)} onClick={() => void marcarRetorno()}><CalendarPlus aria-hidden />{ocupado === "retorno" ? "Marcando…" : "Marcar retorno"}</Button><Button variant="ghost" className="h-12" onClick={onConcluido}>Agora não</Button></div>
      </>}
    </div> : null}
    {erro ? <p className="mt-4 rounded-md bg-brick px-3 py-2 text-sm text-ink" role="alert">{erro}</p> : null}
  </div></div>;
}

function IdentificarAvulso({ comandaId, numero, onSalvar }: { comandaId: string; numero: number | string; onSalvar: (nome: string, telefone: string) => Promise<void> }) {
  const [nome, setNome] = useState(`Cliente avulso · ${numero ?? comandaId.slice(0, 4)}`);
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function salvar() { setSalvando(true); setErro(null); try { await onSalvar(nome.trim(), telefone.trim()); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setSalvando(false); } }
  return <div className="mb-5 border-b border-line pb-5"><p className="text-xs font-semibold text-mute">Quem é o cliente? (opcional)</p>
    <label className="mt-2 block text-xs text-mute">Nome<input className="input-premium" value={nome} onChange={(e) => setNome(e.target.value)} onFocus={(e) => e.currentTarget.select()} autoComplete="off" /></label>
    <label className="mt-3 block text-xs text-mute">Telefone / WhatsApp<input className="input-premium" type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" /></label>
    <Button variant="secondary" className="mt-3 w-full" loading={salvando} disabled={salvando || nome.trim().length < 2} onClick={salvar}>{salvando ? "Salvando…" : "Salvar cliente"}</Button>
    {erro ? <p className="mt-2 text-sm text-paper" role="alert">{erro}</p> : null}</div>;
}
