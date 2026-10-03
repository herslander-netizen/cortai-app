import { useServerFn } from "@tanstack/react-start";
import { Check, Coffee, MessageCircle, Snowflake } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CampoDeFormulario } from "@/components/ui/formulario/CampoDeFormulario";
import {
  salvarFichaCorte,
  salvarPreferenciasCliente,
  type PerfilCliente,
} from "@/lib/perfil-cliente.functions";
import { ROTULOS_PREFERENCIAS, type PreferenciasCliente } from "@/lib/preferencias-cliente";

const OPCOES = {
  conversa: ["papo", "silencio", "tanto_faz"],
  ar: ["gelado", "ameno", "sem_ar"],
  bebida: ["cafe", "agua", "refri", "cerveja", "nada"],
} as const;

function mensagem(e: unknown) {
  return e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.";
}

export function EditorPreferencias({ p, onSalvo }: { p: PerfilCliente; onSalvo: () => void }) {
  const salvar = useServerFn(salvarPreferenciasCliente);
  const [preferencias, setPreferencias] = useState<PreferenciasCliente>(p.preferencias);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupos = [
    { chave: "conversa" as const, titulo: "Conversa", icone: MessageCircle },
    { chave: "ar" as const, titulo: "Ambiente", icone: Snowflake },
    { chave: "bebida" as const, titulo: "Bebida", icone: Coffee },
  ];
  async function gravar() {
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await salvar({ data: { clienteId: p.cliente.id, preferencias } });
      setPreferencias(resultado.preferencias);
      onSalvo();
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setSalvando(false);
    }
  }
  const texto = (chave: keyof PreferenciasCliente, rotulo: string, max: number) => (
    <CampoDeFormulario
      rotulo={rotulo}
      maxLength={max}
      enterKeyHint="next"
      value={(preferencias[chave] as string | undefined) ?? ""}
      onChange={(e) => setPreferencias((a) => ({ ...a, [chave]: e.target.value }))}
    />
  );
  return (
    <div className="space-y-4 rounded-[var(--raio-grupo)] bg-ink3 p-4">
      {grupos.map(({ chave, titulo, icone: Icone }) => (
        <fieldset key={chave}>
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-paper">
            <Icone className="size-4" aria-hidden />
            {titulo}
          </legend>
          <div className="flex flex-wrap gap-2">
            {OPCOES[chave].map((valor) => (
              <Button
                key={valor}
                type="button"
                variant={preferencias[chave] === valor ? "secondary" : "ghost"}
                className="min-h-12 rounded-full border border-line"
                aria-pressed={preferencias[chave] === valor}
                onClick={() => setPreferencias((atual) => ({ ...atual, [chave]: valor }))}
              >
                {String((ROTULOS_PREFERENCIAS[chave] as Record<string, string>)[valor])}
              </Button>
            ))}
          </div>
        </fieldset>
      ))}
      {texto("musica", "Música", 40)}
      {texto("corte_habitual", "Atendimento de sempre", 60)}
      {texto("atencao", "Cuidados", 80)}
      {texto("assuntos", "Assuntos de que gosta", 80)}
      <Button
        variant="secondary"
        className="h-12 w-full rounded-full"
        disabled={salvando}
        onClick={() => void gravar()}
      >
        {salvando ? "Salvando…" : "Salvar"}
      </Button>
      {erro ? (
        <p className="field-error" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function EditorFicha({ p, onSalvo }: { p: PerfilCliente; onSalvo: () => void }) {
  const salvar = useServerFn(salvarFichaCorte);
  const [chips, setChips] = useState<string[]>(p.ficha.chips);
  const [alergias, setAlergias] = useState(p.ficha.alergias ?? "");
  const [texto, setTexto] = useState(p.ficha.texto ?? "");
  const [novo, setNovo] = useState("");
  const [estado, setEstado] = useState<"livre" | "salvando" | "ok">("livre");
  const [erro, setErro] = useState<string | null>(null);
  const opcoes = Array.from(new Set([...p.catalogo, ...chips]));
  const alternar = (c: string) => {
    setEstado("livre");
    setChips((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  };

  async function gravar() {
    setEstado("salvando");
    setErro(null);
    const extra = novo.trim();
    try {
      await salvar({
        data: {
          clienteId: p.cliente.id,
          chips: extra ? [...chips, extra] : chips,
          alergias,
          texto,
          novoChip: extra || null,
        },
      });
      setNovo("");
      setEstado("ok");
      onSalvo();
    } catch (e) {
      setErro(mensagem(e));
      setEstado("livre");
    }
  }

  return (
    <div className="space-y-3 rounded-[var(--raio-grupo)] bg-ink3 p-4">
      {opcoes.length ? (
        <div className="flex flex-wrap gap-2">
          {opcoes.map((c) => {
            const ativo = chips.includes(c);
            return (
              <Button
                key={c}
                type="button"
                variant={ativo ? "primary" : "secondary"}
                size="sm"
                aria-pressed={ativo}
                onClick={() => alternar(c)}
                className="min-h-12 rounded-full"
              >
                {c}
              </Button>
            );
          })}
        </div>
      ) : null}
      <CampoDeFormulario
        rotulo="Nova marcação"
        dica="Ex.: tesoura em cima"
        value={novo}
        maxLength={30}
        enterKeyHint="next"
        onChange={(e) => {
          setNovo(e.target.value);
          setEstado("livre");
        }}
      />
      <CampoDeFormulario
        rotulo="Alergias"
        value={alergias}
        enterKeyHint="next"
        onChange={(e) => {
          setAlergias(e.target.value);
          setEstado("livre");
        }}
      />
      <label className="field-label">
        Anotações
        <textarea
          rows={3}
          className="field-control"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setEstado("livre");
          }}
        />
      </label>
      <Button
        variant="secondary"
        className="h-12 w-full rounded-full"
        disabled={estado === "salvando"}
        onClick={() => void gravar()}
      >
        {estado === "ok" ? (
          <>
            <Check aria-hidden />
            Salvo
          </>
        ) : estado === "salvando" ? (
          "Salvando…"
        ) : (
          "Salvar"
        )}
      </Button>
      {erro ? (
        <p className="field-error" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
