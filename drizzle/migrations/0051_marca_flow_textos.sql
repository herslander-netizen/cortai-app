-- Migração da marca Cortaí → Flow nos TEXTOS gravados no banco (decisão do dono de 29/10/2026).
-- Só troca o nome comercial em textos exibidos; não renomeia tabelas, colunas, chaves nem identificadores.
-- Idempotente: cada UPDATE só alcança linhas que ainda têm o nome antigo. NÃO APLICAR sem autorização do dono.

-- Vitrine de planos (descrição exibida na tela de planos).
UPDATE public.planos_da_plataforma
SET descricao = replace(replace(descricao, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')
WHERE descricao LIKE '%Cortaí%' OR descricao LIKE '%CortAI%';
--> statement-breakpoint

-- Negócio de demonstração (dados fictícios): nome, descrição e boas-vindas.
UPDATE public.tenants
SET nome = replace(nome, 'Cortaí', 'Flow'),
    descricao = replace(replace(descricao, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow'),
    texto_boas_vindas = replace(replace(texto_boas_vindas, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')
WHERE id = '0de00000-0000-4000-8000-000000000001'
  AND (nome LIKE '%Cortaí%' OR descricao LIKE '%Cortaí%' OR texto_boas_vindas LIKE '%Cortaí%');
--> statement-breakpoint

-- Mensagem de boas-vindas da IA (a assistente agora se apresenta como Flow IA).
UPDATE public.config_atendimento_ia
SET mensagem_boas_vindas = replace(
      replace(replace(mensagem_boas_vindas, 'o CortAI', 'a Flow IA'), 'CortAI', 'Flow IA'),
      'Cortaí', 'Flow')
WHERE mensagem_boas_vindas LIKE '%CortAI%' OR mensagem_boas_vindas LIKE '%Cortaí%';
--> statement-breakpoint

-- Textos da home pública editados em /admin/home (rascunho e publicado).
UPDATE public.home_publica
SET rascunho = replace(replace(rascunho::text, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')::jsonb,
    publicado = replace(replace(publicado::text, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')::jsonb
WHERE rascunho::text LIKE '%Cortaí%' OR publicado::text LIKE '%Cortaí%'
   OR rascunho::text LIKE '%CortAI%' OR publicado::text LIKE '%CortAI%';
