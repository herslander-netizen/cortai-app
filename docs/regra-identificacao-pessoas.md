# Regra única: identificação de pessoas por nome e sobrenome

Decisão do dono: 08/11/2026. Válida para Flow Bot, Flow IA/Core, atendimento humano assistido, cadastro e consultas do sistema, onde a semelhança de nomes ou o compartilhamento de telefone possam trocar a pessoa atendida. Lovable é somente referência histórica/visual; a verdade é a branch oficial do GitHub e os serviços reais.

## Contrato
- **Identidade não é texto:** um nome, mesmo completo, não é chave única. Toda mutação e consulta privada usam o ID validado, tenant, permissões e vínculo de contato/autenticação. O nome é auxiliar e o telefone pode ser compartilhado.
- **Cadastro novo conversacional:** pedir **nome e sobrenome**, inclusive quando a entrada veio de áudio, e repetir a pergunta se receber apenas o primeiro nome. Validar no servidor, não só no botão da tela. Não inventar sobrenome nem trocar registros antigos.
- **Contato já conhecido e unívoco:** se uma única ficha ativa já foi identificada de forma confiável pela fonte oficial, pode continuar sem pedir novamente o nome completo. Preservar cadastros legados e apelidos públicos da equipe.
- **Homônimos no painel:** primeiro nome serve para BUSCAR candidatos, nunca para escolher automaticamente. Mostrar nome + distinção suficiente (ex.: quatro últimos dígitos, conforme permissão), solicitar seleção explícita e usar ID validado no servidor. Não mostrar dados de outros negócios.
- **Telefone com várias fichas ativas no mesmo tenant:** não escolher a primeira linha nem consultar/alterar agendamento silenciosamente. Interromper a ação, explicar a ambiguidade e encaminhar à verificação assistida; a escolha deverá ser confirmada por ID/autorização, não apenas pela declaração de nome. Nunca vazar a lista de pessoas para um contato não autenticado.
- **Nome único legítimo:** é exceção que exige tratamento assistido, nunca inventar um sobrenome fictício.
- **Agenda e finanças:** dados e conflitos são decididos por ações oficiais/RPC; a identificação não contorna disponibilidade, RLS, idempotência, cancelamento nem confirmação de pagamento.

## Pontos integrados nesta etapa
- `src/lib/nomes-pessoas.ts`: normalização/validação pura para cadastro novo e guarda de ambiguidade de telefone.
- `src/lib/flow-bot/agenda-na-conversa/conduzir.ts` e `textos.ts`: pergunta e validação de nome e sobrenome antes de confirmar reserva do cliente sem cadastro.
- `src/lib/brain/acoes.server.ts`: barreira no servidor para novo cadastro em WhatsApp, identificação por telefone com até 2 resultados (falha fechada em multiplicidade/erro de leitura), uso da mesma regra em agendar, consultar e buscar.
- `src/lib/brain/escolha-de-cliente.ts`: seleção por ID e confirmação de tenant já existente, preservada.
- Testes em `src/lib/nomes-pessoas.test.ts`, `src/lib/flow-bot/agenda-na-conversa/conduzir.test.ts` e `src/lib/brain/acoes-agendamento.test.ts`.

## Ainda a verificar antes de declarar cobertura total
- Cadastros de cliente no site, no painel, recepção, importações e API externas: mapear seus caminhos oficiais de escrita e evitar que validadores de tela divergentes bloqueiem nomes únicos e registros históricos.
- Atendimento com dois cadastros no mesmo telefone: construir, se autorizado, identificação assistida segura (sem expor homônimos pelo WhatsApp) e definir o vínculo de identidade persistente antes de permitir operações privadas.
- Revisar busca de profissional por apelido parcial no reconhecimento de voz/texto: colisões devem gerar pergunta de desambiguação, não escolha arbitrária.
- A barreira de envio da conversa, claim idempotente e reconciliação de confirmações WhatsApp estão sob a reserva da Claude em `src/lib/whatsapp/*` e não foram alterados neste lote.
- Testes de integração reais e validação visual Android dependem dos gates; mudanças no código só entram na prévia pelo CI verde.

Não modificar produção, `main`, bancos, migrações, DNS, segredos ou instâncias Evolution com este documento.
