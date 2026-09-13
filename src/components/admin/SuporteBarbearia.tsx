import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { BarbeariaSuporte } from "@/lib/suporte.functions";
import {
  alternarItemComoSuporte,
  getBarbeariaParaSuporte,
  salvarBarbeariaComoSuporte,
} from "@/lib/suporte.functions";

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
  const query = useQuery({ queryKey: ["suporte-barbearia", tenantId], queryFn: () => getBarbeariaParaSuporte({ data: { tenantId } }), retry: false });
  const salvar = useServerFn(salvarBarbeariaComoSuporte);
  const alternar = useServerFn(alternarItemComoSuporte);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loja, setLoja] = useState(false);
  const [plano, setPlano] = useState("essencial");
  const [motivo, setMotivo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const campos = (query.data as BarbeariaSuporte).campos;
    setForm(Object.fromEntries(TEXTO.map((t) => [t.campo, String(campos[t.campo] ?? "")])));
    setLoja(Boolean(campos["loja_ativa"]));
    setPlano(String(campos["plano"] ?? "essencial"));
  }, [query.data]);

  if (query.isError) return <p className="text-sm text-brick">{(query.error as Error).message}</p>;
  if (!query.data) return <p className="text-sm text-mute">Carregando dados da barbearia…</p>;

  const dados = query.data as BarbeariaSuporte;

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-lg border border-line bg-ink px-3 py-2 text-xs leading-relaxed text-mute">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-sage" />
        Edição como suporte: você altera os dados públicos da barbearia sem entrar na conta dela e sem interromper o trabalho. Toda mudança fica registrada com seu e-mail.
      </p>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setErro(null);
          setStatus(null);
          try {
            const r = await salvar({ data: { tenantId, motivo, campos: { ...form, loja_ativa: loja, plano: plano as "essencial" | "pro" | "studio" } } });
            await query.refetch();
            setStatus(r.alteracoes ? `${r.alteracoes} campo(s) atualizado(s).` : "Nada mudou.");
          } catch (e) {
            setErro((e as Error).message);
          }
        }}
      >
        {TEXTO.map((item) =>
          item.area ? (
            <label key={item.campo} className="block text-xs text-mute">
              {item.rotulo}
              <textarea value={form[item.campo] ?? ""} onChange={(e) => setForm({ ...form, [item.campo]: e.target.value })} className="mt-1 min-h-20 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper" />
            </label>
          ) : (
            <label key={item.campo} className="block text-xs text-mute">
              {item.rotulo}
              <input value={form[item.campo] ?? ""} onChange={(e) => setForm({ ...form, [item.campo]: e.target.value })} className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper" />
            </label>
          ),
        )}

        <label className="block text-xs text-mute">
          Plano
          <select value={plano} onChange={(e) => setPlano(e.target.value)} className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper">
            <option value="essencial">Essencial</option>
            <option value="pro">Pro</option>
            <option value="studio">Studio</option>
          </select>
        </label>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-ink px-3 py-3">
          <span className="text-sm text-paper">Loja online <span className={`ml-2 text-xs ${loja ? "text-sage" : "text-mute"}`}>{loja ? "Ativada" : "Desativada"}</span></span>
          <Switch checked={loja} onCheckedChange={setLoja} aria-label="Loja online da barbearia" />
        </div>

        <label className="block text-xs text-mute">
          Motivo do atendimento (fica na auditoria)
          <input required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente pediu troca do endereço por WhatsApp" className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2 text-sm text-paper" />
        </label>

        <Button className="w-full">Salvar como suporte</Button>
        {status ? <p className="text-xs text-sage" role="status">{status}</p> : null}
        {erro ? <p className="text-xs text-brick" role="alert">{erro}</p> : null}
      </form>

      <section>
        <h4 className="text-sm font-semibold text-paper">Serviços, profissionais e produtos</h4>
        <p className="mt-1 text-xs text-mute">Ligar ou desligar itens exige o motivo preenchido acima.</p>
        <ul className="mt-3">
          {[
            ...dados.servicos.map((s) => ({ tabela: "servicos" as const, id: s.id, nome: s.nome, ativo: s.ativo, extra: "Serviço" })),
            ...dados.profissionais.map((p) => ({ tabela: "profissionais" as const, id: p.id, nome: p.nome, ativo: p.ativo, extra: "Profissional" })),
            ...dados.produtos.map((p) => ({ tabela: "produtos" as const, id: p.id, nome: p.nome, ativo: p.ativo, extra: p.disponivel_venda ? "Produto à venda" : "Produto de estoque" })),
          ].map((item) => (
            <li key={`${item.tabela}-${item.id}`} className="flex items-center justify-between gap-4 border-b border-line py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm text-paper">{item.nome}</span>
                <span className="text-xs text-mute2">{item.extra}</span>
              </span>
              <Switch
                checked={item.ativo}
                aria-label={`${item.nome} ativo`}
                onCheckedChange={async (valor) => {
                  setErro(null);
                  if (motivo.trim().length < 3) { setErro("Descreva o motivo antes de alterar itens."); return; }
                  try {
                    await alternar({ data: { tenantId, tabela: item.tabela, id: item.id, campo: "ativo", valor, motivo } });
                    await query.refetch();
                    setStatus(`${item.nome} ${valor ? "ativado" : "desativado"}.`);
                  } catch (e) { setErro((e as Error).message); }
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-paper"><History size={14} className="text-gold" />Histórico de alterações do suporte</h4>
        {dados.auditoria.length ? (
          <ul className="mt-3">
            {dados.auditoria.map((registro) => (
              <li key={registro.id} className="border-b border-line py-3">
                <p className="text-xs text-paper">{registro.acao.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-mute">{registro.ator_email ?? "equipe Cortaí"} · {new Date(registro.criado_em).toLocaleString("pt-BR")}</p>
                <p className="mt-1 text-xs text-mute2">Motivo: {registro.alvo}</p>
                <pre className="sem-barra mt-2 overflow-x-auto rounded bg-ink px-2 py-1 text-[10px] text-mute2">{registro.alteracoes}</pre>
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
