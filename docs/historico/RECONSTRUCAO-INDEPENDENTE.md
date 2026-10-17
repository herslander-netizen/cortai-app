# Reconstrução independente do Cortaí

Data de início: 2026-10-13  
Repositório: `herslander-netizen/cortai-app`  
Branch de trabalho: `reconstrucao-independente-2026-10-13`  
Base: `teste-fora-lovable` (não é a `main`)

## Regra zero: produção protegida

Este trabalho é exclusivamente de desenvolvimento/teste. Não publicar nem alterar `cortai.dev`, o projeto Lovable original, o banco original (`nigpokzwjqepfulpnmjc`), DNS, webhooks, credenciais de produção ou o serviço `evolution-crm`. Não executar migrações contra bancos existentes. Não mesclar na `main` nem fazer deploy sem autorização explícita.

O projeto Supabase `ibsberidejlbczxrweqg` é um destino vazio de teste, não uma cópia da produção e não deve receber tráfego de produção.

## Estado conhecido antes da reconstrução

- O repositório contém a aplicação Cortaí existente; não começar do zero nem descartar funcionalidades.
- A branch `teste-fora-lovable` passou por CI com instalação, TypeScript, testes e build.
- O build dessa branch ainda depende de `@lovable.dev/vite-tanstack-config` e do plugin MCP da Lovable; portanto, CI verde não significa que a dependência da Lovable já foi removida.
- O `bun.lock` faz referência a um cache privado da Lovable e não é confiável fora dela. O procedimento documentado no projeto usa npm sem gerar lockfile.
- Há migrations Supabase e Drizzle. Não aplicar em lote: primeiro inventariar schema, ordem, estado aplicado e diferenças do banco original.
- Os testes `src/lib/whatsapp/lembretes-numeros.test.ts` usam datas fixas antigas e precisam ser ajustados para não falhar conforme o calendário avança.
- A causa dos carregamentos travados ainda não está confirmada; não declarar resolvido sem reproduzir e testar.

## Objetivo

Conseguir executar e validar uma cópia de desenvolvimento fora da Lovable, mantendo a arquitetura, as rotas e os dados de produção intactos.

## Fases e critérios de saída

### Fase 1 — Congelar a referência e inventariar dependências
- Registrar SHA de origem e comparar as branches existentes.
- Mapear cada import/uso de APIs específicas da Lovable, plugins Vite, MCP, autenticação, webhooks e variáveis de ambiente.
- Separar configurações obrigatórias de produção das configurações exclusivas de desenvolvimento.
- Não copiar segredos para Git, arquivos de exemplo, logs ou prompts.

**Concluída quando:** inventário de dependências e configuração de execução está documentado.

### Fase 2 — Remover dependência de build da Lovable
- Substituir a configuração Vite da Lovable por configuração padrão compatível com as versões já instaladas de TanStack Start, React, Tailwind e Nitro/Cloudflare.
- Substituir/remover o plugin MCP da Lovable somente depois de mapear as rotas e funcionalidades que o utilizam.
- Manter compatibilidade com `src/server.ts`, aliases, SSR, rotas e build para Cloudflare.
- Instalar dependências com o método npm documentado; não regenerar ou formatar todo o repositório.
- Rodar TypeScript, testes e build e corrigir erros apenas nesta branch.

**Concluída quando:** build local/CI não importa pacotes `@lovable.dev/*` para inicializar a aplicação.

### Fase 3 — Configurar ambiente isolado
- Usar variáveis exclusivas de teste, documentadas em `.env.example` sem valores secretos.
- Confirmar que URL/chaves apontam para o projeto de teste antes de qualquer operação de banco.
- Não aplicar migrations automaticamente. Comparar migrations com o schema real e criar uma sequência de migração revisada.
- Testar primeiro sem integrações externas; simular WhatsApp, pagamentos e IA quando possível.

**Concluída quando:** a aplicação de teste inicializa sem acesso acidental aos recursos de produção.

### Fase 4 — Validar o produto
- Testar carregamento inicial, rotas públicas, login/logout, sessão, agenda, clientes, serviços, permissões e estados vazios/erro.
- Reproduzir o carregamento travado com logs e Network/SSR, sem presumir que seja apenas bug de interface.
- Testar isolamento entre estabelecimentos e operações que alteram dados.
- Validar integrações em sandbox antes de qualquer conexão real.

**Concluída quando:** checklist de testes aprovado e falhas conhecidas documentadas.

### Fase 5 — Revisão antes de qualquer transição
- Revisar diff e variáveis com foco em segredos, banco de destino, autenticação, webhooks e isolamento.
- Produzir plano de migração/rollback, incluindo backup verificável e restauração testada.
- Não executar transição para produção até haver autorização explícita.

## Checklist de execução

- [ ] Confirmar branch e SHA-base
- [ ] Mapear imports e APIs `@lovable.dev/*`
- [ ] Revisar configuração Vite/Nitro/Cloudflare e entrada SSR
- [ ] Criar configuração Vite independente
- [ ] Corrigir testes com datas fixas
- [ ] Garantir exclusão de variáveis locais/segredos do Git
- [ ] Passar TypeScript, testes e build na branch
- [ ] Preparar ambiente de teste separado
- [ ] Validar fluxo de ponta a ponta sem WhatsApp/pagamentos reais
- [ ] Aprovação explícita antes de qualquer mudança de produção

## Regra de interrupção

Se uma ação puder escrever no banco original, afetar o domínio publicado, modificar configurações do Lovable ou alterar serviços compartilhados, interromper e pedir autorização. Em caso de dúvida sobre o destino de uma variável, não executar a operação.
