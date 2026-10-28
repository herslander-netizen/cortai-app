-- Categorias personalizáveis por negócio; os serviços continuam ligados pelo rótulo legado.
-- Esta migração é aditiva e deve ser aplicada apenas após autorização explícita para a prévia.
CREATE TABLE IF NOT EXISTS public.categorias_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 40),
  cor text NOT NULL CHECK (cor IN ('roxo','azul','verde','rosa','vermelho','amarelo','laranja','turquesa','cinza')),
  ordem integer NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 500),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categorias_servicos_tenant_nome_uidx
  ON public.categorias_servicos (tenant_id, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS categorias_servicos_tenant_ordem_idx
  ON public.categorias_servicos (tenant_id, ordem, nome);

ALTER TABLE public.categorias_servicos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.categorias_servicos FROM anon, authenticated;
GRANT SELECT ON public.categorias_servicos TO authenticated;
GRANT ALL ON public.categorias_servicos TO service_role;

DROP POLICY IF EXISTS "membros leem categorias de servicos" ON public.categorias_servicos;
CREATE POLICY "membros leem categorias de servicos"
  ON public.categorias_servicos
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE OR REPLACE FUNCTION public.salvar_categoria_servicos(
  _tenant_id uuid,
  _categoria_id uuid,
  _nome_anterior text,
  _nome text,
  _cor text,
  _ordem integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_categoria public.categorias_servicos%ROWTYPE;
  v_nome_anterior text;
  v_nome text := btrim(_nome);
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'negocio invalido';
  END IF;
  IF v_nome IS NULL OR char_length(v_nome) < 2 OR char_length(v_nome) > 40 THEN
    RAISE EXCEPTION 'o nome deve ter entre 2 e 40 caracteres';
  END IF;
  IF _cor NOT IN ('roxo','azul','verde','rosa','vermelho','amarelo','laranja','turquesa','cinza') THEN
    RAISE EXCEPTION 'cor de categoria invalida';
  END IF;
  IF _ordem IS NULL OR _ordem < 0 OR _ordem > 500 THEN
    RAISE EXCEPTION 'ordem de categoria invalida';
  END IF;

  IF lower(v_nome) = 'outros serviços' THEN
    RAISE EXCEPTION 'a categoria padrao nao pode ser personalizada';
  END IF;

  IF _categoria_id IS NOT NULL THEN
    SELECT * INTO v_categoria
      FROM public.categorias_servicos
     WHERE id = _categoria_id
       AND tenant_id = _tenant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'categoria nao encontrada para este negocio';
    END IF;
    v_nome_anterior := v_categoria.nome;
  ELSE
    v_nome_anterior := NULLIF(btrim(_nome_anterior), '');
  END IF;

  IF v_nome_anterior IS NOT NULL AND lower(btrim(v_nome_anterior)) = 'outros serviços' THEN
    RAISE EXCEPTION 'a categoria padrao nao pode ser personalizada';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.categorias_servicos c
     WHERE c.tenant_id = _tenant_id
       AND lower(btrim(c.nome)) = lower(v_nome)
       AND c.id IS DISTINCT FROM _categoria_id
  ) THEN
    RAISE EXCEPTION 'ja existe uma categoria com esse nome';
  END IF;

  IF v_nome_anterior IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.servicos s
       WHERE s.tenant_id = _tenant_id
         AND lower(btrim(COALESCE(s.categoria, ''))) = lower(v_nome)
    ) THEN
      RAISE EXCEPTION 'ja existe uma categoria com esse nome';
    END IF;
  ELSIF v_nome_anterior <> v_nome THEN
    IF EXISTS (
      SELECT 1 FROM public.servicos s
       WHERE s.tenant_id = _tenant_id
         AND lower(btrim(COALESCE(s.categoria, ''))) = lower(v_nome)
         AND lower(btrim(COALESCE(s.categoria, ''))) <> lower(btrim(v_nome_anterior))
    ) THEN
      RAISE EXCEPTION 'ja existe uma categoria com esse nome';
    END IF;
    UPDATE public.servicos
       SET categoria = v_nome
     WHERE tenant_id = _tenant_id
       AND categoria = v_nome_anterior;
  END IF;

  IF _categoria_id IS NULL THEN
    INSERT INTO public.categorias_servicos (tenant_id, nome, cor, ordem)
    VALUES (_tenant_id, v_nome, _cor, _ordem)
    RETURNING * INTO v_categoria;
  ELSE
    UPDATE public.categorias_servicos
       SET nome = v_nome, cor = _cor, ordem = _ordem
     WHERE id = _categoria_id
       AND tenant_id = _tenant_id
    RETURNING * INTO v_categoria;
  END IF;

  RETURN jsonb_build_object(
    'id', v_categoria.id,
    'nome', v_categoria.nome,
    'cor', v_categoria.cor,
    'ordem', v_categoria.ordem
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.salvar_categoria_servicos(uuid, uuid, text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_categoria_servicos(uuid, uuid, text, text, text, integer)
  TO service_role;

COMMENT ON TABLE public.categorias_servicos IS
  'Categorias personalizadas por negócio; rótulos existentes em servicos.categoria permanecem compatíveis.';
