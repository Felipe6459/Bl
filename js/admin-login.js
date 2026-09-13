import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const form = document.getElementById('adminLoginForm');
const message = document.getElementById('message');

const onlyDigits = value => value.replace(/\D/g, '');

form.addEventListener('submit', async event => {
  event.preventDefault();
  const phone = onlyDigits(document.getElementById('phone').value);
  const password = document.getElementById('password').value;
  message.textContent = 'Verificando acesso...';

  try {
    if (phone.length < 10) throw new Error('Informe um telefone válido.');
    const { error } = await supabase.auth.signInWithPassword({ phone: `+55${phone}`, password });
    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não foi possível identificar a conta.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin,full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      await supabase.auth.signOut();
      throw new Error('Esta conta não possui acesso de dono.');
    }

    window.location.href = './index.html';
  } catch (error) {
    message.textContent = error?.message || 'Não foi possível entrar.';
  }
});
