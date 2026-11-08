# Flow Core — roteador híbrido (Fase 2; segurança padrão)
A evolução do gateway conserva os mecanismos existentes. O roteador híbrido fica **desligado** sem `CORTAI_AI_HIBRIDO=true`. Nenhuma conta, chave ou provedor é ativado por este código.

O adaptador em `src/lib/brain/gateway-hibrido.server.ts` aceita apenas uma configuração JSON validada em `CORTAI_AI_HIBRIDO_CONFIG`, com uma entrada por provedor e sem chaves. As credenciais são lidas exclusivamente de `CORTAI_AI_HIBRIDO_<ID>_API_KEY` no servidor (ID em maiúsculas). Os provedores remotos têm hosts fixos; Ollama exige HTTPS autenticado. Modelos marcados como gratuitos devem ser **verificados pela pessoa administradora e bloqueados contra faturamento na conta**; o código não consulta preços em tempo real.

A chamada híbrida exige um `LimitadorHibridoDistribuido` real que reserve quota de minuto e dia de modo atômico, por chave global compartilhada entre todos os tenants, além de `idempotencia` e classificação de dados. Sem um desses elementos, não envia a chamada. A implementação distribuída deve ser integrada antes de ativar o roteador; um contador em memória ou Redis não atômico não serve. **A presente fase não cria esse limitador e não configura segredos.**

Por padrão, o gateway trata os dados como pessoais: somente Ollama auto-hospedado é candidato. Não promover automaticamente uma mensagem para pública ou anonimizável. Uso de ferramentas fica restrito a modelos comprovadamente capazes; a execução e a confirmação continuam no motor oficial.

Para um teste em ambiente isolado, executar TypeScript, Vitest, ESLint, build e `scripts/verificar-protocolo.sh`. Não habilitar WhatsApp real, produção ou provedor externo sem revisar LGPD, gratuidade, segredos e cotas reais.

## Barreiras adicionais
- `ollama` só é elegível em HTTPS na origem fixada em `CORTAI_AI_HIBRIDO_OLLAMA_ORIGIN`. Rejeita explicitamente `ollama.com` e seus subdomínios; a origem deve ser controlada pelo dono e protegida com autenticação.
- Cada rodada do agente possui idempotência distinta (`turno:passo-N:provedor`) para que múltiplas chamadas no mesmo turno não compartilhem uma única reserva de cota.
