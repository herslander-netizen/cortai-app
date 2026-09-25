ALTER TABLE public.tenants ALTER COLUMN cor_primaria SET DEFAULT '#C9A96A';
ALTER TABLE public.configuracoes_da_plataforma ALTER COLUMN cor_primaria SET DEFAULT '#C9A96A';

UPDATE public.tenants
SET cor_primaria = '#C9A96A'
WHERE upper(cor_primaria) IN ('#D4AF6A', '#C9A227');

UPDATE public.configuracoes_da_plataforma
SET cor_primaria = '#C9A96A', atualizado_em = now()
WHERE upper(cor_primaria) IN ('#D4AF6A', '#C9A227');