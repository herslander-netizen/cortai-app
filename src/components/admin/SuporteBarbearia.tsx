import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Switch } from "@/components/ui/switch";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import type { BarbeariaSuporte } from "@/lib/suporte.functions";
import {
  alternarItemComoSuporte,
  getBarbeariaParaSuporte,
  salvarBarbeariaComoSuporte,
} from "@/lib/suporte.functions";
import { Aviso } from "@/components/ui/aviso";

const TEXTO: { campo: string; rotulo: string; area?: boolean }[] = [
  { campo: "nome", rotulo: "Nome" },
  { campo: "descricao", rotulo: "Descrição", area: true },
  { campo: "endereco", rotulo: "Endereço" },
  { campo: "telefone", rotulo: "Telefone" },
  { campo: "whatsapp", rotulo: "WhatsApp" },
  { campo: "instagram", rotulo: "Instagram" },
  { campo: "facebook", rotulo: "Facebook" },
  { campo: "texto_boas_vindas", rotulo: "Texto de boas-vindas", area: true },
  { campo: "logo_url", rotulo: "Logo (caminho ou link)" },
  { campo: "capa_url", rotulo: "Capa (caminho ou link)" },
  { campo: "cor_primaria", rotulo: "Cor principal" },
  { campo: "cor_secundaria", rotulo: "Cor secundária" },
];

/**
 * Edição assistida pelo suporte. Isto NÃO é entrar na conta da barbearia:
 * nenhuma sessão do cliente é aberta e cada alteração fica registrada.
 */
