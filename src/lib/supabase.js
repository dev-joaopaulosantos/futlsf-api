const { createClient } = require('@supabase/supabase-js');

/*
 * Cliente do Supabase (usado aqui para o Storage de imagens, ex.: escudos dos
 * times). Criado uma única vez e reaproveitado em todo o backend.
 *
 * - Usa a SERVICE_ROLE_KEY: chave de servidor com permissões elevadas. Por
 *   isso ela NUNCA deve ir para o frontend — fica só no backend, no .env.
 * - `persistSession: false`: este cliente roda no servidor e não representa um
 *   usuário logado, então não precisa guardar sessão de autenticação.
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = supabase;
