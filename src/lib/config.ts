// Quando NÃO há Supabase configurado (sem .env), o app roda em "modo demo
// offline": autenticação e dados vêm de um store local (AsyncStorage), pra a
// demo funcionar sem backend nenhum. Assim que EXPO_PUBLIC_SUPABASE_URL for
// preenchido, isDemo vira false e tudo passa a usar o Supabase real.
export const isDemo = !process.env.EXPO_PUBLIC_SUPABASE_URL

export const DEMO_UID = 'demo-user-local'
