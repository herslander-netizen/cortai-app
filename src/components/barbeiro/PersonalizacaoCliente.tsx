import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { useSucessoDoBotao } from "@/hooks/useSucessoDoBotao";
import { Aviso } from "@/components/ui/aviso";
import { salvarPersonalizacaoCliente, type FichaCliente } from "@/lib/barbeiro.functions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";

type Participa = "padrao" | "sim" | "nao";

function Opcao({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Chip selecionado={ativo} onClick={onClick}>
      {children}
    </Chip>
  );
}

/**
 * Área de personalização da ficha: o que é padrão da barbearia e o que foi
 * ajustado só para este cliente. Quem salva é sempre a barbearia — o servidor
 * confere o vínculo do usuário com o tenant antes de gravar.
 */
export function PersonalizacaoCliente({
  ficha,
  onSalvo,
}: {
  ficha: FichaCliente;
  onSalvo: () => void;
}) {
  const salvar = useServerFn(salvarPersonalizacaoCliente);
  const c = ficha.cliente;

  const [participa, setParticipa] = useState<Participa>("padrao");
  const [desconto, setDesconto] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [whats, setWhats] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const salvou = useSucessoDoBotao();
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setParticipa(
      c.fidelidade_participa === null ? "padrao" : c.fidelidade_participa ? "sim" : "nao",
    );
    setDesconto(c.desconto_percentual === null ? "" : String(c.desconto_percentual));
    setCondicoes(c.condicoes_especiais ?? "");
    setObservacoes(c.observacoes_internas ?? "");
    setWhats(c.opt_in_whatsapp);
  }, [c]);

  const padraoTexto = ficha.padrao.fidelidadeAtiva
    ? `Ligada · ${ficha.padrao.fidelidadeAlvo ?? 10} cortes até o grátis`
    : "Desligada para todos os clientes";

  const valeFidelidade =
    participa === "padrao" ? ficha.padrao.fidelidadeAtiva : participa === "sim";

  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="text-sm font-semibold text-paper">Personalizações deste cliente</h2>
      <p className="mt-1 text-xs text-mute">
        O que estiver como “padrão” segue a configuração da barbearia. O que você mudar aqui vale só
        para {c.nome}.
      </p>

      <div className="mt-5 surface px-4 py-4">
        <p className="text-xs uppercase tracking-wide text-mute2">Padrão do negócio</p>
        <p className="mt-1 text-sm text-paper">Fidelidade: {padraoTexto}</p>
      </div>

      <div className="mt-6">
        <p className="text-sm text-paper">Participa da fidelidade</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Opcao ativo={participa === "padrao"} onClick={() => setParticipa("padrao")}>
            Seguir padrão
          </Opcao>
          <Opcao ativo={participa === "sim"} onClick={() => setParticipa("sim")}>
            Sempre sim
          </Opcao>
          <Opcao ativo={participa === "nao"} onClick={() => setParticipa("nao")}>
            Nunca
          </Opcao>
        </div>
        <p className="mt-2 text-xs text-mute">
          {participa === "padrao" ? "Herdado do padrão." : "Personalizado manualmente."} Hoje este
          cliente{" "}
          {valeFidelidade
            ? "vê o cartão de fidelidade no app."
            : "não vê nada de fidelidade no app."}
          {ficha.fidelidadeProgresso > 0
            ? ` Ele já tem ${ficha.fidelidadeProgresso} selos guardados — desligar não apaga.`
            : ""}
        </p>
      </div>

      <Field
        label="Desconto personalizado (%)"
        hint={
          c.desconto_percentual === null
            ? "Herdado: preço de tabela."
            : "Personalizado manualmente."
        }
        className="mt-6"
      >
        <Input
          inputMode="numeric"
          placeholder="Sem desconto"
          value={desconto}
          onChange={(e) => setDesconto(e.target.value.replace(/\D/g, "").slice(0, 3))}
          className="mt-1"
        />
      </Field>

      <Field label="Condições especiais" className="mt-5">
        <Textarea
          rows={2}
          value={condicoes}
          placeholder="Ex.: sempre atende antes das 10h, cobra pai e filho junto…"
          onChange={(e) => setCondicoes(e.target.value)}
          className="mt-1"
        />
      </Field>

      <Field label="Observações internas" hint="Só a equipe vê este campo." className="mt-5">
        <Textarea
          rows={2}
          value={observacoes}
          placeholder="Anotações privadas sobre este cliente."
          onChange={(e) => setObservacoes(e.target.value)}
          className="mt-1"
        />
      </Field>

      <div className="mt-6 flex min-h-12 items-center gap-4 border-t border-line pt-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-paper">Pode receber mensagens no WhatsApp</p>
          <p className="mt-0.5 text-xs text-mute2">Avisos de horário, fila e retorno.</p>
        </div>
        <Switch
          checked={whats}
          onCheckedChange={setWhats}
          aria-label="Pode receber mensagens no WhatsApp"
          className="h-7 w-12 shrink-0 data-[state=checked]:bg-[var(--figaro-primary)] data-[state=unchecked]:bg-[var(--figaro-surface-container-highest)]"
        />
      </div>

      {erro ? (
        <Aviso tom="acao" className="mt-4">
          {erro}
        </Aviso>
      ) : null}
      {aviso ? (
        <Aviso tom="sucesso" className="mt-4">
          {aviso}
        </Aviso>
      ) : null}

      <Button
        variant="primary"
        type="button"
        className="mt-5 w-full"
        disabled={salvando}
        loading={salvando}
        success={salvou.sucesso}
        onClick={async () => {
          setSalvando(true);
          setErro(null);
          setAviso(null);
          try {
            await salvar({
              data: {
                clienteId: c.id,
                fidelidadeParticipa: participa === "padrao" ? null : participa === "sim",
                descontoPercentual: desconto === "" ? null : Number(desconto),
                condicoesEspeciais: condicoes,
                observacoesInternas: observacoes,
                optInWhatsapp: whats,
              },
            });
            setAviso("Personalização salva para este cliente.");
            salvou.confirmar();
            onSalvo();
          } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível salvar agora.");
          } finally {
            setSalvando(false);
          }
        }}
      >
        Salvar personalizações
      </Button>
    </section>
  );
}
