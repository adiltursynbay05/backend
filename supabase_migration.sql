-- ─── Таблица adaptive_sessions ───────────────────────────────────────────────
-- Хранит полное состояние адаптивной сессии интервью.
-- Поле `state` — jsonb со всеми параметрами: вопросы, сложность, использованные ID.

create table if not exists public.adaptive_sessions (
    id          text        primary key,           -- sessionId (uuid от клиента)
    user_id     uuid        not null references auth.users(id) on delete cascade,
    state       jsonb       not null,              -- SerializedSession
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Индекс для быстрого поиска по пользователю
create index if not exists adaptive_sessions_user_id_idx
    on public.adaptive_sessions (user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.adaptive_sessions enable row level security;

-- Пользователь видит только свои сессии
create policy "Users can read own adaptive sessions"
    on public.adaptive_sessions for select
    using (auth.uid() = user_id);

-- Пользователь может создавать свои сессии
create policy "Users can insert own adaptive sessions"
    on public.adaptive_sessions for insert
    with check (auth.uid() = user_id);

-- Пользователь может обновлять только свои сессии
create policy "Users can update own adaptive sessions"
    on public.adaptive_sessions for update
    using (auth.uid() = user_id);

-- Пользователь может удалять только свои сессии
create policy "Users can delete own adaptive sessions"
    on public.adaptive_sessions for delete
    using (auth.uid() = user_id);
