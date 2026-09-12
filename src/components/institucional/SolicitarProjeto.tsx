import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { enviarPedidoDeProjeto, TIPOS_DE_PROJETO } from "@/lib/institucional.functions";

const campo =
  "mt-2 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper outline-none placeholder:text-mute2 focus:border-gold";

/** Seção institucional discreta da Alvo Digital + formulário de contato comercial. */
export function SolicitarProjeto() {
  const enviar = useServerFn(enviarPedidoDeProjeto);
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="text-base font-bold text-paper">Precisa de algo sob medida?</h2>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        A Alvo Digital cria aplicativos, sistemas e experiências digitais personalizados para empresas.
      </p>

      {!aberto ? (
        <Button variant="outline" className="mt-4" onClick={() => setAberto(true)}>
          Solicitar um projeto
        </Button>
      ) : pronto ? (
        <Aviso tom="sucesso" titulo="Pedido enviado" className="mt-4">
          Recebemos sua solicitação. A Alvo Digital entra em contato pelo WhatsApp informado.
        </Aviso>
      ) : (
        <form
          className="mt-5 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setErro(null);
            setEnviando(true);
            const f = new FormData(event.currentTarget);
            try {
              await enviar({
                data: {
                  nome: String(f.get("nome") ?? ""),
                  empresa: String(f.get("empresa") ?? ""),
                  whatsapp: String(f.get("whatsapp") ?? ""),
                  email: String(f.get("email") ?? ""),
                  tipo: String(f.get("tipo") ?? "outro") as never,
                  mensagem: String(f.get("mensagem") ?? ""),
                },
              });
              setPronto(true);
            } catch {
              setErro("Confira os campos e tente novamente.");
            }
            setEnviando(false);
          }}
        >
          <label className="block text-xs font-medium text-mute">
            Nome
            <input name="nome" required maxLength={120} autoComplete="name" className={campo} />
          </label>
          <label className="block text-xs font-medium text-mute">
            Empresa ou barbearia
            <input name="empresa" maxLength={160} autoComplete="organization" className={campo} />
          </label>
          <label className="block text-xs font-medium text-mute">
            WhatsApp
            <input
              name="whatsapp"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              className={campo}
            />
          </label>
          <label className="block text-xs font-medium text-mute">
            E-mail (opcional)
            <input name="email" type="email" autoComplete="email" className={campo} />
          </label>
          <label className="block text-xs font-medium text-mute">
            Tipo de projeto
            <select name="tipo" className={campo} defaultValue="aplicativo">
              {TIPOS_DE_PROJETO.map((t) => (
                <option key={t.valor} value={t.valor} className="bg-ink2">
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-mute">
            Mensagem
            <textarea name="mensagem" required rows={4} maxLength={2000} className={campo} />
          </label>

          {erro ? <Aviso tom="acao">{erro}</Aviso> : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={enviando} className="font-bold">
              {enviando ? "Enviando…" : "Falar com a Alvo Digital"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
