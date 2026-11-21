# Flow Core — correção de descontinuações e contingência (21/11/2026)

## Escopo e referência segura
- Origem da mudança: commit **731f85228a96f9833d78ed03ae20016318d5a046**, efetivamente publicado na prévia da Cloudflare Pages `cortaiapp` em 21/11/2026.
- A branch remota `previa` ainda aponta para o commit **934adad58488b09f3f46779d5c74a662d7bd8c8c**. A branch `main` contém código diferente; NÃO mesclar, promover ou publicar a partir dela por inferência.
- Para revisar sem um diff contendo milhares de mudanças, a branch `review/flow-core-publicado-20261121` mantém a base publicada. A PR de correção é contra essa referência, NÃO contra `main` ou `previa`.
- A presente correção não publica o aplicativo, não muda secrets e não chama APIs de IA.

## Regras corrigidas
1. **Workers AI**: IDs oficialmente aposentados em **20/11/2026** (HTTP 410, erro 5028) são bloqueados antes de qualquer chamada de Chat Completions pelo adaptador, e ignorados na lista de candidatos híbridos. O bloqueio só se aplica ao provedor Cloudflare; não bloqueia nomes iguais em outros provedores.
2. **Falhas elegíveis a contingência**: HTTP 410, 429 e 5xx podem levar ao provedor secundário configurado ou ao próximo candidato já elegível no roteador híbrido. **Nunca** saltar automaticamente em 401, 402, 403, 400 ou 404.
3. **OpenRouter**: o adaptador genérico também rejeita IDs sem sufixo `:free` antes do envio, mesmo quando o provedor esteja configurado como primário ou secundário.
4. **Auditoria**: a categoria `modelo_descontinuado` distingue retirada de modelo de falta de créditos e bloqueio de credenciais.
5. **Custos e privacidade**: não alterar os bloqueios existentes do híbrido: `modalidadeGratuitaVerificada=true`, limite distribuído por chave, autorização por canal, exigência de ferramenta, origem privada do Ollama e rejeição de mensagens pessoais/confidenciais destinadas a nuvem.

Fonte oficial: https://developers.cloudflare.com/changelog/post/2026-11-05-planned-model-deprecations/ .
O catálogo de modelos pode mudar; esta lista é um bloqueio pontual e **não substitui monitoramento de descontinuações**.

## Matriz de testes simulados
- 410 por modelo remoto ainda elegível: deve tentar **somente** o fallback configurado.
- Modelo Workers AI retirado: **zero chamadas** ao modelo retirado; pode tentar a alternativa configurada.
- 410 sem fallback: erro seguro; **nenhuma troca silenciosa**.
- 429 e 5xx: continuam elegíveis para fallback existente.
- 401/402/403 e respostas inválidas: **sem fallback de provedor**.
- OpenRouter pago: **zero chamadas**; só `:free` permitido.
- Roteador híbrido: ignora modelo retirado, reserva cotas antes de tentar o seguinte e falha fechado sem limitador.

Executar localmente ou na CI:
```sh
npx vitest run src/lib/brain/politica-fallback.test.ts src/lib/brain/gateway-despacho.test.ts src/lib/brain/roteador-hibrido.test.ts
npx tsc --noEmit
```

## Bloqueios para publicação
- Verificar **o vínculo real entre GitHub e o deploy ad-hoc**. A branch `previa` do GitHub não coincide com o último commit publicado: mesclar a correção ali sem reconciliação pode causar regressão.
- Checar por leitura de metadados a presença de `CORTAI_AI_PROVIDER`, `CORTAI_AI_CANAIS`, `CORTAI_AI_FALLBACK_*`, `CORTAI_AI_HIBRIDO`, `CORTAI_AI_HIBRIDO_CONFIG` e do binding global `FLOW_AI_COTAS`. Nunca exibir ou exportar chaves.
- A configuração da prévia foi encontrada com um único provedor `CORTAI_AI_*`, sem as variáveis de fallback/híbrido na leitura efetuada; produção Pages não mostra `CORTAI_AI_*`. O código preparado **não prova** a disponibilidade operacional de nenhum fallback.
- Validar IDs ativos, cotas e preços **nas contas reais** antes de habilitar qualquer transição. O marcador `modalidadeGratuitaVerificada` é uma declaração de configuração, não uma garantia contratual de custo zero.
- Para ambientes contendo dados pessoais, não permitir fallback remoto sem anonimização comprovada e política LGPD adequada.
- Após reconciliar as branches, testar com respostas simuladas 410/429/5xx e posteriormente testes reais de baixo volume e sem custos verificados.
- Não ativar cobrança nem migrar de plano. Sem cota grátis, usar contingência sem IA e encaminhamento humano.

**Status:** preparação de código para revisão; nenhuma alteração em produção ou na configuração da Cloudflare.
