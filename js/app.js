const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';

let supabase = null;
let registerMode = false;

function getSupabase() {
  if (supabase) return supabase;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Não foi possível carregar o sistema de cadastro. Atualize a página.');
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

function onlyDigits(value) { return String(value || '').replace(/\D/g, ''); }
function formatCpf(value) {
  const v = onlyDigits(value).slice(0, 11);
  return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function formatPhone(value) {
  const v = onlyDigits(value).slice(0, 11);
  if (v.length <= 2) return v;
  if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

function openAuth(register) {
  const dialog = document.getElementById('authDialog');
  if (!dialog) return;
  registerMode = !!register;
  document.getElementById('authTitle').textContent = registerMode ? 'Criar conta' : 'Entrar';
  document.getElementById('authSubmit').textContent = registerMode ? 'Criar minha conta' : 'Entrar';
  document.getElementById('switchAuth').textContent = registerMode ? 'Já tenho uma conta' : 'Ainda não tenho conta';
  document.getElementById('registerFields').hidden = !registerMode;
  document.getElementById('authMessage').textContent = '';
  document.getElementById('authForm').reset();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
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
    event.preventDefault();
    const message = document.getElementById('authMessage');
    const submit = document.getElementById('authSubmit');
    message.textContent = 'Processando...';
    submit.disabled = true;
    try {
      const client = getSupabase();
      const phoneValue = onlyDigits(document.getElementById('phone').value);
      const password = document.getElementById('password').value;
      if (phoneValue.length !== 11) throw new Error('Informe um telefone com 11 dígitos.');
      if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

      if (registerMode) {
        const fullName = document.getElementById('fullName').value.trim();
        const cpfValue = onlyDigits(document.getElementById('cpf').value);
        if (!fullName) throw new Error('Informe seu nome completo.');
        if (cpfValue.length !== 11) throw new Error('Informe um CPF válido.');
        const { data, error } = await client.auth.signUp({
          phone: `+55${phoneValue}`,
          password,
          options: { data: { full_name: fullName, cpf: cpfValue, phone: phoneValue } }
        });
        if (error) throw error;
        if (!data.session) {
          message.textContent = 'Cadastro criado. Confirme o SMS recebido para entrar.';
        } else {
          message.textContent = 'Conta criada com sucesso!';
          setTimeout(() => { document.getElementById('authDialog').close(); updateSessionUI(); }, 500);
        }
      } else {
        const { error } = await client.auth.signInWithPassword({ phone: `+55${phoneValue}`, password });
        if (error) throw error;
        document.getElementById('authDialog').close();
        await updateSessionUI();
      }
    } catch (error) {
      console.error(error);
      message.textContent = error?.message || 'Não foi possível concluir o cadastro.';
    } finally {
      submit.disabled = false;
    }
  });
}

async function updateSessionUI() {
  try {
    const client = getSupabase();
    const { data: { session } } = await client.auth.getSession();
    const area = document.getElementById('sessionArea');
    if (!area) return;
    if (!session) {
      area.innerHTML = '<button class="btn btn-outline" id="loginBtn">Entrar</button><button class="btn" id="registerBtn">Criar conta</button>';
      document.getElementById('loginBtn').onclick = () => openAuth(false);
      document.getElementById('registerBtn').onclick = () => openAuth(true);
    } else {
      area.innerHTML = '<button class="btn" id="accountBtn">Minha conta</button><button class="btn btn-outline" id="logoutBtn">Sair</button>';
      document.getElementById('accountBtn').onclick = () => location.href = 'minha-conta.html';
      document.getElementById('logoutBtn').onclick = async () => { await client.auth.signOut(); updateSessionUI(); };
    }
  } catch (error) { console.error('Supabase Auth:', error); }
}

async function loadBoloes() {
  const list = document.getElementById('boloesList');
  if (!list) return;
  try {
    const { data, error } = await getSupabase().from('boloes').select('id,nome,descricao,concurso,data_sorteio,valor_jogo').eq('status', 'ativo').order('data_sorteio');
    if (error) throw error;
    if (!data?.length) return;
    list.innerHTML = data.map(b => `<article class="card"><h3>${escapeHtml(b.nome)}</h3><p>${escapeHtml(b.descricao || 'Escolha suas 10 dezenas para participar.')}</p><p><strong>Concurso:</strong> ${b.concurso}<br><strong>Sorteio:</strong> ${new Date(`${b.data_sorteio}T00:00:00`).toLocaleDateString('pt-BR')}<br><strong>Jogo:</strong> R$ ${Number(b.valor_jogo).toFixed(2).replace('.', ',')}</p><button class="btn" onclick="startGame('${b.id}')">Escolher dezenas</button></article>`).join('');
  } catch (error) { console.error('Erro ao carregar bolões:', error); }
}

function startGame(id) { window.location.href = `jogar.html?bolao=${encodeURIComponent(id)}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
window.startGame = startGame;
window.openAuth = openAuth;

function init() {
  bindEvents();
  updateSessionUI();
  loadBoloes();
  try { getSupabase().auth.onAuthStateChange(() => updateSessionUI()); } catch (error) { console.error(error); }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
