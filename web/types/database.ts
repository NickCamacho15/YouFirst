export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          username: string | null
          profile_image_url: string | null
          role: 'admin' | 'user' | null
          group_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          display_name?: string | null
          username?: string | null
          profile_image_url?: string | null
          role?: 'admin' | 'user' | null
          group_id?: string | null
          created_at?: string | null
        }
        Update: Database['public']['Tables']['users']['Insert']
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          plan_id: string
          price_id: string
          status:
            | 'trialing'
            | 'active'
            | 'past_due'
            | 'canceled'
            | 'incomplete'
            | 'incomplete_expired'
            | 'unpaid'
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          plan_id: string
          price_id: string
          status?:
            | 'trialing'
            | 'active'
            | 'past_due'
            | 'canceled'
            | 'incomplete'
            | 'incomplete_expired'
            | 'unpaid'
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Database['public']['Tables']['subscriptions']['Insert']
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      stripe_events: {
        Row: {
          id: string
          type: string
          created_at: string | null
          payload: Json
        }
        Insert: {
          id: string
          type: string
          created_at?: string | null
          payload: Json
        }
        Update: Database['public']['Tables']['stripe_events']['Insert']
        Relationships: []
      }
    }
    Views: {
      entitlements: {
        Row: {
          user_id: string
          is_active: boolean | null
        }
      }
    }
    Functions: {
      // placeholder for existing RPCs
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']


