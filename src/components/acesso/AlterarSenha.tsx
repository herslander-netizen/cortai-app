import { ChevronRight, KeyRound } from "lucide-react";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Troca de senha do próprio usuário logado.
 * A senha atual é pedida para confirmar a identidade e nunca é guardada.
 */
export function AlterarSenha({ emGrupo = false }: { emGrupo?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className={emGrupo ? "overflow-hidden rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))]" : "border-b border-line"}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className={
          emGrupo
            ? "h-auto min-h-14 w-full justify-start gap-3 whitespace-normal rounded-none px-4 py-3 text-left"
            : "h-auto min-h-12 w-full justify-between gap-4 py-5 text-left"
        }
      >
        {emGrupo ? (
          // Linha de grupo de configuração (mesmo desenho de `LinhaDeConfiguracao`); o formulário abre embaixo.
          <>
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary"
            >
              <KeyRound size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-5 text-paper">
                Alterar minha senha
              </span>
              <span className="mt-0.5 block text-sm font-normal leading-5 text-mute">
                Use pelo menos 8 caracteres.
              </span>
            </span>
            <ChevronRight
              size={20}
              className={`shrink-0 text-mute2 transition-transform ${aberto ? "rotate-90" : ""}`}
            />
          </>
        ) : (
          <>
            <KeyRound size={18} className="text-mute" />
            <span className="text-sm text-paper">Alterar minha senha</span>
            <ChevronRight
              size={16}
              className={`text-mute2 transition-transform ${aberto ? "rotate-90" : ""}`}
            />
          </>
        )}
      </Button>

      {aberto ? (
        <form
          className={emGrupo ? "space-y-3 px-4 pb-4" : "space-y-3 pb-5"}
          onSubmit={async (event) => {
            event.preventDefault();
            setErro(null);
            setOk(false);
            if (nova.length < 8) {
              setErro("Use pelo menos 8 caracteres na nova senha.");
              return;
            }
            if (nova !== confirmacao) {
              setErro("As duas senhas precisam ser iguais.");
              return;
            }
            setSalvando(true);
            // current_password confirma a identidade de quem está logado.
            const { error } = await supabase.auth.updateUser({
              password: nova,
              current_password: atual,
            } as Parameters<typeof supabase.auth.updateUser>[0]);
            setSalvando(false);
            if (error) {
              setErro(
                error.message.toLowerCase().includes("current")
                  ? "A senha atual não confere."
                  : "Não foi possível alterar a senha agora.",
              );
              return;
            }
            setAtual("");
            setNova("");
            setConfirmacao("");
            setOk(true);
          }}
        >
          {[
            { rotulo: "Senha atual", valor: atual, set: setAtual, auto: "current-password" },
            { rotulo: "Nova senha", valor: nova, set: setNova, auto: "new-password" },
            {
              rotulo: "Repita a nova senha",
              valor: confirmacao,
              set: setConfirmacao,
              auto: "new-password",
            },
          ].map((campo) => (
            <label key={campo.rotulo} className="field-label">
              {campo.rotulo}
              <input
                value={campo.valor}
                onChange={(e) => campo.set(e.target.value)}
                type="password"
                autoComplete={campo.auto}
                required
                minLength={8}
                className="field-control mt-1.5 text-base"
              />
            </label>
          ))}
          {erro ? (
            <p className="text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
          {ok ? (
            <Aviso tom="sucesso">Sua senha foi alterada. Ela já vale no próximo acesso.</Aviso>
          ) : null}
          <Button variant="primary" className="w-full" loading={salvando} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
