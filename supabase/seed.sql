-- ===========================================================================
-- Seed de demonstração do Ned.
-- Popula o usuário demo@demo.com com gastos espalhados pelos últimos ~3 meses.
-- Rode DEPOIS de criar o usuário demo (Auth) e aplicar schema.sql.
-- Idempotente: limpa os dados do demo antes de reinserir.
-- ===========================================================================

do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'demo@demo.com' limit 1;
  if v_uid is null then
    raise notice 'Usuário demo@demo.com não encontrado — crie-o no Auth antes de rodar o seed.';
    return;
  end if;

  delete from public.expenses where user_id = v_uid;
  delete from public.chat_messages where user_id = v_uid;

  insert into public.expenses (user_id, description, value, category, payment_method, installments, installment_no, date)
  values
    -- Mês atual
    (v_uid, 'Compras do mês', 412.90, 'Mercado', 'crédito', 1, 1, current_date - 2),
    (v_uid, 'iFood almoço', 38.50, 'Alimentação', 'pix', 1, 1, current_date - 1),
    (v_uid, 'Uber pro trabalho', 22.80, 'Transporte', 'crédito', 1, 1, current_date - 3),
    (v_uid, 'Farmácia', 64.30, 'Saúde', 'débito', 1, 1, current_date - 4),
    (v_uid, 'Cinema', 45.00, 'Lazer', 'pix', 1, 1, current_date - 5),
    (v_uid, 'Gasolina', 150.00, 'Transporte', 'crédito', 1, 1, current_date - 6),
    (v_uid, 'Padaria', 18.70, 'Alimentação', 'dinheiro', 1, 1, current_date - 7),
    (v_uid, 'Netflix', 39.90, 'Lazer', 'crédito', 1, 1, current_date - 8),
    (v_uid, 'Restaurante', 96.40, 'Alimentação', 'crédito', 1, 1, current_date - 9),
    (v_uid, 'Conta de luz', 187.20, 'Contas', 'débito', 1, 1, current_date - 10),
    (v_uid, 'Internet', 99.90, 'Contas', 'crédito', 1, 1, current_date - 11),
    (v_uid, 'Tênis de corrida (1/3)', 133.33, 'Roupas', 'crédito', 3, 1, current_date - 12),
    (v_uid, 'Academia', 89.90, 'Saúde', 'crédito', 1, 1, current_date - 13),
    (v_uid, 'Feira', 54.00, 'Mercado', 'pix', 1, 1, current_date - 14),

    -- Mês passado
    (v_uid, 'Compras do mês', 388.10, 'Mercado', 'crédito', 1, 1, current_date - 34),
    (v_uid, 'Jantar aniversário', 210.00, 'Alimentação', 'crédito', 1, 1, current_date - 36),
    (v_uid, 'Uber', 31.50, 'Transporte', 'pix', 1, 1, current_date - 38),
    (v_uid, 'Gasolina', 160.00, 'Transporte', 'crédito', 1, 1, current_date - 40),
    (v_uid, 'Consulta médica', 250.00, 'Saúde', 'débito', 1, 1, current_date - 42),
    (v_uid, 'Camisa nova', 119.90, 'Roupas', 'crédito', 1, 1, current_date - 44),
    (v_uid, 'Show', 180.00, 'Lazer', 'pix', 1, 1, current_date - 46),
    (v_uid, 'Conta de água', 76.40, 'Contas', 'débito', 1, 1, current_date - 48),
    (v_uid, 'Spotify', 21.90, 'Lazer', 'crédito', 1, 1, current_date - 50),
    (v_uid, 'Tênis de corrida (2/3)', 133.33, 'Roupas', 'crédito', 3, 2, current_date - 12 + interval '1 month'),
    (v_uid, 'Curso online', 197.00, 'Educação', 'crédito', 1, 1, current_date - 52),

    -- Dois meses atrás
    (v_uid, 'Compras do mês', 402.75, 'Mercado', 'crédito', 1, 1, current_date - 64),
    (v_uid, 'Almoço restaurante', 72.00, 'Alimentação', 'pix', 1, 1, current_date - 66),
    (v_uid, 'Estacionamento', 25.00, 'Transporte', 'dinheiro', 1, 1, current_date - 68),
    (v_uid, 'Dentista', 320.00, 'Saúde', 'crédito', 1, 1, current_date - 70),
    (v_uid, 'Livro', 59.90, 'Educação', 'pix', 1, 1, current_date - 72),
    (v_uid, 'Conta de luz', 165.80, 'Contas', 'débito', 1, 1, current_date - 74),
    (v_uid, 'Pizza', 68.00, 'Alimentação', 'crédito', 1, 1, current_date - 76),
    (v_uid, 'Uber', 28.30, 'Transporte', 'pix', 1, 1, current_date - 78);

  insert into public.chat_messages (user_id, role, content)
  values (v_uid, 'assistant', 'Oi! Sou o Ned, seu assistente financeiro. 💸 Me conta um gasto ou pergunta "quanto gastei esse mês?".');
end $$;
