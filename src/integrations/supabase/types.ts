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
      access_history: {
        Row: {
          acao: string
          barbershop_id: string | null
          created_at: string
          id: string
          novo_prazo: string | null
          novo_vencimento: string | null
          observacao: string | null
          prazo_anterior: string | null
          super_admin_id: string | null
          user_id: string
          vencimento_anterior: string | null
        }
        Insert: {
          acao: string
          barbershop_id?: string | null
          created_at?: string
          id?: string
          novo_prazo?: string | null
          novo_vencimento?: string | null
          observacao?: string | null
          prazo_anterior?: string | null
          super_admin_id?: string | null
          user_id: string
          vencimento_anterior?: string | null
        }
        Update: {
          acao?: string
          barbershop_id?: string | null
          created_at?: string
          id?: string
          novo_prazo?: string | null
          novo_vencimento?: string | null
          observacao?: string | null
          prazo_anterior?: string | null
          super_admin_id?: string | null
          user_id?: string
          vencimento_anterior?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_history_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      access_licenses: {
        Row: {
          access_expires_at: string | null
          access_started_at: string | null
          access_type: Database["public"]["Enums"]["access_type"]
          barbershop_id: string | null
          created_at: string
          id: string
          observacao: string | null
          status: Database["public"]["Enums"]["license_status"]
          trial_expires_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_started_at?: string | null
          access_type?: Database["public"]["Enums"]["access_type"]
          barbershop_id?: string | null
          created_at?: string
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          trial_expires_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_started_at?: string | null
          access_type?: Database["public"]["Enums"]["access_type"]
          barbershop_id?: string | null
          created_at?: string
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["license_status"]
          trial_expires_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_licenses_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          barber_id: string
          barbershop_id: string
          cliente_nome: string
          cliente_telefone: string
          created_at: string
          customer_id: string | null
          data: string
          hora_fim: string
          hora_inicio: string
          id: string
          observacao: string | null
          payment_method_id: string | null
          payment_method_nome: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          valor: number
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          cliente_nome: string
          cliente_telefone: string
          created_at?: string
          customer_id?: string | null
          data: string
          hora_fim: string
          hora_inicio: string
          id?: string
          observacao?: string | null
          payment_method_id?: string | null
          payment_method_nome?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          valor?: number
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string
          customer_id?: string | null
          data?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          observacao?: string | null
          payment_method_id?: string | null
          payment_method_nome?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_hours: {
        Row: {
          ativo: boolean
          barber_id: string
          barbershop_id: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
        }
        Insert: {
          ativo?: boolean
          barber_id: string
          barbershop_id: string
          dia_semana: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
        }
        Update: {
          ativo?: boolean
          barber_id?: string
          barbershop_id?: string
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_hours_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_hours_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_services: {
        Row: {
          barber_id: string
          barbershop_id: string
          service_id: string
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          service_id: string
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          ativo: boolean
          barbershop_id: string
          created_at: string
          descricao: string | null
          foto_url: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          barbershop_id: string
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          barbershop_id?: string
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          assinatura_status: string
          assinatura_vencimento: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cor_primaria: string
          cor_secundaria: string
          cover_url: string | null
          created_at: string
          descricao: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          facebook: string | null
          id: string
          instagram: string | null
          limite_agendamentos_mes: number
          limite_barbeiros: number
          logo_url: string | null
          mensagem_whatsapp: string | null
          nome: string
          numero: string | null
          onboarding_concluido: boolean
          owner_id: string
          plano: string
          responsavel: string | null
          site_url: string | null
          slogan: string | null
          slug: string
          sobre_experiencia: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          assinatura_status?: string
          assinatura_vencimento?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cor_primaria?: string
          cor_secundaria?: string
          cover_url?: string | null
          created_at?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          limite_agendamentos_mes?: number
          limite_barbeiros?: number
          logo_url?: string | null
          mensagem_whatsapp?: string | null
          nome: string
          numero?: string | null
          onboarding_concluido?: boolean
          owner_id: string
          plano?: string
          responsavel?: string | null
          site_url?: string | null
          slogan?: string | null
          slug: string
          sobre_experiencia?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          assinatura_status?: string
          assinatura_vencimento?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cor_primaria?: string
          cor_secundaria?: string
          cover_url?: string | null
          created_at?: string
          descricao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          limite_agendamentos_mes?: number
          limite_barbeiros?: number
          logo_url?: string | null
          mensagem_whatsapp?: string | null
          nome?: string
          numero?: string | null
          onboarding_concluido?: boolean
          owner_id?: string
          plano?: string
          responsavel?: string | null
          site_url?: string | null
          slogan?: string | null
          slug?: string
          sobre_experiencia?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      blocked_times: {
        Row: {
          barber_id: string | null
          barbershop_id: string
          created_at: string
          data: string
          hora_fim: string
          hora_inicio: string
          id: string
          motivo: string | null
        }
        Insert: {
          barber_id?: string | null
          barbershop_id: string
          created_at?: string
          data: string
          hora_fim: string
          hora_inicio: string
          id?: string
          motivo?: string | null
        }
        Update: {
          barber_id?: string | null
          barbershop_id?: string
          created_at?: string
          data?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          aberto: boolean
          barbershop_id: string
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_fim: string | null
          intervalo_inicio: string | null
        }
        Insert: {
          aberto?: boolean
          barbershop_id: string
          dia_semana: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
        }
        Update: {
          aberto?: boolean
          barbershop_id?: string
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_fim?: string | null
          intervalo_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          barbershop_id: string
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          barbershop_id: string
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          path: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          path: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          active: boolean
          barbershop_id: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          ativo: boolean
          barbershop_id: string
          created_at: string
          descricao: string | null
          duracao_minutos: number
          id: string
          nome: string
          preco: number
        }
        Insert: {
          ativo?: boolean
          barbershop_id: string
          created_at?: string
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          nome: string
          preco?: number
        }
        Update: {
          ativo?: boolean
          barbershop_id?: string
          created_at?: string
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          nome?: string
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      agendamento_publico: {
        Args: { p_id: string }
        Returns: {
          barbearia: string
          barbeiro: string
          cliente_nome: string
          data: string
          endereco: string
          hora_fim: string
          hora_inicio: string
          id: string
          servico: string
          slug: string
          telefone: string
          valor: number
        }[]
      }
      criar_agendamento_publico:
        | {
            Args: {
              p_barber_id: string
              p_data: string
              p_email?: string
              p_hora: string
              p_nome: string
              p_observacao?: string
              p_service_id: string
              p_slug: string
              p_telefone: string
            }
            Returns: string
          }
        | {
            Args: {
              p_barber_id: string
              p_data: string
              p_email?: string
              p_hora: string
              p_nome: string
              p_observacao?: string
              p_payment_method_id?: string
              p_service_id: string
              p_slug: string
              p_telefone: string
            }
            Returns: string
          }
      current_barbershop_id: { Args: never; Returns: string }
      effective_license_status: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["license_status"]
      }
      has_active_access: { Args: { p_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      horarios_disponiveis: {
        Args: {
          p_barber_id: string
          p_data: string
          p_service_id: string
          p_slug: string
        }
        Returns: {
          barber_id: string
          barber_nome: string
          hora: string
        }[]
      }
      minha_licenca: {
        Args: never
        Returns: {
          access_expires_at: string
          access_started_at: string
          access_type: Database["public"]["Enums"]["access_type"]
          expires_at: string
          server_now: string
          status: Database["public"]["Enums"]["license_status"]
          trial_expires_at: string
          trial_started_at: string
        }[]
      }
      sa_atualizar_barbearia: {
        Args: {
          p_bairro?: string
          p_cep?: string
          p_cidade?: string
          p_descricao?: string
          p_email?: string
          p_endereco?: string
          p_estado?: string
          p_instagram?: string
          p_nome?: string
          p_numero?: string
          p_slogan?: string
          p_slug?: string
          p_telefone?: string
          p_user_id: string
          p_whatsapp?: string
        }
        Returns: undefined
      }
      sa_atualizar_cliente: {
        Args: {
          p_email?: string
          p_nome?: string
          p_telefone?: string
          p_user_id: string
        }
        Returns: undefined
      }
      sa_bloquear_acesso: {
        Args: { p_observacao?: string; p_user_id: string }
        Returns: undefined
      }
      sa_bloquear_clientes_massa: {
        Args: { p_user_ids: string[] }
        Returns: number
      }
      sa_cliente: {
        Args: { p_user_id: string }
        Returns: {
          access_expires_at: string
          access_started_at: string
          access_type: Database["public"]["Enums"]["access_type"]
          barbearia: string
          barbershop_id: string
          criado_em: string
          email: string
          nome: string
          observacao: string
          server_now: string
          slug: string
          status: Database["public"]["Enums"]["license_status"]
          telefone: string
          trial_expires_at: string
          trial_started_at: string
          user_id: string
          vencimento: string
          whatsapp: string
        }[]
      }
      sa_clientes: {
        Args: { p_busca?: string; p_status?: string }
        Returns: {
          access_type: Database["public"]["Enums"]["access_type"]
          barbearia: string
          barbershop_id: string
          criado_em: string
          email: string
          inicio: string
          nome: string
          slug: string
          status: Database["public"]["Enums"]["license_status"]
          telefone: string
          user_id: string
          vencimento: string
        }[]
      }
      sa_desbloquear_acesso: {
        Args: { p_observacao?: string; p_user_id: string }
        Returns: string
      }
      sa_desbloquear_clientes_massa: {
        Args: { p_user_ids: string[] }
        Returns: number
      }
      sa_excluir_cliente: { Args: { p_user_id: string }; Returns: undefined }
      sa_expirando: {
        Args: { p_dias?: number }
        Returns: {
          barbearia: string
          email: string
          nome: string
          status: Database["public"]["Enums"]["license_status"]
          telefone: string
          user_id: string
          vencimento: string
        }[]
      }
      sa_historico: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          acao: string
          barbearia: string
          created_at: string
          id: string
          nome: string
          novo_prazo: string
          novo_vencimento: string
          observacao: string
          prazo_anterior: string
          user_id: string
          vencimento_anterior: string
        }[]
      }
      sa_liberar_acesso: {
        Args: {
          p_observacao?: string
          p_quantidade: number
          p_unidade: string
          p_user_id: string
        }
        Returns: string
      }
      sa_liberar_acesso_massa: {
        Args: {
          p_observacao?: string
          p_quantidade: number
          p_unidade: string
          p_user_ids: string[]
        }
        Returns: number
      }
      sa_registrar_alteracao_senha: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sa_require: { Args: never; Returns: string }
      sa_stats: {
        Args: never
        Returns: {
          ativos: number
          bloqueados: number
          em_teste: number
          expirados: number
          expirando: number
          suspensos: number
          total_barbearias: number
          total_clientes: number
        }[]
      }
      slug_disponivel: { Args: { p_slug: string }; Returns: boolean }
    }
    Enums: {
      access_type: "trial" | "paid_access" | "manual_access"
      app_role: "super_admin" | "barbershop_admin"
      appointment_status:
        | "pendente"
        | "confirmado"
        | "concluido"
        | "cancelado"
        | "nao_compareceu"
      license_status: "trial" | "active" | "expired" | "blocked" | "suspended"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      access_type: ["trial", "paid_access", "manual_access"],
      app_role: ["super_admin", "barbershop_admin"],
      appointment_status: [
        "pendente",
        "confirmado",
        "concluido",
        "cancelado",
        "nao_compareceu",
      ],
      license_status: ["trial", "active", "expired", "blocked", "suspended"],
    },
  },
} as const
