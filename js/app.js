const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9HhC-w2El6M3g_OoCRma3W';

let supabase = null;
let registerMode = false;

function getSupabase() {
  if (supabase) return supabase;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('O serviço de autenticação não carregou. Recarregue a página e tente novamente.');
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

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
  const form = document.getElementById('authForm');
  const title = document.getElementById('authTitle');
  const submit = document.getElementById('authSubmit');
  const message = document.getElementById('authMessage');
  const registerFields = document.getElementById('registerFields');
  const switchAuth = document.getElementById('switchAuth');

  registerMode = register;
  title.textContent = register ? 'Criar conta' : 'Entrar';
  submit.textContent = register ? 'Criar minha conta' : 'Entrar';
  switchAuth.textContent = register ? 'Já tenho uma conta' : 'Ainda não tenho conta';
  registerFields.hidden = !register;
  message.textContent = '';
  form.reset();

  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function bindEvents() {
  const cpf = document.getElementById('cpf');
  const phone = document.getElementById('phone');
  const dialog = document.getElementById('authDialog');
  const form = document.getElementById('authForm');
  const submit = document.getElementById('authSubmit');
  const message = document.getElementById('authMessage');

  if (cpf) cpf.addEventListener('input', e => { e.target.value = formatCpf(e.target.value); });
  if (phone) phone.addEventListener('input', e => { e.target.value = formatPhone(e.target.value); });

  document.querySelectorAll('#loginBtn,#heroLogin').forEach(button => {
    button.addEventListener('click', () => openAuth(false));
  });
  document.querySelectorAll('#registerBtn,#heroRegister').forEach(button => {
    button.addEventListener('click', () => openAuth(true));
  });

  document.getElementById('closeAuth')?.addEventListener('click', () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  });

  document.getElementById('switchAuth')?.addEventListener('click', () => openAuth(!registerMode));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.textContent = 'Processando...';
    submit.disabled = true;

    try {
      const client = getSupabase();
      const phoneValue = onlyDigits(phone.value);
      const password = document.getElementById('password').value;

      if (phoneValue.length < 10) throw new Error('Informe um telefone válido.');
      if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

      if (registerMode) {
        const fullName = document.getElementById('fullName').value.trim();
        const cpfValue = onlyDigits(cpf.value);
        if (!fullName) throw new Error('Informe seu nome completo.');
        if (cpfValue.length !== 11) throw new Error('Informe um CPF válido.');

        const { data, error } = await client.auth.signUp({
          phone: `+55${phoneValue}`,
          password,
          options: { data: { full_name: fullName, cpf: cpfValue, phone: phoneValue } }
        });

        if (error) throw error;

        if (!data.session) {
          message.textContent = 'Cadastro criado. Se a confirmação por SMS estiver ativada, confirme o código recebido para entrar.';
        } else {
          message.textContent = 'Conta criada com sucesso!';
          setTimeout(() => { dialog.close(); updateSessionUI(); }, 500);
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          phone: `+55${phoneValue}`,
          password
        });
        if (error) throw error;
        dialog.close();
        await updateSessionUI();
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
      message.textContent = error?.message || 'Não foi possível concluir a operação.';
    } finally {
      submit.disabled = false;
    }
  });
}

async function updateSessionUI() {
  const area = document.getElementById('sessionArea');
  if (!area) return;

  try {
    const client = getSupabase();
    const { data: { session } } = await client.auth.getSession();

    if (!session) {
      area.innerHTML = '<button class="btn btn-outline" id="loginBtn">Entrar</button><button class="btn" id="registerBtn">Criar conta</button>';
      area.querySelector('#loginBtn').onclick = () => openAuth(false);
      area.querySelector('#registerBtn').onclick = () => openAuth(true);
      return;
    }

    area.innerHTML = '<button class="btn" id="accountBtn">Minha conta</button><button class="btn btn-outline" id="logoutBtn">Sair</button>';
    area.querySelector('#accountBtn').onclick = () => { window.location.href = 'minha-conta.html'; };
    area.querySelector('#logoutBtn').onclick = async () => { await client.auth.signOut(); await updateSessionUI(); };
  } catch (error) {
    console.error('Supabase Auth:', error);
  }
}

async function loadBoloes() {
  const list = document.getElementById('boloesList');
  if (!list) return;

  try {
    const client = getSupabase();
    const { data, error } = await client.from('boloes').select('id,nome,descricao,concurso,data_sorteio,valor_jogo').eq('status', 'ativo').order('data_sorteio');
    if (error) throw error;
    if (!data?.length) return;

    list.innerHTML = data.map(b => `<article class="card"><h3>${escapeHtml(b.nome)}</h3><p>${escapeHtml(b.descricao || 'Escolha suas 10 dezenas para participar.')}</p><p><strong>Concurso:</strong> ${b.concurso}<br><strong>Sorteio:</strong> ${new Date(`${b.data_sorteio}T00:00:00`).toLocaleDateString('pt-BR')}<br><strong>Jogo:</strong> R$ ${Number(b.valor_jogo).toFixed(2).replace('.', ',')}</p><button class="btn" onclick="startGame('${b.id}')">Escolher dezenas</button></article>`).join('');
  } catch (error) {
    console.error('Erro ao carregar bolões:', error);
    list.innerHTML = '<div class="empty">Não foi possível carregar os bolões agora.</div>';
  }
}

function startGame(id) {
  window.location.href = `jogar.html?bolao=${encodeURIComponent(id)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

window.startGame = startGame;
window.openAuth = openAuth;

function init() {
  bindEvents();
  updateSessionUI();
  loadBoloes();

  try {
    getSupabase().auth.onAuthStateChange(() => updateSessionUI());
  } catch (error) {
    console.error('Supabase não disponível:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
