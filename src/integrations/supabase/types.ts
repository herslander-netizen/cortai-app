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
      aceites_legais: {
        Row: {
          aceito: boolean
          criado_em: string
          documento: string
          id: string
          origem: string
          user_id: string
          versao: string
        }
        Insert: {
          aceito?: boolean
          criado_em?: string
          documento: string
          id?: string
          origem?: string
          user_id: string
          versao: string
        }
        Update: {
          aceito?: boolean
          criado_em?: string
          documento?: string
          id?: string
          origem?: string
          user_id?: string
          versao?: string
        }
        Relationships: []
      }
      acoes_de_ia_log: {
        Row: {
          acao: string
          conversa_id: string | null
          criado_em: string
          entrada: Json
          erro: string | null
          id: string
          intencao: string | null
          resultado: Json
          sucesso: boolean
          tenant_id: string
        }
        Insert: {
          acao: string
          conversa_id?: string | null
          criado_em?: string
          entrada?: Json
          erro?: string | null
          id?: string
          intencao?: string | null
          resultado?: Json
          sucesso?: boolean
          tenant_id: string
        }
        Update: {
          acao?: string
          conversa_id?: string | null
          criado_em?: string
          entrada?: Json
          erro?: string | null
          id?: string
          intencao?: string | null
          resultado?: Json
          sucesso?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_de_ia_log_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_de_ia_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamento_transicoes: {
        Row: {
          agendamento_id: string
          criado_em: string
          de: string | null
          id: string
          inferidos: string[]
          para: string
          por: string | null
          tenant_id: string
        }
        Insert: {
          agendamento_id: string
          criado_em?: string
          de?: string | null
          id?: string
          inferidos?: string[]
          para: string
          por?: string | null
          tenant_id: string
        }
        Update: {
          agendamento_id?: string
          criado_em?: string
          de?: string | null
          id?: string
          inferidos?: string[]
          para?: string
          por?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_transicoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_transicoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          arrived_at: string | null
          arrived_inferido: boolean
          cancelado_em: string | null
          cliente_id: string
          confirmado_em: string | null
          criado_em: string
          encaixe: boolean
          fim: string
          finished_at: string | null
          finished_inferido: boolean
          forma_pagamento: string | null
          id: string
          inicio: string
          origem: string
          pagamento_confirmado_em: string | null
          pagamento_confirmado_por: string | null
          profissional_id: string | null
          recorrencia: string | null
          servico_id: string | null
          started_at: string | null
          started_inferido: boolean
          status: string
          status_alterado_em: string | null
          status_alterado_por: string | null
          tenant_id: string
          valor_centavos: number
        }
        Insert: {
          arrived_at?: string | null
          arrived_inferido?: boolean
          cancelado_em?: string | null
          cliente_id: string
          confirmado_em?: string | null
          criado_em?: string
          encaixe?: boolean
          fim: string
          finished_at?: string | null
          finished_inferido?: boolean
          forma_pagamento?: string | null
          id?: string
          inicio: string
          origem?: string
          pagamento_confirmado_em?: string | null
          pagamento_confirmado_por?: string | null
          profissional_id?: string | null
          recorrencia?: string | null
          servico_id?: string | null
          started_at?: string | null
          started_inferido?: boolean
          status?: string
          status_alterado_em?: string | null
          status_alterado_por?: string | null
          tenant_id: string
          valor_centavos?: number
        }
        Update: {
          arrived_at?: string | null
          arrived_inferido?: boolean
          cancelado_em?: string | null
          cliente_id?: string
          confirmado_em?: string | null
          criado_em?: string
          encaixe?: boolean
          fim?: string
          finished_at?: string | null
          finished_inferido?: boolean
          forma_pagamento?: string | null
          id?: string
          inicio?: string
          origem?: string
          pagamento_confirmado_em?: string | null
          pagamento_confirmado_por?: string | null
          profissional_id?: string | null
          recorrencia?: string | null
          servico_id?: string | null
          started_at?: string | null
          started_inferido?: boolean
          status?: string
          status_alterado_em?: string | null
          status_alterado_por?: string | null
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
      auditoria_da_barbearia: {
        Row: {
          acao: string
          alvo: string
          ator_user_id: string | null
          criado_em: string
          detalhes: Json
          id: string
          tenant_id: string
        }
        Insert: {
          acao: string
          alvo: string
          ator_user_id?: string | null
          criado_em?: string
          detalhes?: Json
          id?: string
          tenant_id: string
        }
        Update: {
          acao?: string
          alvo?: string
          ator_user_id?: string | null
          criado_em?: string
          detalhes?: Json
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_da_barbearia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_de_suporte: {
        Row: {
          acao: string
          alteracoes: Json
          alvo: string
          ator_email: string | null
          ator_user_id: string | null
          criado_em: string
          id: string
          tenant_id: string
        }
        Insert: {
          acao: string
          alteracoes?: Json
          alvo: string
          ator_email?: string | null
          ator_user_id?: string | null
          criado_em?: string
          id?: string
          tenant_id: string
        }
        Update: {
          acao?: string
          alteracoes?: Json
          alvo?: string
          ator_email?: string | null
          ator_user_id?: string | null
          criado_em?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_de_suporte_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes_de_ia: {
        Row: {
          ativa: boolean
          atualizado_em: string
          chave: string
          criado_em: string
          gatilho: Json
          id: string
          mensagem: string
          tenant_id: string
        }
        Insert: {
          ativa?: boolean
          atualizado_em?: string
          chave: string
          criado_em?: string
          gatilho?: Json
          id?: string
          mensagem?: string
          tenant_id: string
        }
        Update: {
          ativa?: boolean
          atualizado_em?: string
          chave?: string
          criado_em?: string
          gatilho?: Json
          id?: string
          mensagem?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automacoes_de_ia_tenant_id_fkey"
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
      banners_da_plataforma: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          cta_destino: string | null
          cta_rotulo: string | null
          fim: string | null
          id: string
          imagem_url: string | null
          inicio: string
          plano_alvo: string | null
          prioridade: number
          segmento: string
          subtitulo: string | null
          tenant_alvo: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          cta_destino?: string | null
          cta_rotulo?: string | null
          fim?: string | null
          id?: string
          imagem_url?: string | null
          inicio?: string
          plano_alvo?: string | null
          prioridade?: number
          segmento?: string
          subtitulo?: string | null
          tenant_alvo?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          cta_destino?: string | null
          cta_rotulo?: string | null
          fim?: string | null
          id?: string
          imagem_url?: string | null
          inicio?: string
          plano_alvo?: string | null
          prioridade?: number
          segmento?: string
          subtitulo?: string | null
          tenant_alvo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_da_plataforma_tenant_alvo_fkey"
            columns: ["tenant_alvo"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_movimentos: {
        Row: {
          caixa_sessao_id: string | null
          categoria: string
          cliente_id: string | null
          comanda_id: string | null
          criado_em: string
          criado_por: string
          descricao: string
          forma_pagamento: string | null
          id: string
          motivo: string | null
          movimento_original_id: string | null
          pagamento_id: string | null
          profissional_id: string | null
          tenant_id: string
          tipo: string
          valor_centavos: number
        }
        Insert: {
          caixa_sessao_id?: string | null
          categoria: string
          cliente_id?: string | null
          comanda_id?: string | null
          criado_em?: string
          criado_por: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          motivo?: string | null
          movimento_original_id?: string | null
          pagamento_id?: string | null
          profissional_id?: string | null
          tenant_id: string
          tipo: string
          valor_centavos: number
        }
        Update: {
          caixa_sessao_id?: string | null
          categoria?: string
          cliente_id?: string | null
          comanda_id?: string | null
          criado_em?: string
          criado_por?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          motivo?: string | null
          movimento_original_id?: string | null
          pagamento_id?: string | null
          profissional_id?: string | null
          tenant_id?: string
          tipo?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_movimentos_caixa_sessao_id_fkey"
            columns: ["caixa_sessao_id"]
            isOneToOne: false
            referencedRelation: "caixa_sessoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_movimento_original_id_fkey"
            columns: ["movimento_original_id"]
            isOneToOne: false
            referencedRelation: "caixa_movimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_movimentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_sessoes: {
        Row: {
          aberto_em: string
          aberto_por: string
          diferenca_centavos: number | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          saldo_informado_centavos: number | null
          saldo_inicial_centavos: number
          status: string
          tenant_id: string
        }
        Insert: {
          aberto_em?: string
          aberto_por: string
          diferenca_centavos?: number | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          saldo_informado_centavos?: number | null
          saldo_inicial_centavos?: number
          status?: string
          tenant_id: string
        }
        Update: {
          aberto_em?: string
          aberto_por?: string
          diferenca_centavos?: number | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          saldo_informado_centavos?: number | null
          saldo_inicial_centavos?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixa_sessoes_tenant_id_fkey"
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
          alergias: string | null
          arquivado_em: string | null
          condicoes_especiais: string | null
          criado_em: string
          desconto_percentual: number | null
          ficha_chips: string[]
          ficha_tecnica: string | null
          fidelidade_participa: boolean | null
          id: string
          limite_fiado_centavos: number
          nome: string
          observacoes_internas: string | null
          opt_in_em: string | null
          opt_in_whatsapp: boolean
          origem: string
          telefone: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          alergias?: string | null
          arquivado_em?: string | null
          condicoes_especiais?: string | null
          criado_em?: string
          desconto_percentual?: number | null
          ficha_chips?: string[]
          ficha_tecnica?: string | null
          fidelidade_participa?: boolean | null
          id?: string
          limite_fiado_centavos?: number
          nome: string
          observacoes_internas?: string | null
          opt_in_em?: string | null
          opt_in_whatsapp?: boolean
          origem?: string
          telefone: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          alergias?: string | null
          arquivado_em?: string | null
          condicoes_especiais?: string | null
          criado_em?: string
          desconto_percentual?: number | null
          ficha_chips?: string[]
          ficha_tecnica?: string | null
          fidelidade_participa?: boolean | null
          id?: string
          limite_fiado_centavos?: number
          nome?: string
          observacoes_internas?: string | null
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
      comanda_itens: {
        Row: {
          comanda_id: string
          comissao_centavos: number
          comissao_percentual: number
          criado_em: string
          descricao: string
          id: string
          produto_id: string | null
          quantidade: number
          servico_id: string | null
          tipo: string
          valor_total_centavos: number
          valor_unitario_centavos: number
        }
        Insert: {
          comanda_id: string
          comissao_centavos: number
          comissao_percentual: number
          criado_em?: string
          descricao: string
          id?: string
          produto_id?: string | null
          quantidade: number
          servico_id?: string | null
          tipo: string
          valor_total_centavos: number
          valor_unitario_centavos: number
        }
        Update: {
          comanda_id?: string
          comissao_centavos?: number
          comissao_percentual?: number
          criado_em?: string
          descricao?: string
          id?: string
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          tipo?: string
          valor_total_centavos?: number
          valor_unitario_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "comanda_itens_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comanda_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      comandas: {
        Row: {
          aberta_por: string
          agendamento_id: string | null
          atualizado_em: string
          cliente_id: string
          comissao_total_centavos: number
          criado_em: string
          desconto_aplicado_por: string | null
          desconto_centavos: number
          finalizada_em: string | null
          finalizada_por: string | null
          id: string
          numero: number
          profissional_id: string | null
          status: string
          subtotal_centavos: number
          tenant_id: string
          total_centavos: number
        }
        Insert: {
          aberta_por: string
          agendamento_id?: string | null
          atualizado_em?: string
          cliente_id: string
          comissao_total_centavos?: number
          criado_em?: string
          desconto_aplicado_por?: string | null
          desconto_centavos?: number
          finalizada_em?: string | null
          finalizada_por?: string | null
          id?: string
          numero?: number
          profissional_id?: string | null
          status?: string
          subtotal_centavos?: number
          tenant_id: string
          total_centavos?: number
        }
        Update: {
          aberta_por?: string
          agendamento_id?: string | null
          atualizado_em?: string
          cliente_id?: string
          comissao_total_centavos?: number
          criado_em?: string
          desconto_aplicado_por?: string | null
          desconto_centavos?: number
          finalizada_em?: string | null
          finalizada_por?: string | null
          id?: string
          numero?: number
          profissional_id?: string | null
          status?: string
          subtotal_centavos?: number
          tenant_id?: string
          total_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "comandas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comandas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comissao_pagamentos: {
        Row: {
          id: string
          pago_em: string
          pago_por: string
          periodo_fim: string
          periodo_inicio: string
          profissional_id: string
          status: string
          tenant_id: string
          valor_centavos: number
        }
        Insert: {
          id?: string
          pago_em?: string
          pago_por: string
          periodo_fim: string
          periodo_inicio: string
          profissional_id: string
          status?: string
          tenant_id: string
          valor_centavos: number
        }
        Update: {
          id?: string
          pago_em?: string
          pago_por?: string
          periodo_fim?: string
          periodo_inicio?: string
          profissional_id?: string
          status?: string
          tenant_id?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissao_pagamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissao_pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          base_centavos: number
          comanda_id: string
          criado_em: string
          id: string
          item_comanda_id: string
          pago_em: string | null
          pago_por: string | null
          percentual: number
          profissional_id: string
          status: string
          tenant_id: string
          tipo_item: string
          valor_centavos: number
        }
        Insert: {
          base_centavos: number
          comanda_id: string
          criado_em?: string
          id?: string
          item_comanda_id: string
          pago_em?: string | null
          pago_por?: string | null
          percentual: number
          profissional_id: string
          status?: string
          tenant_id: string
          tipo_item: string
          valor_centavos: number
        }
        Update: {
          base_centavos?: number
          comanda_id?: string
          criado_em?: string
          id?: string
          item_comanda_id?: string
          pago_em?: string | null
          pago_por?: string | null
          percentual?: number
          profissional_id?: string
          status?: string
          tenant_id?: string
          tipo_item?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_item_comanda_id_fkey"
            columns: ["item_comanda_id"]
            isOneToOne: true
            referencedRelation: "comanda_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      condicoes_comerciais: {
        Row: {
          ativo: boolean
          atualizado_em: string
          ciclo: string
          criado_em: string
          criado_por: string | null
          desconto_centavos: number
          desconto_percentual: number
          fim: string | null
          id: string
          inicio: string
          limites: Json
          motivo: string | null
          plano_chave: string
          preco_personalizado_centavos: number | null
          recursos: string[]
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          ciclo?: string
          criado_em?: string
          criado_por?: string | null
          desconto_centavos?: number
          desconto_percentual?: number
          fim?: string | null
          id?: string
          inicio?: string
          limites?: Json
          motivo?: string | null
          plano_chave: string
          preco_personalizado_centavos?: number | null
          recursos?: string[]
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          ciclo?: string
          criado_em?: string
          criado_por?: string | null
          desconto_centavos?: number
          desconto_percentual?: number
          fim?: string | null
          id?: string
          inicio?: string
          limites?: Json
          motivo?: string | null
          plano_chave?: string
          preco_personalizado_centavos?: number | null
          recursos?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condicoes_comerciais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_whatsapp: {
        Row: {
          atualizado_em: string
          compartilhada: boolean
          conectado_em: string | null
          criado_em: string
          desconectado_em: string | null
          id: string
          nome_exibicao: string | null
          numero: string | null
          provedor: string
          qr_code: string | null
          qr_expira_em: string | null
          sessao_id: string
          status: string
          tenant_id: string
          ultimo_erro: string | null
          visto_em: string | null
        }
        Insert: {
          atualizado_em?: string
          compartilhada?: boolean
          conectado_em?: string | null
          criado_em?: string
          desconectado_em?: string | null
          id?: string
          nome_exibicao?: string | null
          numero?: string | null
          provedor?: string
          qr_code?: string | null
          qr_expira_em?: string | null
          sessao_id: string
          status?: string
          tenant_id: string
          ultimo_erro?: string | null
          visto_em?: string | null
        }
        Update: {
          atualizado_em?: string
          compartilhada?: boolean
          conectado_em?: string | null
          criado_em?: string
          desconectado_em?: string | null
          id?: string
          nome_exibicao?: string | null
          numero?: string | null
          provedor?: string
          qr_code?: string | null
          qr_expira_em?: string | null
          sessao_id?: string
          status?: string
          tenant_id?: string
          ultimo_erro?: string | null
          visto_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_whatsapp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      config_atendimento_ia: {
        Row: {
          atendimento_automatico: boolean
          atualizado_em: string
          confirmacao_automatica: boolean
          criado_em: string
          encaminhamento_humano: boolean
          horario_dias: number[]
          horario_fim: string
          horario_inicio: string
          horario_proprio: boolean
          instrucoes_extras: string
          lembretes: boolean
          link_pagamento: string
          mensagem_boas_vindas: string
          mensagem_fora_do_horario: string
          pagamento_antecipado: boolean
          permite_cancelar: boolean
          permite_confirmar: boolean
          permite_remarcar: boolean
          recuperacao_ativa: boolean
          recuperacao_dias: number
          responder_whatsapp: boolean
          saudacao_ativa: boolean
          situacoes_desligadas: string[]
          tenant_id: string
          textos_conversa: Json
          tom: string
        }
        Insert: {
          atendimento_automatico?: boolean
          atualizado_em?: string
          confirmacao_automatica?: boolean
          criado_em?: string
          encaminhamento_humano?: boolean
          horario_dias?: number[]
          horario_fim?: string
          horario_inicio?: string
          horario_proprio?: boolean
          instrucoes_extras?: string
          lembretes?: boolean
          link_pagamento?: string
          mensagem_boas_vindas?: string
          mensagem_fora_do_horario?: string
          pagamento_antecipado?: boolean
          permite_cancelar?: boolean
          permite_confirmar?: boolean
          permite_remarcar?: boolean
          recuperacao_ativa?: boolean
          recuperacao_dias?: number
          responder_whatsapp?: boolean
          saudacao_ativa?: boolean
          situacoes_desligadas?: string[]
          tenant_id: string
          textos_conversa?: Json
          tom?: string
        }
        Update: {
          atendimento_automatico?: boolean
          atualizado_em?: string
          confirmacao_automatica?: boolean
          criado_em?: string
          encaminhamento_humano?: boolean
          horario_dias?: number[]
          horario_fim?: string
          horario_inicio?: string
          horario_proprio?: boolean
          instrucoes_extras?: string
          lembretes?: boolean
          link_pagamento?: string
          mensagem_boas_vindas?: string
          mensagem_fora_do_horario?: string
          pagamento_antecipado?: boolean
          permite_cancelar?: boolean
          permite_confirmar?: boolean
          permite_remarcar?: boolean
          recuperacao_ativa?: boolean
          recuperacao_dias?: number
          responder_whatsapp?: boolean
          saudacao_ativa?: boolean
          situacoes_desligadas?: string[]
          tenant_id?: string
          textos_conversa?: Json
          tom?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_atendimento_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          facebook_cortai: string | null
          id: boolean
          instagram_cortai: string | null
          preco_essencial_centavos: number
          preco_pro_centavos: number
          preco_studio_centavos: number
          raio_px: number
          tiktok_cortai: string | null
          tipografia: string
          whatsapp_alvo: string | null
          youtube_cortai: string | null
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          cor_fundo?: string
          cor_primaria?: string
          cor_superficie?: string
          cor_texto?: string
          facebook_cortai?: string | null
          id?: boolean
          instagram_cortai?: string | null
          preco_essencial_centavos?: number
          preco_pro_centavos?: number
          preco_studio_centavos?: number
          raio_px?: number
          tiktok_cortai?: string | null
          tipografia?: string
          whatsapp_alvo?: string | null
          youtube_cortai?: string | null
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          cor_fundo?: string
          cor_primaria?: string
          cor_superficie?: string
          cor_texto?: string
          facebook_cortai?: string | null
          id?: boolean
          instagram_cortai?: string | null
          preco_essencial_centavos?: number
          preco_pro_centavos?: number
          preco_studio_centavos?: number
          raio_px?: number
          tiktok_cortai?: string | null
          tipografia?: string
          whatsapp_alvo?: string | null
          youtube_cortai?: string | null
        }
        Relationships: []
      }
      configuracoes_financeiras: {
        Row: {
          atualizado_em: string
          barbeiro_recebe: boolean
          comissao_produto_percentual: number
          comissao_servico_percentual: number
          criado_em: string
          pix_ativo: boolean
          pix_chave: string | null
          pix_tipo: string | null
          pix_whatsapp: string | null
          tenant_id: string
        }
        Insert: {
          atualizado_em?: string
          barbeiro_recebe?: boolean
          comissao_produto_percentual?: number
          comissao_servico_percentual?: number
          criado_em?: string
          pix_ativo?: boolean
          pix_chave?: string | null
          pix_tipo?: string | null
          pix_whatsapp?: string | null
          tenant_id: string
        }
        Update: {
          atualizado_em?: string
          barbeiro_recebe?: boolean
          comissao_produto_percentual?: number
          comissao_servico_percentual?: number
          criado_em?: string
          pix_ativo?: boolean
          pix_chave?: string | null
          pix_tipo?: string | null
          pix_whatsapp?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_financeiras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      conversas_de_ia: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          tenant_id: string
          titulo: string | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          tenant_id: string
          titulo?: string | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          tenant_id?: string
          titulo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_de_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas_whatsapp: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          conexao_id: string | null
          contexto: Json
          criado_em: string
          ia_ativa: boolean
          id: string
          intencao: string | null
          modo_humano: boolean
          nao_lidas: number
          nome_contato: string | null
          status: string
          telefone: string
          tenant_id: string
          ultima_mensagem_em: string | null
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          conexao_id?: string | null
          contexto?: Json
          criado_em?: string
          ia_ativa?: boolean
          id?: string
          intencao?: string | null
          modo_humano?: boolean
          nao_lidas?: number
          nome_contato?: string | null
          status?: string
          telefone: string
          tenant_id: string
          ultima_mensagem_em?: string | null
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          conexao_id?: string | null
          contexto?: Json
          criado_em?: string
          ia_ativa?: boolean
          id?: string
          intencao?: string | null
          modo_humano?: boolean
          nao_lidas?: number
          nome_contato?: string | null
          status?: string
          telefone?: string
          tenant_id?: string
          ultima_mensagem_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_whatsapp_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_whatsapp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean
          atualizado_em: string
          codigo: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          fim: string | null
          id: string
          inicio: string
          planos: string[]
          publico: string
          tipo: string
          usos: number
          usos_max: number | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          planos?: string[]
          publico?: string
          tipo?: string
          usos?: number
          usos_max?: number | null
          valor: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          fim?: string | null
          id?: string
          inicio?: string
          planos?: string[]
          publico?: string
          tipo?: string
          usos?: number
          usos_max?: number | null
          valor?: number
        }
        Relationships: []
      }
      cupons_usos: {
        Row: {
          aplicado_por: string | null
          criado_em: string
          cupom_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          aplicado_por?: string | null
          criado_em?: string
          cupom_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          aplicado_por?: string | null
          criado_em?: string
          cupom_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupons_usos_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_usos_tenant_id_fkey"
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
      envios_de_whatsapp: {
        Row: {
          acoes: string[]
          agendamento_id: string | null
          aguarda_resposta: boolean
          atualizado_em: string
          canal: string
          cliente_id: string | null
          conteudo: string | null
          criado_em: string
          enviado_em: string | null
          erro: string | null
          id: string
          mensagem_externa_id: string | null
          respondido_em: string | null
          status: string
          telefone: string
          tenant_id: string
          tentativas: number
          tipo: string
          valido_ate: string | null
        }
        Insert: {
          acoes?: string[]
          agendamento_id?: string | null
          aguarda_resposta?: boolean
          atualizado_em?: string
          canal?: string
          cliente_id?: string | null
          conteudo?: string | null
          criado_em?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem_externa_id?: string | null
          respondido_em?: string | null
          status?: string
          telefone: string
          tenant_id: string
          tentativas?: number
          tipo?: string
          valido_ate?: string | null
        }
        Update: {
          acoes?: string[]
          agendamento_id?: string | null
          aguarda_resposta?: boolean
          atualizado_em?: string
          canal?: string
          cliente_id?: string | null
          conteudo?: string | null
          criado_em?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem_externa_id?: string | null
          respondido_em?: string | null
          status?: string
          telefone?: string
          tenant_id?: string
          tentativas?: number
          tipo?: string
          valido_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envios_de_whatsapp_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_de_whatsapp_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_de_whatsapp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_de_ia: {
        Row: {
          chave_idempotencia: string
          criado_em: string
          id: string
          payload: Json
          processado_em: string | null
          provedor: string
          status: string
          tenant_id: string
          tentativas: number
          tipo: string
          ultimo_erro: string | null
        }
        Insert: {
          chave_idempotencia: string
          criado_em?: string
          id?: string
          payload?: Json
          processado_em?: string | null
          provedor?: string
          status?: string
          tenant_id: string
          tentativas?: number
          tipo: string
          ultimo_erro?: string | null
        }
        Update: {
          chave_idempotencia?: string
          criado_em?: string
          id?: string
          payload?: Json
          processado_em?: string | null
          provedor?: string
          status?: string
          tenant_id?: string
          tentativas?: number
          tipo?: string
          ultimo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_de_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_recebidos_de_ia: {
        Row: {
          criado_em: string
          erro: string | null
          evento_externo_id: string
          id: string
          payload: Json
          processado_em: string | null
          provedor: string
          status: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          erro?: string | null
          evento_externo_id: string
          id?: string
          payload?: Json
          processado_em?: string | null
          provedor?: string
          status?: string
          tenant_id: string
          tipo: string
        }
        Update: {
          criado_em?: string
          erro?: string | null
          evento_externo_id?: string
          id?: string
          payload?: Json
          processado_em?: string | null
          provedor?: string
          status?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_recebidos_de_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiados: {
        Row: {
          cliente_id: string
          comanda_id: string
          criado_em: string
          criado_por: string
          id: string
          profissional_id: string | null
          quitado_em: string | null
          saldo_centavos: number
          status: string
          tenant_id: string
          valor_centavos: number
          valor_pago_centavos: number
        }
        Insert: {
          cliente_id: string
          comanda_id: string
          criado_em?: string
          criado_por: string
          id?: string
          profissional_id?: string | null
          quitado_em?: string | null
          saldo_centavos: number
          status?: string
          tenant_id: string
          valor_centavos: number
          valor_pago_centavos?: number
        }
        Update: {
          cliente_id?: string
          comanda_id?: string
          criado_em?: string
          criado_por?: string
          id?: string
          profissional_id?: string | null
          quitado_em?: string | null
          saldo_centavos?: number
          status?: string
          tenant_id?: string
          valor_centavos?: number
          valor_pago_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiados_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: true
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiados_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_de_espera: {
        Row: {
          avisado_em: string | null
          cliente_id: string
          criado_em: string
          id: string
          janela_preferida: Json | null
          origem: string
          posicao: number
          profissional_id: string | null
          servico_id: string | null
          status: string
          tenant_id: string
          token_publico: string | null
        }
        Insert: {
          avisado_em?: string | null
          cliente_id: string
          criado_em?: string
          id?: string
          janela_preferida?: Json | null
          origem?: string
          posicao?: number
          profissional_id?: string | null
          servico_id?: string | null
          status?: string
          tenant_id: string
          token_publico?: string | null
        }
        Update: {
          avisado_em?: string | null
          cliente_id?: string
          criado_em?: string
          id?: string
          janela_preferida?: Json | null
          origem?: string
          posicao?: number
          profissional_id?: string | null
          servico_id?: string | null
          status?: string
          tenant_id?: string
          token_publico?: string | null
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
            foreignKeyName: "fila_de_espera_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
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
      fotos_de_corte: {
        Row: {
          agendamento_id: string | null
          caminho: string
          cliente_id: string
          consentimento_em: string
          criado_em: string
          id: string
          registrado_por: string
          tenant_id: string
        }
        Insert: {
          agendamento_id?: string | null
          caminho: string
          cliente_id: string
          consentimento_em: string
          criado_em?: string
          id?: string
          registrado_por: string
          tenant_id: string
        }
        Update: {
          agendamento_id?: string | null
          caminho?: string
          cliente_id?: string
          consentimento_em?: string
          criado_em?: string
          id?: string
          registrado_por?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_de_corte_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_de_corte_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_de_corte_tenant_id_fkey"
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
      home_publica: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          id: boolean
          publicado: Json
          publicado_em: string | null
          rascunho: Json
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          id?: boolean
          publicado?: Json
          publicado_em?: string | null
          rascunho?: Json
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          id?: boolean
          publicado?: Json
          publicado_em?: string | null
          rascunho?: Json
        }
        Relationships: []
      }
      home_publica_versoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          id: string
          rotulo: string | null
          snapshot: Json
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          rotulo?: string | null
          snapshot: Json
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          rotulo?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      horarios_de_funcionamento: {
        Row: {
          abre: string
          atualizado_em: string
          criado_em: string
          dia_semana: number
          fecha: string
          fechado: boolean
          id: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
          tenant_id: string
        }
        Insert: {
          abre?: string
          atualizado_em?: string
          criado_em?: string
          dia_semana: number
          fecha?: string
          fechado?: boolean
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          tenant_id: string
        }
        Update: {
          abre?: string
          atualizado_em?: string
          criado_em?: string
          dia_semana?: number
          fecha?: string
          fechado?: boolean
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_de_funcionamento_tenant_id_fkey"
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
      informacoes_da_barbearia: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          ordem: number
          pergunta: string
          resposta: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          ordem?: number
          pergunta: string
          resposta: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          ordem?: number
          pergunta?: string
          resposta?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "informacoes_da_barbearia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_de_ia: {
        Row: {
          agent_name: string | null
          agent_persona: Json
          atualizado_em: string
          conectado_em: string | null
          criado_em: string
          external_agent_id: string | null
          external_tenant_id: string | null
          id: string
          metadata: Json
          provedor: string
          status: string
          tenant_id: string
          token_criado_em: string | null
          token_hash: string | null
          token_prefixo: string | null
          token_usado_em: string | null
          ultima_sincronizacao_em: string | null
          ultimo_erro: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_persona?: Json
          atualizado_em?: string
          conectado_em?: string | null
          criado_em?: string
          external_agent_id?: string | null
          external_tenant_id?: string | null
          id?: string
          metadata?: Json
          provedor?: string
          status?: string
          tenant_id: string
          token_criado_em?: string | null
          token_hash?: string | null
          token_prefixo?: string | null
          token_usado_em?: string | null
          ultima_sincronizacao_em?: string | null
          ultimo_erro?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_persona?: Json
          atualizado_em?: string
          conectado_em?: string | null
          criado_em?: string
          external_agent_id?: string | null
          external_tenant_id?: string | null
          id?: string
          metadata?: Json
          provedor?: string
          status?: string
          tenant_id?: string
          token_criado_em?: string | null
          token_hash?: string | null
          token_prefixo?: string | null
          token_usado_em?: string | null
          ultima_sincronizacao_em?: string | null
          ultimo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_de_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memoria_do_cliente: {
        Row: {
          atualizado_em: string
          chave: string
          cliente_id: string
          criado_em: string
          id: string
          origem: string
          tenant_id: string
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          cliente_id: string
          criado_em?: string
          id?: string
          origem?: string
          tenant_id: string
          valor: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          cliente_id?: string
          criado_em?: string
          id?: string
          origem?: string
          tenant_id?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "memoria_do_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memoria_do_cliente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_de_ia: {
        Row: {
          acao: Json | null
          autor: string
          conteudo: string
          conversa_id: string
          criado_em: string
          id: string
          tenant_id: string
        }
        Insert: {
          acao?: Json | null
          autor: string
          conteudo: string
          conversa_id: string
          criado_em?: string
          id?: string
          tenant_id: string
        }
        Update: {
          acao?: Json | null
          autor?: string
          conteudo?: string
          conversa_id?: string
          criado_em?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_de_ia_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_de_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_de_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_whatsapp: {
        Row: {
          autor_user_id: string | null
          conexao_id: string | null
          conteudo: string
          conversa_id: string
          criado_em: string
          direcao: string
          erro: string | null
          gerada_por_humano: boolean
          gerada_por_ia: boolean
          id: string
          mensagem_externa_id: string | null
          midia_url: string | null
          status: string
          telefone_destinatario: string | null
          telefone_remetente: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          autor_user_id?: string | null
          conexao_id?: string | null
          conteudo?: string
          conversa_id: string
          criado_em?: string
          direcao: string
          erro?: string | null
          gerada_por_humano?: boolean
          gerada_por_ia?: boolean
          id?: string
          mensagem_externa_id?: string | null
          midia_url?: string | null
          status?: string
          telefone_destinatario?: string | null
          telefone_remetente?: string | null
          tenant_id: string
          tipo?: string
        }
        Update: {
          autor_user_id?: string | null
          conexao_id?: string | null
          conteudo?: string
          conversa_id?: string
          criado_em?: string
          direcao?: string
          erro?: string | null
          gerada_por_humano?: boolean
          gerada_por_ia?: boolean
          id?: string
          mensagem_externa_id?: string | null
          midia_url?: string | null
          status?: string
          telefone_destinatario?: string | null
          telefone_remetente?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_tenant_id_fkey"
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
      notificacoes: {
        Row: {
          corpo: string | null
          criado_em: string
          id: string
          lida_em: string | null
          link: string | null
          tenant_id: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          corpo?: string | null
          criado_em?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          tenant_id: string
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          corpo?: string | null
          criado_em?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          tenant_id?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notificacoes_preferencias: {
        Row: {
          atualizado_em: string
          id: string
          no_app: boolean
          no_whatsapp: boolean
          tenant_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          id?: string
          no_app?: boolean
          no_whatsapp?: boolean
          tenant_id: string
          tipo: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          id?: string
          no_app?: boolean
          no_whatsapp?: boolean
          tenant_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_do_tenant: {
        Row: {
          atualizado_em: string
          concluido_em: string | null
          criado_em: string
          etapa: string
          itens: Json
          tenant_id: string
          tour_visto: boolean
        }
        Insert: {
          atualizado_em?: string
          concluido_em?: string | null
          criado_em?: string
          etapa?: string
          itens?: Json
          tenant_id: string
          tour_visto?: boolean
        }
        Update: {
          atualizado_em?: string
          concluido_em?: string | null
          criado_em?: string
          etapa?: string
          itens?: Json
          tenant_id?: string
          tour_visto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_do_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          comanda_id: string
          confirmado_em: string | null
          confirmado_por: string | null
          criado_em: string
          criado_por: string
          estornado_em: string | null
          forma_pagamento: string
          id: string
          status: string
          tenant_id: string
          valor_centavos: number
        }
        Insert: {
          comanda_id: string
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string
          criado_por: string
          estornado_em?: string | null
          forma_pagamento: string
          id?: string
          status: string
          tenant_id: string
          valor_centavos: number
        }
        Update: {
          comanda_id?: string
          confirmado_em?: string | null
          confirmado_por?: string | null
          criado_em?: string
          criado_por?: string
          estornado_em?: string | null
          forma_pagamento?: string
          id?: string
          status?: string
          tenant_id?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "comandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros_da_plataforma: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          link: string | null
          logo_url: string | null
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          link?: string | null
          logo_url?: string | null
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          link?: string | null
          logo_url?: string | null
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      pedidos_de_projeto: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string | null
          empresa: string | null
          id: string
          mensagem: string
          nome: string
          status: string
          tipo: string
          whatsapp: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          email?: string | null
          empresa?: string | null
          id?: string
          mensagem: string
          nome: string
          status?: string
          tipo: string
          whatsapp: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          email?: string | null
          empresa?: string | null
          id?: string
          mensagem?: string
          nome?: string
          status?: string
          tipo?: string
          whatsapp?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          atualizado_em: string
          criado_em: string
          nome: string | null
          telefone: string | null
          tenant_ativo: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          nome?: string | null
          telefone?: string | null
          tenant_ativo?: string | null
          tipo?: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          nome?: string | null
          telefone?: string | null
          tenant_ativo?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_tenant_ativo_fkey"
            columns: ["tenant_ativo"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_da_plataforma: {
        Row: {
          ativo: boolean
          atualizado_em: string
          chave: string
          criado_em: string
          descricao: string | null
          dias_teste: number
          id: string
          limite_agendamentos_mes: number | null
          limite_clientes: number | null
          limite_profissionais: number | null
          limite_unidades: number | null
          nome: string
          ordem: number
          preco_anual_centavos: number
          preco_mensal_centavos: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          chave: string
          criado_em?: string
          descricao?: string | null
          dias_teste?: number
          id?: string
          limite_agendamentos_mes?: number | null
          limite_clientes?: number | null
          limite_profissionais?: number | null
          limite_unidades?: number | null
          nome: string
          ordem?: number
          preco_anual_centavos?: number
          preco_mensal_centavos?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          chave?: string
          criado_em?: string
          descricao?: string | null
          dias_teste?: number
          id?: string
          limite_agendamentos_mes?: number | null
          limite_clientes?: number | null
          limite_profissionais?: number | null
          limite_unidades?: number | null
          nome?: string
          ordem?: number
          preco_anual_centavos?: number
          preco_mensal_centavos?: number
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string
          comissao_percentual: number | null
          controla_estoque: boolean
          criado_em: string
          custo_centavos: number
          descricao: string | null
          destaque: boolean
          disponivel_venda: boolean
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
          comissao_percentual?: number | null
          controla_estoque?: boolean
          criado_em?: string
          custo_centavos?: number
          descricao?: string | null
          destaque?: boolean
          disponivel_venda?: boolean
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
          comissao_percentual?: number | null
          controla_estoque?: boolean
          criado_em?: string
          custo_centavos?: number
          descricao?: string | null
          destaque?: boolean
          disponivel_venda?: boolean
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      rascunhos_de_barbearia: {
        Row: {
          atualizado_em: string
          criado_em: string
          dados: Json
          id: string
          origem_ip: string | null
          publicado_em: string | null
          reivindicado_em: string | null
          reivindicado_por: string | null
          tenant_id: string | null
          token_hash: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          id?: string
          origem_ip?: string | null
          publicado_em?: string | null
          reivindicado_em?: string | null
          reivindicado_por?: string | null
          tenant_id?: string | null
          token_hash: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          dados?: Json
          id?: string
          origem_ip?: string | null
          publicado_em?: string | null
          reivindicado_em?: string | null
          reivindicado_por?: string | null
          tenant_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "rascunhos_de_barbearia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos_de_plano: {
        Row: {
          atualizado_em: string
          chave: string
          criado_em: string
          descricao: string | null
          id: string
          liberado: boolean
          plano: string
          rotulo: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          criado_em?: string
          descricao?: string | null
          id?: string
          liberado?: boolean
          plano: string
          rotulo: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          liberado?: boolean
          plano?: string
          rotulo?: string
        }
        Relationships: []
      }
      recursos_do_tenant: {
        Row: {
          ativo: boolean
          atualizado_em: string
          chave: string
          criado_em: string
          id: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          chave: string
          criado_em?: string
          id?: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          chave?: string
          criado_em?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recursos_do_tenant_tenant_id_fkey"
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
          categoria: string | null
          comissao_percentual: number | null
          criado_em: string
          duracao_min: number
          id: string
          nome: string
          ordem: number
          preco_centavos: number
          profissional_ids: string[]
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          comissao_percentual?: number | null
          criado_em?: string
          duracao_min?: number
          id?: string
          nome: string
          ordem?: number
          preco_centavos?: number
          profissional_ids?: string[]
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          comissao_percentual?: number | null
          criado_em?: string
          duracao_min?: number
          id?: string
          nome?: string
          ordem?: number
          preco_centavos?: number
          profissional_ids?: string[]
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
      tenant_page_configs: {
        Row: {
          created_at: string
          draft_by: string | null
          draft_config: Json
          published_at: string | null
          published_by: string | null
          published_config: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_by?: string | null
          draft_config?: Json
          published_at?: string | null
          published_by?: string | null
          published_config?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_by?: string | null
          draft_config?: Json
          published_at?: string | null
          published_by?: string | null
          published_config?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_page_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usuarios: {
        Row: {
          aceito_em: string | null
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          papel: string
          permissoes: string[]
          tenant_id: string
          user_id: string
        }
        Insert: {
          aceito_em?: string | null
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          papel?: string
          permissoes?: string[]
          tenant_id: string
          user_id: string
        }
        Update: {
          aceito_em?: string | null
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          papel?: string
          permissoes?: string[]
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
          aceita_encaixe: boolean
          antecedencia_min_minutos: number
          assinatura_status: string
          assinatura_visivel: boolean
          ativo: boolean
          cancelamento_min_horas: number
          capa_url: string | null
          chips_ficha: string[]
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
          fuso: string
          id: string
          identidade_app: string
          indicacao_ativa: boolean
          indicacao_codigo: string | null
          indicacao_recompensa: string | null
          instagram: string | null
          intervalo_entre_min: number
          link_avaliacao_publica: string | null
          logo_url: string | null
          loja_ativa: boolean
          modo: string
          nome: string
          plano: string
          rotulo_carteira: string | null
          slug: string
          telefone: string | null
          tema: string
          teste_fim: string | null
          teste_inicio: string | null
          texto_boas_vindas: string | null
          ultimo_acesso_em: string | null
          whatsapp: string | null
        }
        Insert: {
          aceita_encaixe?: boolean
          antecedencia_min_minutos?: number
          assinatura_status?: string
          assinatura_visivel?: boolean
          ativo?: boolean
          cancelamento_min_horas?: number
          capa_url?: string | null
          chips_ficha?: string[]
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
          fuso?: string
          id?: string
          identidade_app?: string
          indicacao_ativa?: boolean
          indicacao_codigo?: string | null
          indicacao_recompensa?: string | null
          instagram?: string | null
          intervalo_entre_min?: number
          link_avaliacao_publica?: string | null
          logo_url?: string | null
          loja_ativa?: boolean
          modo?: string
          nome: string
          plano?: string
          rotulo_carteira?: string | null
          slug: string
          telefone?: string | null
          tema?: string
          teste_fim?: string | null
          teste_inicio?: string | null
          texto_boas_vindas?: string | null
          ultimo_acesso_em?: string | null
          whatsapp?: string | null
        }
        Update: {
          aceita_encaixe?: boolean
          antecedencia_min_minutos?: number
          assinatura_status?: string
          assinatura_visivel?: boolean
          ativo?: boolean
          cancelamento_min_horas?: number
          capa_url?: string | null
          chips_ficha?: string[]
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
          fuso?: string
          id?: string
          identidade_app?: string
          indicacao_ativa?: boolean
          indicacao_codigo?: string | null
          indicacao_recompensa?: string | null
          instagram?: string | null
          intervalo_entre_min?: number
          link_avaliacao_publica?: string | null
          logo_url?: string | null
          loja_ativa?: boolean
          modo?: string
          nome?: string
          plano?: string
          rotulo_carteira?: string | null
          slug?: string
          telefone?: string | null
          tema?: string
          teste_fim?: string | null
          teste_inicio?: string | null
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
      webhook_limites: {
        Row: {
          chave: string
          janela: string
          total: number
        }
        Insert: {
          chave: string
          janela: string
          total?: number
        }
        Update: {
          chave?: string
          janela?: string
          total?: number
        }
        Relationships: []
      }
      webhook_rejeicoes: {
        Row: {
          criado_em: string
          endpoint: string
          id: number
          ip: string | null
          motivo: string
        }
        Insert: {
          criado_em?: string
          endpoint: string
          id?: never
          ip?: string | null
          motivo: string
        }
        Update: {
          criado_em?: string
          endpoint?: string
          id?: never
          ip?: string | null
          motivo?: string
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          delivery_id: string
          event: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          received_at: string
        }
        Insert: {
          delivery_id: string
          event: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          delivery_id?: string
          event?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Relationships: []
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
      checkin_whatsapp: { Args: { _agendamento_id: string }; Returns: Json }
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
      confirmar_meu_acesso: { Args: never; Returns: Json }
      confirmar_pagamento_agendamento: {
        Args: { _agendamento_id: string; _forma_pagamento: string }
        Returns: Json
      }
      confirmar_pagamento_comanda: {
        Args: {
          _comanda_id: string
          _forma: string
          _somente_preparar_pix?: boolean
        }
        Returns: Json
      }
      confirmar_pagamento_comanda_segura: {
        Args: {
          _ator: string
          _comanda_id: string
          _forma: string
          _somente_preparar_pix?: boolean
        }
        Returns: Json
      }
      confirmar_presenca_whatsapp: {
        Args: { _agendamento_id: string }
        Returns: Json
      }
      contato_da_plataforma: {
        Args: never
        Returns: {
          facebook_cortai: string
          instagram_cortai: string
          tiktok_cortai: string
          whatsapp_alvo: string
          youtube_cortai: string
        }[]
      }
      convidar_membro: {
        Args: { _email: string; _papel: string; _tenant_id: string }
        Returns: Json
      }
      creditar_fidelidade_da_comanda: {
        Args: { _ator: string; _comanda_id: string }
        Returns: undefined
      }
      criar_agendamento: {
        Args: {
          _cliente_id: string
          _encaixe?: boolean
          _forma_pagamento: string
          _inicio: string
          _profissional_id: string
          _servico_id: string
          _tenant_id: string
        }
        Returns: Json
      }
      criar_barbearia: { Args: { _nome: string }; Returns: string }
      criar_notificacao: {
        Args: {
          _corpo: string
          _link: string
          _tenant: string
          _tipo: string
          _titulo: string
        }
        Returns: undefined
      }
      definir_acesso_membro: {
        Args: {
          _ativo: boolean
          _papel: string
          _permissoes: string[]
          _tenant_id: string
          _user_id: string
        }
        Returns: Json
      }
      definir_barbeiro_recebe: {
        Args: { _tenant: string; _valor: boolean }
        Returns: undefined
      }
      eh_hoje_na_barbearia: {
        Args: { _em: string; _tenant: string }
        Returns: boolean
      }
      eh_meu_profissional: {
        Args: { _profissional_id: string }
        Returns: boolean
      }
      eh_profissional_do: {
        Args: { _ator: string; _profissional_id: string }
        Returns: boolean
      }
      entrar_na_fila_publica: {
        Args: {
          _nome: string
          _servico_id?: string
          _slug: string
          _telefone: string
        }
        Returns: Json
      }
      equipe_do_tenant: {
        Args: { _tenant_id: string }
        Returns: {
          aceito_em: string
          ativo: boolean
          criado_em: string
          email: string
          nome: string
          papel: string
          permissoes: string[]
          user_id: string
        }[]
      }
      equipe_valida_edicao: {
        Args: {
          _papel: string
          _permissoes: string[]
          _tenant_id: string
          _user_id: string
        }
        Returns: string[]
      }
      fila_publica_status: { Args: { _token: string }; Returns: Json }
      financeiro_tem_permissao: {
        Args: { _ator: string; _permissao: string; _tenant: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_permission: {
        Args: { _permission: string; _tenant_id: string }
        Returns: boolean
      }
      home_publicada: { Args: never; Returns: Json }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      marcar_falta: { Args: { _agendamento_id: string }; Returns: Json }
      meu_acesso_no_tenant: {
        Args: { _tenant_id: string }
        Returns: {
          ativo: boolean
          papel: string
          permissoes: string[]
        }[]
      }
      meu_convite: {
        Args: never
        Returns: {
          aceito_em: string
          ativo: boolean
          barbearia: string
          papel: string
          permissoes: string[]
          tenant_id: string
        }[]
      }
      pagar_comanda_com_plano_segura: {
        Args: { _ator: string; _comanda_id: string }
        Returns: Json
      }
      permissao_efetiva: {
        Args: { _perm: string; _tenant: string; _user: string }
        Returns: boolean
      }
      permissoes_padrao: { Args: { _papel: string }; Returns: string[] }
      preparar_comanda: { Args: { _agendamento_id: string }; Returns: string }
      preparar_comanda_segura: {
        Args: { _agendamento_id: string; _ator: string }
        Returns: string
      }
      publish_tenant_page: {
        Args: {
          _assinatura_visivel: boolean
          _capa_url: string
          _config: Json
          _cor_accent: string
          _cor_primaria: string
          _cor_secundaria: string
          _descricao: string
          _endereco: string
          _facebook: string
          _fotos: Json
          _instagram: string
          _logo_url: string
          _nome: string
          _rotulo_carteira: string
          _telefone: string
          _tema: string
          _tenant_id: string
          _texto_boas_vindas: string
          _whatsapp: string
        }
        Returns: undefined
      }
      recurso_do_tenant_ativo: {
        Args: { _chave: string; _tenant_id: string }
        Returns: boolean
      }
      registrar_acesso_do_tenant: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      registrar_auditoria_barbearia: {
        Args: {
          _acao: string
          _alvo: string
          _detalhes?: Json
          _tenant_id: string
        }
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
      remover_membro: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Json
      }
      salvar_comanda: {
        Args: { _comanda_id: string; _desconto_centavos?: number; _itens: Json }
        Returns: Json
      }
      salvar_comanda_segura: {
        Args: {
          _ator: string
          _comanda_id: string
          _desconto_centavos?: number
          _itens: Json
        }
        Returns: Json
      }
      salvar_configuracao_financeira: {
        Args: {
          _comissao_produto: number
          _comissao_servico: number
          _pix_ativo: boolean
          _pix_chave: string
          _pix_tipo: string
          _pix_whatsapp: string
        }
        Returns: undefined
      }
      salvar_configuracao_financeira_segura: {
        Args: {
          _ator: string
          _comissao_produto: number
          _comissao_servico: number
          _pix_ativo: boolean
          _pix_chave: string
          _pix_tipo: string
          _pix_whatsapp: string
          _tenant: string
        }
        Returns: undefined
      }
      teto_do_papel: { Args: { _papel: string }; Returns: string[] }
      unaccent_placeholder: { Args: { _texto: string }; Returns: string }
      webhook_consumir: {
        Args: { _chave: string; _limite: number }
        Returns: boolean
      }
      webhook_rejeicoes_recentes: { Args: { _ip: string }; Returns: number }
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
