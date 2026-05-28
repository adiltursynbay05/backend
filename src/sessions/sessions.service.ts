import { Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

export interface InterviewSessionPayload {
  id: string;
  date: string;
  position: string;
  messages?: unknown;
  score?: number;
  evaluation?: unknown;
}

export type StoredInterviewSession = Record<string, unknown>;

@Injectable()
export class SessionsService {
  async create(
    request: AuthenticatedRequest,
    session: InterviewSessionPayload,
  ) {
    const { error } = await request.supabase.from('interview_sessions').insert({
      id: session.id,
      user_id: request.user.id,
      date: session.date,
      position: session.position,
      messages: session.messages,
      score: session.score ?? 0,
      evaluation: session.evaluation ?? null,
    });

    if (error) throw error;
    return { success: true };
  }

  async findAll(
    request: AuthenticatedRequest,
  ): Promise<StoredInterviewSession[]> {
    const { data, error } = await request.supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', request.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as StoredInterviewSession[];
  }

  async deleteOne(request: AuthenticatedRequest, id: string) {
    const { error } = await request.supabase
      .from('interview_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', request.user.id);

    if (error) throw error;
    return { success: true };
  }

  async deleteMany(request: AuthenticatedRequest, ids: string[]) {
    const { error } = await request.supabase
      .from('interview_sessions')
      .delete()
      .in('id', ids)
      .eq('user_id', request.user.id);

    if (error) throw error;
    return { success: true };
  }
}
