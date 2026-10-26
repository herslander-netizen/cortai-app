import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { registrarGanhoExtra } from "@/lib/financeiro.functions";
import { aviso } from "@/lib/avisos";

type Profissional = { id: string; nome: string };

export function RegistrarGanhoExtra({ profissionais }: { profissionais: Profissional[] }) {
  const queryClient = useQueryClient();
  const registrar = useServerFn(registrarGanhoExtra);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    categoria: "gorjeta" as "gorjeta" | "servico_extra" | "outro",
    descricao: "",
    valor: "",
    profissionalId: "",
    formaPagamento: "dinheiro" as "pix" | "dinheiro" | "cartao",
  });

  async function salvar() {
    setSalvando(true);
    try {
      await registrar({
        data: {
          categoria: form.categoria,
          descricao: form.descricao.trim(),
          valorCentavos: Math.round(Number(form.valor) * 100),
          profissionalId: form.profissionalId || null,
          formaPagamento: form.formaPagamento,
        },
      });
      setForm({
        categoria: "gorjeta",
        descricao: "",
        valor: "",
        profissionalId: "",
        formaPagamento: "dinheiro",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["caixa"] }),
        queryClient.invalidateQueries({ queryKey: ["financeiro"] }),
      ]);
      aviso.ok("Ganho extra registrado.");
    } catch (e) {
      aviso.erro(e instanceof Error ? e.message : "Não foi possível registrar o ganho extra.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="surface-card mt-5 p-4 md:max-w-3xl md:p-5">
      <h2 className="text-sm font-semibold text-paper">Registrar ganho extra</h2>
      <p className="mt-1 text-xs text-mute">
        Gorjetas e receitas adicionais ficam separadas das comandas e entram nos relatórios.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-mute">
          Tipo de ganho
          <select
            className="field-control"
            value={form.categoria}
            onChange={(e) =>
              setForm({ ...form, categoria: e.target.value as typeof form.categoria })
            }
          >
            <option value="gorjeta">Gorjeta</option>
            <option value="servico_extra">Serviço extra</option>
            <option value="outro">Outro ganho</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-mute">
          Forma de recebimento
          <select
            className="field-control"
            value={form.formaPagamento}
            onChange={(e) =>
              setForm({ ...form, formaPagamento: e.target.value as typeof form.formaPagamento })
            }
          >
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao">Cartão</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-mute">
          Descrição
          <input
            className="field-control"
            placeholder="Ex.: gorjeta do atendimento"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            maxLength={120}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-mute">
          Valor (R$)
          <input
            className="field-control"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-mute sm:col-span-2">
          Profissional (opcional)
          <select
            className="field-control"
            value={form.profissionalId}
            onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
          >
            <option value="">Sem profissional específico</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button
        variant="outline"
        className="mt-3 w-full"
        disabled={
          salvando ||
          form.descricao.trim().length < 3 ||
          !Number.isFinite(Number(form.valor)) ||
          Number(form.valor) <= 0
        }
        onClick={() => void salvar()}
      >
        {salvando ? "Salvando…" : "Registrar ganho extra"}
      </Button>
    </section>
  );
}
