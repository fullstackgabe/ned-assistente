-- ===========================================================================
-- Ned — assistente financeiro. Esquema Postgres (Supabase).
-- Portado do n8n (tabela user_expenses do WhatsApp) para o contexto de app:
-- troca o `from`/`name` do WhatsApp pelo `user_id` do Supabase Auth.
-- ===========================================================================

-- ---- Gastos ----------------------------------------------------------------
create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  description    text not null,
  value          numeric(12,2) not null,
  category       text not null default 'Outros',
  payment_method text not null check (payment_method in ('crédito','débito','pix','dinheiro')),
  installments   int  not null default 1,
  installment_no int  not null default 1,   -- qual parcela desta linha (1..installments)
  date           date not null default current_date,
  created_at     timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);
create index if not exists expenses_user_created_idx on public.expenses (user_id, created_at desc);

alter table public.expenses enable row level security;

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Histórico do chat (substitui a memória Redis do n8n) ------------------
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  meta       jsonb,                          -- ex.: {"type":"chart","data":[...]} p/ render inline
  created_at timestamptz not null default now()
);

create index if not exists chat_user_created_idx on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "own messages" on public.chat_messages;
create policy "own messages" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
