import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";

import {
  GrupoDeLinhas,
  LinhaDeConfiguracao,
  SecaoDeConfiguracao,
} from "@/components/ui/formulario/LinhasDeConfiguracao";
import { Switch } from "@/components/ui/switch";
import { aviso } from "@/lib/avisos";
import {
  definirMeusAvisosDaPlataforma,
  getMeusAvisosDaPlataforma,
} from "@/lib/whatsapp-plataforma.functions";

const CHAVE = ["meus-avisos-da-plataforma"] as const;

/**
 * Opt-in de cada pessoa para os avisos da plataforma Flow pelo WhatsApp (linha da plataforma, dono 05/11/2026):
 * queda do WhatsApp do negócio, cobrança, boas-vindas e alertas. Só com o WhatsApp da pessoa verificado.
 */
export function AvisosDaPlataforma() {
  const cliente = useQueryClient();
  const ler = useServerFn(getMeusAvisosDaPlataforma);
  const definir = useServerFn(definirMeusAvisosDaPlataforma);
  const consulta = useQuery({ queryKey: CHAVE, queryFn: () => ler() });
  const mudar = useMutation({
    mutationFn: (ativo: boolean) => definir({ data: { ativo } }),
    onSuccess: (r) => {
      if (!r.ok) aviso.erro(r.aviso ?? "Não foi possível salvar agora.");
    },
    onError: () => aviso.erro("Não foi possível salvar agora."),
    onSettled: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
  const dados = consulta.data;
  const ativo = mudar.isPending ? Boolean(mudar.variables) : dados?.ativo === true;
  return (
    <SecaoDeConfiguracao
      titulo="Avisos da plataforma Flow"
      rodape={
        dados && !dados.telefoneVerificado
          ? "Para ligar, verifique seu WhatsApp no perfil (mande o código pelo seu número)."
          : "Pelo WhatsApp do Flow: queda do WhatsApp do seu negócio, cobrança da assinatura e alertas importantes."
      }
    >
      <GrupoDeLinhas>
        <LinhaDeConfiguracao
          icone={ShieldCheck}
          titulo="Receber pelo WhatsApp"
          suporte={ativo ? "Ligado" : "Desligado"}
          desabilitada={!dados?.telefoneVerificado}
          fim={
            <Switch
              checked={ativo}
              disabled={!dados?.telefoneVerificado || mudar.isPending}
              onCheckedChange={(v) => mudar.mutate(v)}
              aria-label="Receber avisos da plataforma Flow pelo WhatsApp"
            />
          }
        />
      </GrupoDeLinhas>
    </SecaoDeConfiguracao>
  );
}
