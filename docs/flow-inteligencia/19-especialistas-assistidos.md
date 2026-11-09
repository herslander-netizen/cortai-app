# Flow Core — especialistas assistidos (09/11/2026)

## Ativação e alcance
O cérebro oficial continua sendo `src/lib/brain/agente.server.ts`; não foi criado um executor paralelo.
Os seis perfis de `src/lib/agente-flow/especialistas.ts` agora participam como **focos consultivos**
do turno (Atendimento, Agenda, CRM, Insights, Conhecimento, Operações). O roteador puro
`src/lib/agente-flow/roteador.ts` seleciona um foco e acrescenta instruções ao prompt existente.
Isso não cria requisições adicionais de IA, não aciona Helpin, Ollama, Oracle, Railway nem modelos
externos e não inicia tarefas em segundo plano.

## Contratos de segurança
- O executor existente preserva catálogo, `acaoPermitida`, permissões, tenant, confirmação,
  idempotência e verificação de resultado. O roteador não recebe acesso ao banco.
- Nenhum especialista tem ação autônoma de escrita nem confirma recebimento de pagamentos.
- Foco escolhido não filtra ferramentas do cérebro: evita quebrar solicitações multidomínio.
- Visitas públicas e clientes no WhatsApp só recebem foco Atendimento/Agenda; nunca é oferecido
  diagnóstico administrativo pelo roteador.
- O roteamento não habilita uma IA externa. Sem provedor configurado, o modo básico só atende
  os comandos que já reconhece; conversação avançada e transcrição remota continuam condicionadas
  à disponibilidade real das integrações.
- A ponte Helpin e o roteador híbrido de modelos continuam desligados. Não se alteram chaves,
  billing, banco, migrações, WhatsApp nem filas.

## Homologação antes de lançamento principal
Validar no painel autenticado da prévia consultas de agenda, caixa e CRM com perfis distintos,
ausência de dados de outros tenants, comando de voz e uma escrita com dupla confirmação/concorrência.
Verificar o commit implantado e o status do provedor, bem como as cotas, antes de afirmar que toda a
experiência responde por IA real. Nunca publicar em produção apenas por CI verde.
