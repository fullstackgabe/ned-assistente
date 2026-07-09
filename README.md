# AssistenteNed — Finanças pessoais com IA em chat

> **Spec de desenvolvimento para o Fable.** Este documento é a fonte da verdade do projeto.
> Leia inteiro antes de começar. O objetivo é entregar um app **rodável e demonstrável**
> (web + iOS + Android), no mesmo padrão dos outros apps de portfólio do Gabriel.

---

## 1. Visão

**Ned** é um assistente financeiro pessoal com **IA em chat**. O usuário conversa em
linguagem natural ("gastei 50 no mercado no pix", "quanto gastei esse mês?", "cancela o
último gasto") e o Ned **registra, consulta e resume** os gastos, respondendo com texto e
**gráficos** dentro do próprio app.

O Ned já existe como automação no **n8n rodando no WhatsApp** (pasta original
`~/Downloads/ned - n8n`). **Este projeto porta o Ned do WhatsApp para um chat dentro de um
app React Native**, e reimplementa o cérebro (agente de IA) numa **Supabase Edge Function**,
para o app ser autocontido e a demo ficar sempre no ar.

### Por que este app existe (contexto de portfólio)
Peça de portfólio que cobre **dois nichos de uma vez**: **finanças pessoais** e **"app com
IA / assistente em chat"** (nicho premium e muito pedido). É citado automaticamente nas
propostas do `workfast` quando a vaga bate com esses nichos.

---

## 2. Stack e convenções (IGUAL aos outros apps do Gabriel)

- **Expo (React Native) + expo-router** — uma base de código cobrindo **iOS, Android e web**.
- **Supabase**: Auth, Postgres, Storage e **Edge Functions** (o agente de IA roda aqui).
- **OpenAI** via Edge Function (a chave fica no segredo da função, **nunca** no app).
- **Deploy web na Vercel**; mobile via Expo.
- **TypeScript** em tudo.
- **Gráficos**: usar `react-native-gifted-charts` (funciona em web + nativo) ou `victory-native`.
  Escolha uma e mantenha.

### Convenções visuais/estruturais herdadas dos outros apps (seguir à risca)
- **Login por Supabase Auth** + botão **"Entrar como demo"**.
  - Login demo padrão: **`demo@demo.com` / `demo1234`**.
- **AuthGate**: telas protegidas só aparecem logado; sessão persistida
  (`@react-native-async-storage/async-storage` no mobile).
- **Frame web tipo "card"**: injetar `<style>` web-only (id `web-frame`) no entry
  (`app/_layout.tsx`), guardado por `Platform.OS === 'web'`, centralizando `#root` como um
  card de ~460px de largura, `height: min(860px, calc(100vh - 48px))`, `border-radius: 36px`,
  sombra e um gradiente temático no `body` só em `@media (min-width: 720px)`. (Copiar o
  padrão de um dos apps existentes, ex. `~/htdocs/pedeai` ou `~/htdocs/salaonamao`.)
- `app.json` `name` = **Ned** (título da aba no web).
- Dependência conhecida: o `@supabase/supabase-js` novo puxa `@opentelemetry/api`; incluir
  a dep para o Metro resolver (mesmo fix dos outros apps).

---

## 3. O que o Ned faz (comportamento — fiel ao n8n original)

O agente é um assistente financeiro em PT-BR. A partir de uma mensagem em linguagem natural,
ele decide qual **tool** chamar. Tools portadas do n8n:

| Tool (n8n) | O que faz | Vira no app |
|---|---|---|
| `post_expenses` | Registra um gasto à vista | `registrar_gasto` |
| `change_data` | Registra gasto **parcelado** (installments > 1) | idem, parâmetro `installments` |
| `get_expenses` | Resumo de gastos | `resumir_gastos` |
| `change_period` | Busca gastos de um **período específico** | `gastos_por_periodo` |
| `cancel_expenses` | Cancela/exclui um gasto específico | `cancelar_gasto` |
| `send_image` | Enviava imagem do gráfico de categorias no WhatsApp | **NÃO porta como imagem**: o app renderiza o gráfico **nativo** inline no chat |

### Campos que o agente extrai de um gasto (do prompt original do Ned — manter fiel)
- **value** (número): valor numérico exato, sem símbolo de moeda (ex.: `50.75`, `120`).
- **desc** (texto): o que foi o gasto (ex.: "pizza", "almoço no restaurante", "tênis de corrida").
- **payment_method** (texto): **obrigatoriamente** um de: `crédito`, `débito`, `pix`, `dinheiro`.
- **category** (texto): categoria que classifica o gasto (ex.: Alimentação, Transporte,
  Saúde, Roupas). Se não estiver clara, usar **`Outros`**.
- **installments** (número): parcelas. À vista = **`1`**. Parcelado = nº de parcelas.
- **date**: data do gasto (default = hoje, mas o usuário pode dizer "ontem", "dia 3").

> Regra do original: quando `installments > 1`, gerar **uma linha por parcela** (a tool
> `change_data` fazia isso), distribuindo nos meses seguintes. Manter esse comportamento.

---

## 4. Modelo de dados (Supabase / Postgres)

Reaproveita o esquema do n8n (`user_expenses`), limpo para o contexto de app (troca o
`from`/`name` do WhatsApp por `user_id` do Supabase Auth). Aplicar via migration SQL.

```sql
-- Gastos
create table public.expenses (
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
alter table public.expenses enable row level security;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Histórico do chat (substitui a memória Redis do n8n; dá contexto ao agente)
create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  meta       jsonb,                          -- ex.: {"type":"chart","data":[...]} p/ render inline
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "own messages" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- **Seed de demo**: popular o usuário `demo@demo.com` com ~30–40 gastos espalhados por
  categorias e pelos últimos 2–3 meses, para os gráficos e resumos já nascerem cheios.

---

## 5. O agente de IA (Supabase Edge Function)

Criar uma Edge Function `agent` (Deno) que:
1. Recebe `{ message }` do app (usuário autenticado; `user_id` vem do JWT).
2. Carrega as últimas N mensagens de `chat_messages` do usuário (memória de conversa).
3. Chama a **OpenAI** (modelo atual da família Claude **NÃO**; aqui é OpenAI, como no n8n —
   usar um modelo OpenAI atual, ex. `gpt-4o-mini` ou melhor) com **function calling**,
   expondo as tools da seção 3.
4. Executa as tools chamadas contra a tabela `expenses` (respeitando RLS / `user_id`).
5. Grava a mensagem do usuário e a resposta do assistente em `chat_messages`.
6. Retorna `{ reply, meta }` — onde `meta` pode conter dados de gráfico para render inline.

- Chave da OpenAI: **segredo da Edge Function** (`supabase secrets set OPENAI_API_KEY=...`).
  Nunca embutir no app.
- Prompt do sistema: assistente financeiro PT-BR, objetivo, confirma o que registrou
  ("Anotei: R$ 50,00 em Alimentação no pix ✅"), pede só o que falta, nunca inventa valor.

---

## 6. Telas (expo-router)

1. **Login** (`app/index.tsx` ou `app/login.tsx`) — e-mail/senha + **"Entrar como demo"**.
2. **Chat** (`app/chat.tsx`) — **tela principal / estrela do app**:
   - Bolhas de conversa (usuário x Ned), input embaixo, indicador de "digitando".
   - O Ned pode renderizar **inline** um _card de gasto registrado_ e um **gráfico**
     (pizza de categorias / barras por mês) quando `meta.type === 'chart'`.
   - Sugestões rápidas ("Quanto gastei esse mês?", "Gastos por categoria").
3. **Extrato / Dashboard** (`app/extrato.tsx`) — lista de gastos com filtro por período e
   categoria, **total do mês**, e um **gráfico** de categorias. (Fonte da verdade visual dos
   dados que o chat manipula.)
4. **(Opcional)** Ajustes — sair, tema.

Navegação: tabs (Chat | Extrato) depois do login.

---

## 7. Critérios de "pronto" (Definition of Done)

- [ ] `npx expo start` roda em **web** sem erro; build web (`expo export`) OK para Vercel.
- [ ] Login real + **"Entrar como demo"** funcionando (`demo@demo.com` / `demo1234`).
- [ ] No chat, escrever "gastei 45 no ifood no crédito" **cria** o gasto certo (valor,
      categoria, método, à vista) e o Ned **confirma**.
- [ ] "gastei 1200 num tênis em 3x no crédito" cria **3 parcelas**.
- [ ] "quanto gastei esse mês?" e "gastos por categoria" retornam resumo + **gráfico inline**.
- [ ] "cancela o último gasto" remove o gasto.
- [ ] Extrato reflete tudo que o chat fez (mesma fonte de dados).
- [ ] RLS ativa: um usuário nunca vê gasto de outro.
- [ ] Frame web "card" aplicado; título da aba = **Ned**.
- [ ] Seed de demo carregado (gráficos já nascem cheios).

---

## 8. Deploy (feito DEPOIS, junto com o Gabriel — não é tarefa do Fable)

- Supabase: novo projeto **OU** reaproveitar o slot de um app de prod que sai do ar
  (decisão do Gabriel — limite free = 2 projetos ativos por conta Supabase).
- Vercel: `npx vercel deploy --prod --yes --cwd ~/htdocs/AssistenteNed`; domínio via API.
- Desligar Deployment Protection (ssoProtection:null) via API, como nos outros.
- Keep-alive: adicionar `.github/workflows/keepalive.yml` batendo numa tabela real
  (`expenses`) a cada 2 dias, no mesmo padrão dos outros 6 repos.
- Secrets da Edge Function: `OPENAI_API_KEY`.

---

## 9. Referências
- Ned original (n8n): `~/Downloads/ned - n8n/` — workflows `assistente-financeiro.json`,
  `post_expenses.json`, `change_data.json`, `get_expenses.json`, `change_period.json`,
  `cancel_expenses.json`, `send_image.json`. **Fonte da verdade do comportamento.**
- Apps de referência de estilo/estrutura: `~/htdocs/pedeai`, `~/htdocs/salaonamao`
  (Expo + expo-router + Supabase, mesmo frame web e login demo).
