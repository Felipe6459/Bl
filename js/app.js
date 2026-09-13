const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';
let supabase = null;
let registerMode = false;

function getSupabase() {
  if (supabase) return supabase;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('Não foi possível carregar o sistema. Atualize a página.');
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}
function onlyDigits(value) { return String(value || '').replace(/\D/g, ''); }
function formatCpf(value) { const v = onlyDigits(value).slice(0, 11); return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function formatPhone(value) { const v = onlyDigits(value).slice(0, 11); if (v.length <= 2) return v; if (v.length <= 7) return `(${v.slice(0,2)}) ${v.slice(2)}`; return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`; }
function getEmailInput() { return document.getElementById('email') || document.getElementById('loginEmail'); }

function openAuth(register) {
  const dialog = document.getElementById('authDialog'); if (!dialog) return;
  registerMode = !!register;
  const title = document.getElementById('authTitle'), submit = document.getElementById('authSubmit'), fields = document.getElementById('registerFields'), switchBtn = document.getElementById('switchAuth');
  if (title) title.textContent = registerMode ? 'Criar conta' : 'Entrar';
  if (submit) submit.textContent = registerMode ? 'Criar minha conta' : 'Entrar';
  if (switchBtn) switchBtn.textContent = registerMode ? 'Já tenho uma conta' : 'Ainda não tenho conta';
  if (fields) fields.hidden = !registerMode;
  const loginEmail = document.getElementById('loginEmail');
  if (loginEmail) loginEmail.hidden = registerMode;
  const loginLabel = loginEmail?.closest('label'); if (loginLabel) loginLabel.hidden = registerMode;
  document.getElementById('authMessage').textContent = ''; document.getElementById('authForm').reset();
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}

function bindEvents() {
  document.getElementById('cpf')?.addEventListener('input', e => e.target.value = formatCpf(e.target.value));
  document.getElementById('phone')?.addEventListener('input', e => e.target.value = formatPhone(e.target.value));
  document.getElementById('loginBtn')?.addEventListener('click', () => openAuth(false));
  document.getElementById('heroLogin')?.addEventListener('click', () => openAuth(false));
  document.getElementById('registerBtn')?.addEventListener('click', () => openAuth(true));
  document.getElementById('heroRegister')?.addEventListener('click', () => openAuth(true));
  document.getElementById('closeAuth')?.addEventListener('click', () => document.getElementById('authDialog')?.close());
  document.getElementById('switchAuth')?.addEventListener('click', () => openAuth(!registerMode));
  const form = document.getElementById('authForm');
  form?.addEventListener('submit', async event => {
    event.preventDefault(); const message = document.getElementById('authMessage'), submit = document.getElementById('authSubmit'); message.textContent = 'Processando...'; submit.disabled = true;
    try {
      const client = getSupabase(), password = document.getElementById('password').value;
      if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
      if (registerMode) {
        const fullName = document.getElementById('fullName').value.trim(), cpfValue = onlyDigits(document.getElementById('cpf').value), phoneValue = onlyDigits(document.getElementById('phone').value), emailValue = document.getElementById('email').value.trim().toLowerCase();
        if (!fullName) throw new Error('Informe seu nome completo.'); if (cpfValue.length !== 11) throw new Error('Informe um CPF válido.'); if (phoneValue.length !== 11) throw new Error('Informe um telefone com 11 dígitos.'); if (!emailValue || !emailValue.includes('@')) throw new Error('Informe um e-mail válido.');
        const { data, error } = await client.auth.signUp({ email: emailValue, password, options: { data: { full_name: fullName, cpf: cpfValue, phone: phoneValue } } });
        if (error) throw error; message.textContent = data.session ? 'Conta criada com sucesso!' : 'Cadastro criado. Verifique seu e-mail para confirmar a conta.';
        if (data.session) setTimeout(() => { document.getElementById('authDialog')?.close(); updateSessionUI(); }, 500);
      } else {
        const input = getEmailInput(), emailValue = input?.value.trim().toLowerCase(); if (!emailValue) throw new Error('Informe seu e-mail.');
        const { error } = await client.auth.signInWithPassword({ email: emailValue, password }); if (error) throw error;
        document.getElementById('authDialog')?.close(); await updateSessionUI();
      }
    } catch (error) { console.error('BL Auth:', error); message.textContent = error?.message || 'Não foi possível concluir a operação.'; } finally { submit.disabled = false; }
  });
}

async function updateSessionUI() {
  try {
    const client = getSupabase(), { data: { session } } = await client.auth.getSession(), area = document.getElementById('sessionArea'); if (!area) return;
    if (!session) { area.innerHTML = '<button class="btn btn-outline" id="loginBtn">Entrar</button><button class="btn" id="registerBtn">Criar conta</button>'; document.getElementById('loginBtn').onclick = () => openAuth(false); document.getElementById('registerBtn').onclick = () => openAuth(true); }
    else { area.innerHTML = '<button class="btn" id="accountBtn">Minha conta</button><button class="btn btn-outline" id="logoutBtn">Sair</button>'; document.getElementById('accountBtn').onclick = () => location.href = 'minha-conta.html'; document.getElementById('logoutBtn').onclick = async () => { await client.auth.signOut(); updateSessionUI(); }; }
  } catch (error) { console.error('Supabase Auth:', error); }
}

async function loadBoloes() {
  const list = document.getElementById('boloesList'); if (!list) return;
  list.innerHTML = '<div class="empty">Carregando bolões...</div>';
  try {
    const client = getSupabase();
    const { data, error } = await client.from('boloes').select('id,nome,descricao,concurso,data_sorteio,valor_jogo,quantidade_dezenas,premio,status').eq('status', 'ativo').order('data_sorteio', { ascending: true });
    if (error) throw error;
    if (!data?.length) { list.innerHTML = '<div class="empty">Nenhum bolão ativo no momento.</div>'; return; }
    list.innerHTML = data.map(b => {
      const dezenas = Number(b.quantidade_dezenas) || 10;
      const descricao = b.descricao || `Escolha suas ${dezenas} dezenas para participar.`;
      const dataSorteio = b.data_sorteio ? new Date(`${b.data_sorteio}T00:00:00`).toLocaleDateString('pt-BR') : 'A definir';
      return `<article class="card"><h3>${escapeHtml(b.nome)}</h3><p>${escapeHtml(descricao)}</p><p><strong>Concurso:</strong> ${escapeHtml(b.concurso)}<br><strong>Sorteio:</strong> ${dataSorteio}<br><strong>Jogo:</strong> R$ ${Number(b.valor_jogo).toFixed(2).replace('.', ',')}<br><strong>Dezenas:</strong> ${dezenas}<br><strong>Prêmio:</strong> R$ ${Number(b.premio || 0).toFixed(2).replace('.', ',')}</p><button class="btn" type="button" onclick="startGame('${b.id}')">Escolher dezenas</button></article>`;
    }).join('');
  } catch (error) {
    console.error('Erro ao carregar bolões:', error);
    list.innerHTML = `<div class="empty">Não foi possível carregar os bolões. ${escapeHtml(error?.message || '')}</div>`;
  }
}
function startGame(id) { window.location.href = `jogar.html?bolao=${encodeURIComponent(id)}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
window.startGame = startGame; window.openAuth = openAuth;
function init() { if (location.pathname.endsWith('/cadastro.html')) registerMode = true; if (location.pathname.endsWith('/login.html')) registerMode = false; bindEvents(); updateSessionUI(); loadBoloes(); try { getSupabase().auth.onAuthStateChange(() => updateSessionUI()); } catch (error) { console.error(error); } }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();