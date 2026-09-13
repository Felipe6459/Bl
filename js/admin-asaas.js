import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const message = document.getElementById('message');
const form = document.getElementById('asaasForm');
const environment = document.getElementById('environment');
const apiKey = document.getElementById('apiKey');
const status = document.getElementById('status');

function show(text, ok = false) {
  message.textContent = text;
  message.style.color = ok ? '#22c55e' : '';
}

async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = './login.html'; return null; }
  const { data: profile, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (error || !profile?.is_admin) { await supabase.auth.signOut(); location.href = './login.html'; return null; }
  return user;
}

async function loadConfig() {
  const user = await requireAdmin();
  if (!user) return;
  const { data, error } = await supabase.from('asaas_config').select('environment,updated_at').eq('id', true).maybeSingle();
  if (error) { status.textContent = `Erro ao carregar configuração: ${error.message}`; return; }
  if (!data) {
    status.innerHTML = '<strong>Não configurado.</strong><p>Cadastre uma API Key do Asaas acima.</p>';
    return;
  }
  environment.value = data.environment;
  status.innerHTML = `<strong>Configurado</strong><p>Ambiente: ${data.environment === 'production' ? 'Produção' : 'Sandbox'}.<br>Última atualização: ${new Date(data.updated_at).toLocaleString('pt-BR')}.</p><p>A chave permanece protegida e não é exibida novamente.</p>`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = await requireAdmin();
  if (!user) return;
  const key = apiKey.value.trim();
  if (!key) { show('Informe a API Key do Asaas.'); return; }
  const prefixOk = environment.value === 'sandbox' ? key.startsWith('$aact_hmlg_') : key.startsWith('$aact_prod_');
  if (!prefixOk) {
    show(environment.value === 'sandbox' ? 'A chave de Sandbox deve começar com $aact_hmlg_.' : 'A chave de Produção deve começar com $aact_prod_.');
    return;
  }
  show('Salvando...');
  const { error } = await supabase.from('asaas_config').upsert({ id: true, environment: environment.value, api_key: key, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) { show(`Erro ao salvar: ${error.message}`); return; }
  apiKey.value = '';
  show('Integração Asaas salva com sucesso.', true);
  await loadConfig();
});

loadConfig();
