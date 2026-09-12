export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cancelado_em: string | null
          cliente_id: string
          criado_em: string
          fim: string
          forma_pagamento: string | null
          id: string
          inicio: string
          profissional_id: string | null
          recorrencia: string | null
          servico_id: string | null
          status: string
          tenant_id: string
          valor_centavos: number
        }
        Insert: {
          cancelado_em?: string | null
          cliente_id: string
          criado_em?: string
          fim: string
          forma_pagamento?: string | null
          id?: string
          inicio: string
          profissional_id?: string | null
          recorrencia?: string | null
          servico_id?: string | null
          status?: string
          tenant_id: string
          valor_centavos?: number
        }
        Update: {
          cancelado_em?: string | null
          cliente_id?: string
          criado_em?: string
          fim?: string
          forma_pagamento?: string | null
          id?: string
          inicio?: string
          profissional_id?: string | null
          recorrencia?: string | null
          servico_id?: string | null
          status?: string
          tenant_id?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          agendamento_id: string
          cliente_id: string | null
          comentario: string | null
          convite_publico_enviado: boolean
          criado_em: string
          id: string
          nota: number
          profissional_id: string | null
          tenant_id: string
        }
        Insert: {
          agendamento_id: string
          cliente_id?: string | null
          comentario?: string | null
          convite_publico_enviado?: boolean
          criado_em?: string
          id?: string
          nota: number
          profissional_id?: string | null
          tenant_id: string
        }
        Update: {
          agendamento_id?: string
          cliente_id?: string | null
          comentario?: string | null
          convite_publico_enviado?: boolean
          criado_em?: string
          id?: string
          nota?: number
          profissional_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: true
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      carteiras: {
        Row: {
          atualizado_em: string
          cliente_id: string
          fidelidade_progresso: number
          id: string
          saldo_centavos: number
          saldo_creditos: number
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          cliente_id: string
          fidelidade_progresso?: number
          id?: string
          saldo_centavos?: number
          saldo_creditos?: number
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string
          fidelidade_progresso?: number
          id?: string
          saldo_centavos?: number
          saldo_creditos?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carteiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carteiras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          arquivado_em: string | null
          criado_em: string
          ficha_tecnica: string | null
          id: string
          limite_fiado_centavos: number
          nome: string
          opt_in_em: string | null
          opt_in_whatsapp: boolean
          origem: string
          telefone: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          arquivado_em?: string | null
          criado_em?: string
          ficha_tecnica?: string | null
          id?: string
          limite_fiado_centavos?: number
          nome: string
          opt_in_em?: string | null
          opt_in_whatsapp?: boolean
          origem?: string
          telefone: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          arquivado_em?: string | null
          criado_em?: string
          ficha_tecnica?: string | null
          id?: string
          limite_fiado_centavos?: number
          nome?: string
          opt_in_em?: string | null
          opt_in_whatsapp?: boolean
          origem?: string
          telefone?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_da_plataforma: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          cor_fundo: string
          cor_primaria: string
          cor_superficie: string
          cor_texto: string
          id: boolean
          preco_essencial_centavos: number
          preco_pro_centavos: number
          preco_studio_centavos: number
          raio_px: number
          tipografia: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          cor_fundo?: string
          cor_primaria?: string
          cor_superficie?: string
          cor_texto?: string
          id?: boolean
          preco_essencial_centavos?: number
          preco_pro_centavos?: number
          preco_studio_centavos?: number
          raio_px?: number
          tipografia?: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          cor_fundo?: string
          cor_primaria?: string
          cor_superficie?: string
          cor_texto?: string
          id?: boolean
          preco_essencial_centavos?: number
          preco_pro_centavos?: number
          preco_studio_centavos?: number
          raio_px?: number
          tipografia?: string
        }
        Relationships: []
      }
      contatos_de_retencao: {
        Row: {
          canal: string
          criado_em: string
          criado_por: string
          id: string
          observacao: string | null
          resultado: string
          tenant_id: string
        }
        Insert: {
          canal: string
          criado_em?: string
          criado_por: string
          id?: string
          observacao?: string | null
          resultado: string
          tenant_id: string
        }
        Update: {
          canal?: string
          criado_em?: string
          criado_por?: string
          id?: string
          observacao?: string | null
          resultado?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_de_retencao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emails_admin_autorizados: {
        Row: {
          criado_em: string
          email: string
        }
        Insert: {
          criado_em?: string
          email: string
        }
        Update: {
          criado_em?: string
          email?: string
        }
        Relationships: []
      }
      fila_de_espera: {
        Row: {
          avisado_em: string | null
          cliente_id: string
          criado_em: string
          id: string
          janela_preferida: Json | null
          posicao: number
          profissional_id: string | null
          tenant_id: string
        }
        Insert: {
          avisado_em?: string | null
          cliente_id: string
          criado_em?: string
          id?: string
          janela_preferida?: Json | null
          posicao?: number
          profissional_id?: string | null
          tenant_id: string
        }
        Update: {
          avisado_em?: string | null
          cliente_id?: string
          criado_em?: string
          id?: string
          janela_preferida?: Json | null
          posicao?: number
          profissional_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_de_espera_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_de_espera_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_de_espera_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_de_plano: {
        Row: {
          criado_em: string
          id: string
          plano_de: string
          plano_para: string
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          plano_de: string
          plano_para: string
          tenant_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          plano_de?: string
          plano_para?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_de_plano_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacoes: {
        Row: {
          convertido_em: string | null
          criado_em: string
          id: string
          indicado_cliente_id: string | null
          indicado_nome: string
          indicador_cliente_id: string | null
          recompensa: string | null
          recompensa_entregue: boolean
          status: string
          tenant_id: string
        }
        Insert: {
          convertido_em?: string | null
          criado_em?: string
          id?: string
          indicado_cliente_id?: string | null
          indicado_nome: string
          indicador_cliente_id?: string | null
          recompensa?: string | null
          recompensa_entregue?: boolean
          status?: string
          tenant_id: string
        }
        Update: {
          convertido_em?: string | null
          criado_em?: string
          id?: string
          indicado_cliente_id?: string | null
          indicado_nome?: string
          indicador_cliente_id?: string | null
          recompensa?: string | null
          recompensa_entregue?: boolean
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicacoes_indicado_cliente_id_fkey"
            columns: ["indicado_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_indicador_cliente_id_fkey"
            columns: ["indicador_cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentos: {
        Row: {
          agendamento_id: string | null
          carteira_id: string
          centavos_delta: number
          creditos_delta: number
          criado_em: string
          criado_por: string | null
          descricao: string | null
          expira_em: string | null
          id: string
          origem: string | null
          tipo: string
        }
        Insert: {
          agendamento_id?: string | null
          carteira_id: string
          centavos_delta?: number
          creditos_delta?: number
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          expira_em?: string | null
          id?: string
          origem?: string | null
          tipo: string
        }
        Update: {
          agendamento_id?: string | null
          carteira_id?: string
          centavos_delta?: number
          creditos_delta?: number
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          expira_em?: string | null
          id?: string
          origem?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "carteiras"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          atualizado_em: string
          criado_em: string
          nome: string | null
          telefone: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          nome?: string | null
          telefone?: string | null
          tipo?: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          nome?: string | null
          telefone?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string
          criado_em: string
          custo_centavos: number
          estoque_minimo: number
          foto_url: string | null
          id: string
          nome: string
          preco_centavos: number
          quantidade: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          custo_centavos?: number
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          nome: string
          preco_centavos?: number
          quantidade?: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          custo_centavos?: number
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          nome?: string
          preco_centavos?: number
          quantidade?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          portfolio: Json
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          portfolio?: Json
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          portfolio?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_de_plano: {
        Row: {
          ativo: boolean
          bloqueia_agendamento_no_limite: boolean
          cota: number | null
          criado_em: string
          fidelidade_alvo: number | null
          id: string
          no_show_consome: boolean
          preco_centavos: number
          restricao_horario: Json | null
          rollover_max: number
          so_dono_libera_fiado: boolean
          tenant_id: string
          tipo: string
          validade_dias: number | null
        }
        Insert: {
          ativo?: boolean
          bloqueia_agendamento_no_limite?: boolean
          cota?: number | null
          criado_em?: string
          fidelidade_alvo?: number | null
          id?: string
          no_show_consome?: boolean
          preco_centavos?: number
          restricao_horario?: Json | null
          rollover_max?: number
          so_dono_libera_fiado?: boolean
          tenant_id: string
          tipo: string
          validade_dias?: number | null
        }
        Update: {
          ativo?: boolean
          bloqueia_agendamento_no_limite?: boolean
          cota?: number | null
          criado_em?: string
          fidelidade_alvo?: number | null
          id?: string
          no_show_consome?: boolean
          preco_centavos?: number
          restricao_horario?: Json | null
          rollover_max?: number
          so_dono_libera_fiado?: boolean
          tenant_id?: string
          tipo?: string
          validade_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_de_plano_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          criado_em: string
          duracao_min: number
          id: string
          nome: string
          ordem: number
          preco_centavos: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          duracao_min?: number
          id?: string
          nome: string
          ordem?: number
          preco_centavos?: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          duracao_min?: number
          id?: string
          nome?: string
          ordem?: number
          preco_centavos?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestoes_da_plataforma: {
        Row: {
          atualizado_em: string
          canal: string
          criado_em: string
          criado_por: string
          id: string
          motivo: string
          pedido: string
          status: string
          tenants_que_pediram: string[]
        }
        Insert: {
          atualizado_em?: string
          canal: string
          criado_em?: string
          criado_por: string
          id?: string
          motivo: string
          pedido: string
          status?: string
          tenants_que_pediram?: string[]
        }
        Update: {
          atualizado_em?: string
          canal?: string
          criado_em?: string
          criado_por?: string
          id?: string
          motivo?: string
          pedido?: string
          status?: string
          tenants_que_pediram?: string[]
        }
        Relationships: []
      }
      tenant_branding_versions: {
        Row: {
          criado_em: string
          criado_por: string | null
          id: string
          restaurado_de: string | null
          snapshot: Json
          tenant_id: string
          versao: number
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          restaurado_de?: string | null
          snapshot: Json
          tenant_id: string
          versao: number
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          restaurado_de?: string | null
          snapshot?: Json
          tenant_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_versions_restaurado_de_fkey"
            columns: ["restaurado_de"]
            isOneToOne: false
            referencedRelation: "tenant_branding_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_branding_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usuarios: {
        Row: {
          criado_em: string
          id: string
          papel: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          papel?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          papel?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usuarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          assinatura_visivel: boolean
          ativo: boolean
          capa_url: string | null
          ciclo: string
          cor_accent: string | null
          cor_primaria: string
          cor_secundaria: string | null
          criado_em: string
          desconto_percentual: number
          descricao: string | null
          endereco: string | null
          facebook: string | null
          fotos: Json
          id: string
          indicacao_ativa: boolean
          indicacao_codigo: string | null
          indicacao_recompensa: string | null
          instagram: string | null
          link_avaliacao_publica: string | null
          logo_url: string | null
          modo: string
          nome: string
          plano: string
          rotulo_carteira: string | null
          slug: string
          telefone: string | null
          tema: string
          texto_boas_vindas: string | null
          ultimo_acesso_em: string | null
          whatsapp: string | null
        }
        Insert: {
          assinatura_visivel?: boolean
          ativo?: boolean
          capa_url?: string | null
          ciclo?: string
          cor_accent?: string | null
          cor_primaria?: string
          cor_secundaria?: string | null
          criado_em?: string
          desconto_percentual?: number
          descricao?: string | null
          endereco?: string | null
          facebook?: string | null
          fotos?: Json
          id?: string
          indicacao_ativa?: boolean
          indicacao_codigo?: string | null
          indicacao_recompensa?: string | null
          instagram?: string | null
          link_avaliacao_publica?: string | null
          logo_url?: string | null
          modo?: string
          nome: string
          plano?: string
          rotulo_carteira?: string | null
          slug: string
          telefone?: string | null
          tema?: string
          texto_boas_vindas?: string | null
          ultimo_acesso_em?: string | null
          whatsapp?: string | null
        }
        Update: {
          assinatura_visivel?: boolean
          ativo?: boolean
          capa_url?: string | null
          ciclo?: string
          cor_accent?: string | null
          cor_primaria?: string
          cor_secundaria?: string | null
          criado_em?: string
          desconto_percentual?: number
          descricao?: string | null
          endereco?: string | null
          facebook?: string | null
          fotos?: Json
          id?: string
          indicacao_ativa?: boolean
          indicacao_codigo?: string | null
          indicacao_recompensa?: string | null
          instagram?: string | null
          link_avaliacao_publica?: string | null
          logo_url?: string | null
          modo?: string
          nome?: string
          plano?: string
          rotulo_carteira?: string | null
          slug?: string
          telefone?: string | null
          tema?: string
          texto_boas_vindas?: string | null
          ultimo_acesso_em?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venda_itens: {
        Row: {
          criado_em: string
          custo_unitario_centavos: number
          id: string
          nome: string
          preco_unitario_centavos: number
          produto_id: string | null
          quantidade: number
          venda_id: string
        }
        Insert: {
          criado_em?: string
          custo_unitario_centavos?: number
          id?: string
          nome: string
          preco_unitario_centavos: number
          produto_id?: string | null
          quantidade: number
          venda_id: string
        }
        Update: {
          criado_em?: string
          custo_unitario_centavos?: number
          id?: string
          nome?: string
          preco_unitario_centavos?: number
          produto_id?: string | null
          quantidade?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          agendamento_id: string | null
          categoria: string
          cliente_id: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          tenant_id: string
          total_centavos: number
        }
        Insert: {
          agendamento_id?: string | null
          categoria?: string
          cliente_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          tenant_id: string
          total_centavos?: number
        }
        Update: {
          agendamento_id?: string | null
          categoria?: string
          cliente_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          tenant_id?: string
          total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      design_da_plataforma: {
        Row: {
          cor_fundo: string | null
          cor_primaria: string | null
          cor_superficie: string | null
          cor_texto: string | null
          id: boolean | null
          raio_px: number | null
          tipografia: string | null
        }
        Insert: {
          cor_fundo?: string | null
          cor_primaria?: string | null
          cor_superficie?: string | null
          cor_texto?: string | null
          id?: boolean | null
          raio_px?: number | null
          tipografia?: string | null
        }
        Update: {
          cor_fundo?: string | null
          cor_primaria?: string | null
          cor_superficie?: string | null
          cor_texto?: string | null
          id?: boolean | null
          raio_px?: number | null
          tipografia?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancelar_agendamento: { Args: { _agendamento_id: string }; Returns: Json }
      carteira_pertence_ao_membro: {
        Args: { _carteira_id: string }
        Returns: boolean
      }
      configuracao_visual_global: {
        Args: never
        Returns: {
          cor_fundo: string
          cor_primaria: string
          cor_superficie: string
          cor_texto: string
          raio_px: number
          tipografia: string
        }[]
      }
      criar_agendamento: {
        Args: {
          _cliente_id: string
          _forma_pagamento: string
          _inicio: string
          _profissional_id: string
          _servico_id: string
          _tenant_id: string
        }
        Returns: Json
      }
      criar_barbearia: { Args: { _nome: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      marcar_falta: { Args: { _agendamento_id: string }; Returns: Json }
      registrar_acesso_do_tenant: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      registrar_venda_produto: {
        Args: {
          _forma_pagamento?: string
          _produto_id: string
          _quantidade: number
        }
        Returns: Json
      }
      unaccent_placeholder: { Args: { _texto: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "suporte"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "suporte"],
    },
  },
} as const
