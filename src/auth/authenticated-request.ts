import type { Request } from 'express';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user: User;
  supabase: SupabaseClient;
}
