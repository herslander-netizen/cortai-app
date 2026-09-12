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
          criado_em: string
          ficha_tecnica: string | null
          id: string
          limite_fiado_centavos: number
          nome: string
          opt_in_em: string | null
          opt_in_whatsapp: boolean
          telefone: string
          tenant_id: string
        }
        Insert: {
          criado_em?: string
          ficha_tecnica?: string | null
          id?: string
          limite_fiado_centavos?: number
          nome: string
          opt_in_em?: string | null
          opt_in_whatsapp?: boolean
          telefone: string
          tenant_id: string
        }
        Update: {
          criado_em?: string
          ficha_tecnica?: string | null
          id?: string
          limite_fiado_centavos?: number
          nome?: string
          opt_in_em?: string | null
          opt_in_whatsapp?: boolean
          telefone?: string
          tenant_id?: string
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
      profissionais: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          criado_em: string
          id: string
          nome: string
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          criado_em?: string
          id?: string
          nome: string
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          criado_em?: string
          id?: string
          nome?: string
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
          cor_accent: string | null
          cor_primaria: string
          cor_secundaria: string | null
          criado_em: string
          endereco: string | null
          facebook: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          modo: string
          nome: string
          plano: string
          rotulo_carteira: string | null
          slug: string
          telefone: string | null
          tema: string
          texto_boas_vindas: string | null
          whatsapp: string | null
        }
        Insert: {
          assinatura_visivel?: boolean
          cor_accent?: string | null
          cor_primaria?: string
          cor_secundaria?: string | null
          criado_em?: string
          endereco?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          modo?: string
          nome: string
          plano?: string
          rotulo_carteira?: string | null
          slug: string
          telefone?: string | null
          tema?: string
          texto_boas_vindas?: string | null
          whatsapp?: string | null
        }
        Update: {
          assinatura_visivel?: boolean
          cor_accent?: string | null
          cor_primaria?: string
          cor_secundaria?: string | null
          criado_em?: string
          endereco?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          modo?: string
          nome?: string
          plano?: string
          rotulo_carteira?: string | null
          slug?: string
          telefone?: string | null
          tema?: string
          texto_boas_vindas?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancelar_agendamento: { Args: { _agendamento_id: string }; Returns: Json }
      carteira_pertence_ao_membro: {
        Args: { _carteira_id: string }
        Returns: boolean
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      marcar_falta: { Args: { _agendamento_id: string }; Returns: Json }
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
