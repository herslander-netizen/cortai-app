import { ChevronRight, KeyRound } from "lucide-react";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { supabase } from "@/integrations/supabase/client";

/**
 * Troca de senha do próprio usuário logado.
 * A senha atual é pedida para confirmar a identidade e nunca é guardada.
 */
export function AlterarSenha() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left"
      >
        <KeyRound size={18} className="text-mute" />
        <span className="text-sm text-paper">Alterar minha senha</span>
        <ChevronRight
          size={16}
          className={`text-mute2 transition-transform ${aberto ? "rotate-90" : ""}`}
        />
      </button>

      {aberto ? (
        <form
          className="space-y-3 pb-5"
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
            const { error } = await supabase.auth.updateUser({
              password: nova,
              // @ts-expect-error suportado pelo Auth; confirma a identidade de quem está logado
              current_password: atual,
            });
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
            { rotulo: "Repita a nova senha", valor: confirmacao, set: setConfirmacao, auto: "new-password" },
          ].map((campo) => (
            <label key={campo.rotulo} className="block text-xs font-medium text-mute">
              {campo.rotulo}
              <input
                value={campo.valor}
                onChange={(e) => campo.set(e.target.value)}
                type="password"
                autoComplete={campo.auto}
                required
                minLength={8}
                className="mt-2 h-11 w-full rounded-lg border border-line2 bg-ink2 px-3 text-sm text-paper outline-none"
              />
            </label>
          ))}
          {erro ? (
            <p className="text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
          {ok ? <Aviso tom="sucesso">Sua senha foi alterada. Ela já vale no próximo acesso.</Aviso> : null}
          <button className="btn-primary w-full py-3" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
