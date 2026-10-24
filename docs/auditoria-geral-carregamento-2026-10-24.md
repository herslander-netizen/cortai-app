# Auditoria geral de carregamento e estabilidade — 24/10/2026

## Escopo e método

Revisão estática da branch `cloudflare-workers-migration-2026-10-13`, da gravação mobile recebida, das rotas de Personalizar Página / Layout & Tema, do fluxo de permissões por capacidade e da função de servidor `getMarca`. Cruzamento com as auditorias existentes `docs/auditoria-limpeza-2026-10-24.md` e `docs/auditoria-desempenho-agenda-2026-10-23.md`, além do workflow de validação da prévia.

Não foi feita escrita em banco, alteração de permissões, publicação na versão principal nem remoção de arquivos/funcionalidades. Uma passagem estática não substitui a conferência da experiência autenticada em aparelho real.

## Achados críticos e correções

### P1 — carregamento serial das imagens da página

`getMarca` pedia a URL assinada da logo, da capa e do avatar em sequência, embora as três operações sejam independentes. A latência das requisições era somada antes da tela poder usar os dados. **Corrigido**: as três solicitações são paralelas.

### P1 — rota podia esperar indefinidamente pela verificação de capacidade

`exigirCapacidade` usava `ensureQueryData` no `beforeLoad` de várias rotas. O bloco `catch` já permitia continuar se a leitura falhasse, mas não tratava uma Promise que nunca resolvesse nem rejeitasse. Isso podia manter o placeholder de navegação aberto. **Corrigido**: limite de 4 segundos; se a leitura não terminar, a verificação de interface falha em aberto conforme a regra já documentada. As operações de servidor continuam responsáveis por aplicar permissões reais.

### P1 — consultas de personalização sem limite total

`getMarca` agregava a identificação do negócio, seis consultas ao banco e as URLs de imagem sem um limite de duração. **Corrigido**: prazo total de 10 segundos para a leitura, com erro específico em vez de espera infinita. A operação subjacente não é cancelada automaticamente; o prazo impede que a interface fique presa e uma melhoria futura deve propagar cancelamento à camada de transporte.

## Achados abertos — sem conflito com tarefas de outras IAs

### P1 — falha de consulta confundida com falta de acesso (parcialmente corrigido)

No servidor, `tenantDoDono` ignorava erros de leitura das tabelas de vínculos e perfil; `getMarca` também ignorava `error` em várias consultas ao banco. Isso podia transformar uma falha de rede/RLS em ausência de vínculo, configuração padrão ou contagens zero. **Corrigido em `src/lib/marca.functions.ts`**: só a ausência confirmada de permissão vira `null`; erros das consultas agora propagam uma falha recuperável.

**Corrigido também na interface** em `src/routes/barbeiro.marca.index.tsx`: `query.isError && !query.data` agora mostra o aviso Figaro de falha recuperável e botão “Tentar novamente”; só a resposta bem-sucedida sem vínculo exibe a mensagem de acesso. Foi acrescentada uma verificação de regressão em `src/lib/navegacao-movel.test.ts`.

### P2 — prazo e cancelamento das chamadas de rede

O novo prazo do `getMarca` melhora o estado visível, mas não cancela automaticamente as operações de Supabase que já começaram. É recomendável propagar `AbortSignal` nas consultas que suportam cancelamento e conferir tempos reais no aparelho com rede móvel.

## Demais achados do repositório já registrados

A lista A–H da auditoria de limpeza de 24/10 foi **executada depois do relatório**: a branch confirma a remoção de 49 arquivos, 24 dependências e CSS morto, com validação verde registrada no `DIARIO.md`. O relatório de limpeza foi atualizado para refletir isso. Os itens ainda abertos são os exports sem uso, a recontagem de casts `as never` (a contagem diverge entre documentos) e as sobreposições de produto, que exigem decisão; não foram alterados aqui.

A auditoria da Agenda de 23/10 mediu redução de 121 para 13 renderizações em 120 movimentos da alça no teste com 40 cartões; o ganho em quadros por segundo no celular real continua pendente de medição. Também mantém como próximos riscos a recomposição da timeline e a renderização da lista de períodos carregada.

## Validação

**Validação em andamento para a última correção de interface.** O GitHub Actions #1010 já passou em TypeScript, Vitest, build e deploy isolado para a versão anterior desta revisão; o novo teste e a mensagem de erro serão confirmados pelo workflow do commit desta auditoria. A prévia está em https://previa.cortaiapp.pages.dev. A inspeção manual autenticada em 390 px, no Android real, continua pendente; a versão principal e o banco de produção permanecem intocados.
