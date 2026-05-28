import { Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/authenticated-request';

interface DifficultyState {
  currentDifficulty: number;
  targetScore: number;
  adaptationRate: number;
}

const INITIAL_STATE: DifficultyState = {
  currentDifficulty: 0.3,
  targetScore: 0.6,
  adaptationRate: 0.1,
};

@Injectable()
export class AdaptiveDifficultyService {
  async getDifficulty(request: AuthenticatedRequest) {
    const { data } = await request.supabase
      .from('adaptive_sessions')
      .select('state')
      .eq('user_id', request.user.id)
      .single();

    if (!data) {
      await this.saveState(request, INITIAL_STATE, true);
      return { currentDifficulty: INITIAL_STATE.currentDifficulty };
    }

    const state = data.state as DifficultyState;
    return {
      currentDifficulty:
        state.currentDifficulty ?? INITIAL_STATE.currentDifficulty,
    };
  }

  async updateDifficulty(request: AuthenticatedRequest, score: number) {
    const { data } = await request.supabase
      .from('adaptive_sessions')
      .select('state')
      .eq('user_id', request.user.id)
      .single();

    const currentState =
      (data?.state as DifficultyState | undefined) ?? INITIAL_STATE;
    const normalizedScore = score / 100;
    const targetScore = currentState.targetScore ?? INITIAL_STATE.targetScore;
    const adaptationRate =
      currentState.adaptationRate ?? INITIAL_STATE.adaptationRate;
    const currentDifficulty =
      currentState.currentDifficulty ?? INITIAL_STATE.currentDifficulty;

    const nextDifficulty = clamp(
      currentDifficulty + adaptationRate * (normalizedScore - targetScore),
      0,
      1,
    );

    await this.saveState(request, {
      currentDifficulty: nextDifficulty,
      targetScore,
      adaptationRate,
    });

    return { currentDifficulty: nextDifficulty };
  }

  private async saveState(
    request: AuthenticatedRequest,
    state: DifficultyState,
    includeCreatedAt = false,
  ) {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      id: request.user.id,
      user_id: request.user.id,
      state,
      updated_at: now,
    };

    if (includeCreatedAt) {
      payload.created_at = now;
    }

    const { error } = await request.supabase
      .from('adaptive_sessions')
      .upsert(payload);
    if (error) throw error;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