export function SuporteBarbearia({ tenantId }: { tenantId: string }) {
  const query = useQuery({
    queryKey: ["suporte-barbearia", tenantId],
    queryFn: () => getBarbeariaParaSuporte({ data: { tenantId } }),
    retry: false,
  });
  const salvar = useServerFn(salvarBarbeariaComoSuporte);
  const alternar = useServerFn(alternarItemComoSuporte);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loja, setLoja] = useState(false);
  const [plano, setPlano] = useState("essencial");
  const [motivo, setMotivo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarSalvamento, setConfirmarSalvamento] = useState(false);
  const [itemParaAlternar, setItemParaAlternar] = useState<{
    tabela: "servicos" | "profissionais" | "produtos";
    id: string;
    nome: string;
    valor: boolean;
  } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    const campos = (query.data as BarbeariaSuporte).campos;
    setForm(Object.fromEntries(TEXTO.map((t) => [t.campo, String(campos[t.campo] ?? "")])));
    setLoja(Boolean(campos["loja_ativa"]));
    setPlano(String(campos["plano"] ?? "essencial"));
  }, [query.data]);

  if (query.isError) return <p className="text-sm text-brick">{(query.error as Error).message}</p>;
  if (!query.data)
    return <EsqueletoFormulario campos={5} onTentarDeNovo={() => void query.refetch()} />;

  const dados = query.data as BarbeariaSuporte;
  const camposIniciais = dados.campos;
  const temMudancaOperacional =
    plano !== String(camposIniciais["plano"] ?? "essencial") ||
    loja !== Boolean(camposIniciais["loja_ativa"]);

  async function salvarAlteracoes() {
    setErro(null);
    setStatus(null);
    setSalvando(true);
    try {
      const r = await salvar({
        data: {
          tenantId,
          motivo,
          campos: {
            ...form,
            loja_ativa: loja,
            plano: plano as "essencial" | "pro" | "conecta" | "studio",
          },
        },
      });
      await query.refetch();
      setStatus(r.alteracoes ? `${r.alteracoes} campo(s) atualizado(s).` : "Nada mudou.");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAlternancia() {
    if (!itemParaAlternar) return;
    setErro(null);
    try {
      await alternar({
        data: {
          tenantId,
          tabela: itemParaAlternar.tabela,
          id: itemParaAlternar.id,
          campo: "ativo",
          valor: itemParaAlternar.valor,
          motivo,
        },
      });
      await query.refetch();
      setStatus(`${itemParaAlternar.nome} ${itemParaAlternar.valor ? "ativado" : "desativado"}.`);
      setItemParaAlternar(null);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <Aviso tom="atencao">
        Você está alterando dados em nome do suporte, sem entrar na conta da barbearia. Toda mudança
        fica registrada com seu e-mail.
      </Aviso>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (temMudancaOperacional) setConfirmarSalvamento(true);
          else await salvarAlteracoes();
        }}
      >
        {TEXTO.map((item) =>
          item.area ? (
            <Field key={item.campo} label={item.rotulo}>
              <Textarea
                value={form[item.campo] ?? ""}
                onChange={(e) => setForm({ ...form, [item.campo]: e.target.value })}
                rows={2}
                className="mt-1 resize-y"
              />
            </Field>
          ) : (
            <Field key={item.campo} label={item.rotulo}>
              <Input
                value={form[item.campo] ?? ""}
                onChange={(e) => setForm({ ...form, [item.campo]: e.target.value })}
                className="mt-1"
              />
            </Field>
          ),
        )}

        <Field label="Plano">
          <Select value={plano} onChange={(e) => setPlano(e.target.value)} className="mt-1">
            <option value="essencial">Essencial</option>
            <option value="pro">Profissional</option>
            <option value="conecta">Conecta</option>
            <option value="studio">Equipe</option>
          </Select>
        </Field>

        <div className="flex items-center justify-between gap-4 border-b border-line py-3">
          <span className="text-sm text-paper">
            Loja online{" "}
            <span className={`ml-2 text-xs ${loja ? "text-sage" : "text-mute"}`}>
              {loja ? "Ativada" : "Desativada"}
            </span>
          </span>
          <Switch checked={loja} onCheckedChange={setLoja} aria-label="Loja online do negócio" />
        </div>

        <Field label="Motivo do atendimento (fica na auditoria)">
          <Input
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: cliente pediu troca do endereço"
            className="mt-1"
          />
        </Field>

        <Button className="w-full sm:w-auto" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </Button>
        {status ? (
          <p className="text-xs text-sage" role="status">
            {status}
          </p>
        ) : null}
        {erro ? (
          <p className="text-xs text-brick" role="alert">
            {erro}
          </p>
        ) : null}
      </form>

      <section>
        <h4 className="text-sm font-semibold text-paper">Serviços, profissionais e produtos</h4>
        <p className="mt-1 text-xs text-mute">
          Ligar ou desligar itens exige o motivo preenchido acima.
        </p>
        <ul className="mt-3">
          {[
            ...dados.servicos.map((s) => ({
              tabela: "servicos" as const,
              id: s.id,
              nome: s.nome,
              ativo: s.ativo,
              extra: "Serviço",
            })),
            ...dados.profissionais.map((p) => ({
              tabela: "profissionais" as const,
              id: p.id,
              nome: p.nome,
              ativo: p.ativo,
              extra: "Profissional",
            })),
            ...dados.produtos.map((p) => ({
              tabela: "produtos" as const,
              id: p.id,
              nome: p.nome,
              ativo: p.ativo,
              extra: p.disponivel_venda ? "Produto à venda" : "Produto de estoque",
            })),
          ].map((item) => (
            <li
              key={`${item.tabela}-${item.id}`}
              className="flex items-center justify-between gap-4 border-b border-line py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-paper">{item.nome}</span>
                <span className="text-xs text-mute2">{item.extra}</span>
              </span>
              <Switch
                checked={item.ativo}
                aria-label={`${item.nome} ativo`}
                onCheckedChange={async (valor) => {
                  setErro(null);
                  if (motivo.trim().length < 3) {
                    setErro("Descreva o motivo antes de alterar itens.");
                    return;
                  }
                  setItemParaAlternar({
                    tabela: item.tabela,
                    id: item.id,
                    nome: item.nome,
                    valor,
                  });
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <AlertDialog open={confirmarSalvamento} onOpenChange={setConfirmarSalvamento}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança operacional?</AlertDialogTitle>
            <AlertDialogDescription>
              Você alterou o plano ou a disponibilidade da loja. Isso pode mudar recursos visíveis
              para a barbearia. A ação ficará registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void salvarAlteracoes()}>
              Confirmar e salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(itemParaAlternar)}
        onOpenChange={(open) => {
          if (!open) setItemParaAlternar(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração deste item?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemParaAlternar?.nome} será {itemParaAlternar?.valor ? "ativado" : "desativado"} em
              nome da barbearia. A ação ficará registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarAlternancia()}>
              Confirmar alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-paper">
          <History size={14} className="text-gold" />
          Histórico de alterações do suporte
        </h4>
        {dados.auditoria.length ? (
          <ul className="mt-3">
            {dados.auditoria.map((registro) => (
              <li key={registro.id} className="border-b border-line py-3">
                <p className="text-xs text-paper">{registro.acao.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-mute">
                  {registro.ator_email ?? "equipe Flow"} ·{" "}
                  {new Date(registro.criado_em).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs text-mute2">Motivo: {registro.alvo}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-ink px-2 py-1 text-xs text-mute2">
                  {registro.alteracoes}
                </pre>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-mute">Nenhuma alteração feita pelo suporte até agora.</p>
        )}
      </section>
    </div>
  );
}
