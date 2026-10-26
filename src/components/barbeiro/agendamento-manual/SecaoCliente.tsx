import { ContactRound, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CampoDeFormulario } from "@/components/ui/formulario/CampoDeFormulario";
import { GrupoDeCartoes } from "@/components/ui/formulario/GrupoDeCartoes";
import { SecaoDeFormulario } from "@/components/ui/formulario/SecaoDeFormulario";
import { mascaraTelefone } from "@/lib/previa";
import { selecionarContatoDoAparelho } from "@/lib/contatos-do-aparelho";

import type { EstadoAgendamentoManual } from "./useAgendamentoManual";

export function SecaoCliente({ s }: { s: EstadoAgendamentoManual }) {
  const [tocado, setTocado] = useState({ nome: false, telefone: false });
  const [importandoContato, setImportandoContato] = useState(false);
  const [mensagemContato, setMensagemContato] = useState<string | null>(null);
  const [contatoImportado, setContatoImportado] = useState<{ nome: string; telefone: string } | null>(
    null,
  );

  async function importarContato() {
    setImportandoContato(true);
    setMensagemContato(null);
    try {
      const contato = await selecionarContatoDoAparelho();
      if (!contato) return;
      setContatoImportado(contato);
      s.escolherCliente(null);
      s.setNovo(false);
      s.setTermo(mascaraTelefone(contato.telefone) || contato.nome);
      setMensagemContato(
        "Contato selecionado. Confira se já existe uma ficha antes de cadastrar novamente.",
      );
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") return;
      setMensagemContato(
        erro instanceof Error && erro.message === "CONTATO_PICKER_INDISPONIVEL"
          ? "Seu navegador não permite acessar os contatos. Você pode buscar ou preencher o cadastro manualmente."
          : "Não foi possível abrir os contatos. Tente novamente ou preencha os dados manualmente.",
      );
    } finally {
      setImportandoContato(false);
    }
  }

  function acaoSelecionarContato() {
    return (
      <Button
        variant="outline"
        type="button"
        className="w-full rounded-full"
        disabled={importandoContato}
        onClick={() => void importarContato()}
      >
        <ContactRound size={16} aria-hidden />
        {importandoContato ? "Abrindo contatos…" : "Selecionar contato do celular"}
      </Button>
    );
  }

  function avisoContato() {
    return mensagemContato ? (
      <p className="px-1 text-sm text-mute" role="status">
        {mensagemContato}
      </p>
    ) : null;
  }

  if (s.semCliente) {
    return (
      <SecaoDeFormulario rotulo="Cliente opcional">
        <GrupoDeCartoes>
          <li className="space-y-1 px-4 py-3">
            <p className="font-medium text-paper">Agendamento sem cliente</p>
            <p className="text-sm text-mute">
              Nenhuma ficha será criada. O pagamento e a comanda não serão vinculados a um cliente.
            </p>
          </li>
        </GrupoDeCartoes>
        <Button
          variant="outline"
          type="button"
          className="w-full rounded-full"
          onClick={() => s.escolherCliente(null)}
        >
          Escolher cliente
        </Button>
      </SecaoDeFormulario>
    );
  }

  if (s.clienteId) {
    return (
      <SecaoDeFormulario rotulo="Cliente">
        <GrupoDeCartoes>
          <li className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
            <span className="truncate text-base text-paper">{s.clienteNome}</span>
            <Button
              variant="ghost"
              type="button"
              className="rounded-full text-sm"
              onClick={() => s.escolherCliente(null)}
            >
              Trocar
            </Button>
          </li>
        </GrupoDeCartoes>
      </SecaoDeFormulario>
    );
  }

  if (s.novo) {
    return (
      <>
        <SecaoDeFormulario rotulo="Identificação">
          {acaoSelecionarContato()}
          {avisoContato()}
          <CampoDeFormulario
            rotulo="Nome completo"
            obrigatorio
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            value={s.novoNome}
            onChange={(e) => s.setNovoNome(e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, nome: true }))}
            erro={tocado.nome && !s.nomeValido ? "Digite o nome com pelo menos 2 letras." : null}
          />
        </SecaoDeFormulario>
        <SecaoDeFormulario rotulo="Contato">
          <CampoDeFormulario
            rotulo="Telefone (com DDD)"
            obrigatorio
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="done"
            value={s.novoTelefone}
            onChange={(e) => s.setNovoTelefone(mascaraTelefone(e.target.value))}
            onBlur={() => setTocado((t) => ({ ...t, telefone: true }))}
            erro={
              tocado.telefone && !s.telefoneValido
                ? "Confira o telefone: DDD e número, como (11) 91234-5678."
                : null
            }
          />
          <Button
            variant="ghost"
            type="button"
            className="rounded-full text-sm text-mute"
            onClick={() => s.setNovo(false)}
          >
            Buscar cliente cadastrado
          </Button>
          <Button
            variant="ghost"
            type="button"
            className="w-full rounded-full text-sm text-mute"
            onClick={s.continuarSemCliente}
          >
            Continuar sem cliente
          </Button>
        </SecaoDeFormulario>
      </>
    );
  }

  const clientes = s.busca.data ?? [];
  return (
    <SecaoDeFormulario rotulo="Cliente">
      {acaoSelecionarContato()}
      {avisoContato()}
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute2"
        />
        <input
          className="field-control pl-11"
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar cliente"
          enterKeyHint="search"
          value={s.termo}
          onChange={(e) => {
            setContatoImportado(null);
            setMensagemContato(null);
            s.setTermo(e.target.value);
          }}
        />
      </div>
      {s.busca.isLoading ? (
        <p className="px-4 text-sm text-mute">Buscando…</p>
      ) : (
        <GrupoDeCartoes
          vazio={
            <>
              <span className="font-medium text-paper">Nenhum cliente encontrado.</span>
              <span>Confira o nome ou cadastre como novo cliente.</span>
            </>
          }
        >
          {clientes.map((c) => (
            <li key={c.id}>
              <Button
                variant="ghost"
                type="button"
                className="h-auto min-h-14 w-full justify-between gap-3 rounded-[inherit] px-4 py-3 text-left"
                onClick={() => {
                  setContatoImportado(null);
                  setMensagemContato(null);
                  s.escolherCliente(c.id, c.nome);
                }}
              >
                <span className="truncate text-base font-normal text-paper">{c.nome}</span>
                <span className="shrink-0 text-sm font-normal text-mute">{c.telefone}</span>
              </Button>
            </li>
          ))}
        </GrupoDeCartoes>
      )}
      <Button
        variant="outline"
        type="button"
        className="w-full rounded-full"
        onClick={() => {
          s.setNovo(true);
          s.setNovoNome(contatoImportado?.nome ?? s.termo.replace(/\d/g, "").trim());
          s.setNovoTelefone(mascaraTelefone(contatoImportado?.telefone ?? ""));
          setMensagemContato(
            contatoImportado
              ? "Confira nome e telefone. A ficha só será criada quando você confirmar o agendamento."
              : null,
          );
        }}
      >
        Novo cliente
      </Button>
      <Button
        variant="ghost"
        type="button"
        className="w-full rounded-full text-sm text-mute"
        onClick={s.continuarSemCliente}
      >
        Continuar sem cliente
      </Button>
    </SecaoDeFormulario>
  );
}
