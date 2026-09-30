ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plano_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plano_check CHECK (plano IN ('essencial','pro','conecta','studio'));

UPDATE public.planos_da_plataforma SET nome='Essencial', preco_mensal_centavos=1990, ordem=1,
  descricao='Agenda, clientes, serviços, histórico básico e cadastro de profissionais.' WHERE chave='essencial';
UPDATE public.planos_da_plataforma SET nome='Profissional', preco_mensal_centavos=2990, ordem=2,
  descricao='Tudo do Essencial, com Modo Foco, encaixes, comanda, caixa e histórico completo.' WHERE chave='pro';
UPDATE public.planos_da_plataforma SET nome='Equipe', preco_mensal_centavos=4990, ordem=4,
  descricao='Tudo do Conecta, com gestão avançada de equipe, permissões e visão gerencial.' WHERE chave='studio';
INSERT INTO public.planos_da_plataforma (chave, nome, descricao, preco_mensal_centavos, preco_anual_centavos, dias_teste, limite_profissionais, ordem, ativo)
SELECT 'conecta','Conecta','Tudo do Profissional, com Secretária Cortaí, agendamento pelo cliente, WhatsApp e confirmações automáticas.',3990,0,0,limite_profissionais,3,true
FROM public.planos_da_plataforma WHERE chave='pro'
ON CONFLICT (chave) DO NOTHING;

-- Recursos já existentes continuam iguais; Conecta herda o que o Profissional libera.
INSERT INTO public.recursos_de_plano (plano, chave, rotulo, descricao, liberado)
SELECT 'conecta', chave, rotulo, descricao, liberado FROM public.recursos_de_plano WHERE plano='pro'
ON CONFLICT (plano, chave) DO NOTHING;

INSERT INTO public.recursos_de_plano (plano, chave, rotulo, liberado)
SELECT p.plano, r.chave, r.rotulo,
  CASE r.minimo WHEN 'pro' THEN p.plano <> 'essencial'
                WHEN 'conecta' THEN p.plano IN ('conecta','studio')
                ELSE p.plano = 'studio' END
FROM (VALUES ('essencial'),('pro'),('conecta'),('studio')) AS p(plano)
CROSS JOIN (VALUES ('modo_foco','pro','Modo Foco'),('comanda_caixa','pro','Comanda e caixa'),('historico_completo','pro','Histórico completo'),
                   ('secretaria_whatsapp','conecta','Secretária Cortaí e WhatsApp'),('equipe_avancada','studio','Gestão avançada de equipe')) AS r(chave, minimo, rotulo)
ON CONFLICT (plano, chave) DO UPDATE SET liberado = EXCLUDED.liberado;

UPDATE public.recursos_de_plano SET liberado = (plano <> 'essencial') WHERE chave='agendamento_manual';

CREATE OR REPLACE FUNCTION public.recurso_do_tenant_ativo(_tenant_id uuid, _chave text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT ativo FROM public.recursos_do_tenant WHERE tenant_id = _tenant_id AND chave = _chave), true)
     AND COALESCE((SELECT rp.liberado FROM public.recursos_de_plano rp
                   JOIN public.tenants t ON t.plano = rp.plano
                   WHERE t.id = _tenant_id AND rp.chave = _chave), true);
$$;