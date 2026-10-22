import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageCircle } from "lucide-react";
import { useState } from "react";

import { CartaoDeAvisoDoMenu } from "@/components/layout/CartaoDeAvisoDoMenu";
import { Button } from "@/components/ui/button";
import { aviso } from "@/lib/avisos";
import { avisosDoMenu, textosDoWhatsapp } from "@/lib/avisos-do-menu";
import { supabase } from "@/integrations/supabase/client";
import { useCartaoDeAvisosNoMenu } from "@/lib/push/convite-avisos";
import { statusDaConta } from "@/lib/seguranca-conta.functions";
import { getSessao } from "@/lib/sessao.functions";
import { statusDoWhatsappAutomatico } from "@/lib/whatsapp-limite.functions";

function useEmailPendente() {
  const consultar = useServerFn(statusDaConta);
  const { data } = useQuery({
    queryKey: ["seguranca-conta"],
    queryFn: () => consultar(),
    staleTime: 30_000,
  });
  return Boolean(data) && !data?.emailVerificado;
}

/** Figaro `VerifyEmail`: "Confirme seu e-mail" até a conta ter o e-mail confirmado. */
export function CartaoDeEmailNoMenu() {
  const pendente = useEmailPendente();
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const [enviando, setEnviando] = useState(false);
  if (!pendente) return null;

  async function verificar() {
    const email = sessao?.email;
    if (!email) {
      aviso.erro("Não encontrei o e-mail da conta. Entre de novo e tente outra vez.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setEnviando(false);
    if (error) aviso.erro("Não foi possível enviar agora. Tente de novo em instantes.");
    else aviso.ok(`Enviamos o link de confirmação para ${email}.`);
  }

  return (
    <CartaoDeAvisoDoMenu
      icone={Mail}
      titulo="Confirme seu e-mail"
      texto="Verifique seu endereço de e-mail para proteger sua conta"
    >
      <Button
        className="h-10 rounded-full px-5 text-sm"
        loading={enviando}
        onClick={() => void verificar()}
      >
        Verificar agora
      </Button>
    </CartaoDeAvisoDoMenu>
  );
}

function chaveDaDispensa(tenantId: string, mes: string, faixa: string) {
  return `cortai-aviso-whatsapp-${tenantId}-${mes}-${faixa}`;
}

/** Figaro `WhatsappReminders`: mensagens acabando ou pausadas (cota mensal do teste). */
export function CartaoDeWhatsappNoMenu({ tenantId }: { tenantId: string | null }) {
  const consultar = useServerFn(statusDoWhatsappAutomatico);
  const { data } = useQuery({
    queryKey: ["whatsapp-limite", tenantId],
    queryFn: () => consultar(),
    staleTime: 60_000,
    enabled: Boolean(tenantId),
  });
  const emailPendente = useEmailPendente();
  const avisosDoAparelhoVisivel = useCartaoDeAvisosNoMenu();
  const [dispensados, setDispensados] = useState<string[]>([]);

  if (!data || !tenantId) return null;
  const chave = chaveDaDispensa(tenantId, data.mes, data.faixa);
  let guardado = false;
  try {
    guardado = window.localStorage.getItem(chave) === "1";
  } catch {
    guardado = false;
  }
  const { whatsapp } = avisosDoMenu({
    emailPendente,
    avisosDoAparelhoVisivel,
    faixaDoWhatsapp: data.faixa,
    whatsappDispensado: guardado || dispensados.includes(chave),
  });
  if (!whatsapp || data.faixa === "livre") return null;
  const textos = textosDoWhatsapp(data.faixa, data.enviados, data.limite);

  function entendi() {
    setDispensados((atual) => [...atual, chave]);
    try {
      window.localStorage.setItem(chave, "1");
    } catch {
      /* sem armazenamento: só esconde nesta tela */
    }
  }

  return (
    <CartaoDeAvisoDoMenu icone={MessageCircle} titulo={textos.titulo} texto={textos.corpo}>
      <Button asChild className="h-10 rounded-full px-5 text-sm">
        <Link to="/barbeiro/automacao">Ver avisos</Link>
      </Button>
      <Button
        variant="ghost"
        className="h-10 rounded-full px-3 text-sm text-mute"
        onClick={entendi}
      >
        Entendi
      </Button>
    </CartaoDeAvisoDoMenu>
  );
}
