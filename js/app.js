const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const dialog = document.getElementById('authDialog');
const form = document.getElementById('authForm');
const title = document.getElementById('authTitle');
const submit = document.getElementById('authSubmit');
const message = document.getElementById('authMessage');
const registerFields = document.getElementById('registerFields');
const switchAuth = document.getElementById('switchAuth');
let registerMode = false;

const onlyDigits = value => value.replace(/\D/g, '');
const formatCpf = value => {
  const v = onlyDigits(value).slice(0,11);
  return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
};
const formatPhone = value => {
  const v = onlyDigits(value).slice(0,11);
  if(v.length <= 2) return v;
  if(v.length <= 7) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
};

document.getElementById('cpf').addEventListener('input', e => e.target.value = formatCpf(e.target.value));
document.getElementById('phone').addEventListener('input', e => e.target.value = formatPhone(e.target.value));

document.querySelectorAll('#loginBtn,#heroLogin').forEach(b => b.addEventListener('click', () => openAuth(false)));
document.querySelectorAll('#registerBtn,#heroRegister').forEach(b => b.addEventListener('click', () => openAuth(true)));
document.getElementById('closeAuth').addEventListener('click', () => dialog.close());
switchAuth.addEventListener('click', () => openAuth(!registerMode));

function openAuth(register) {
  registerMode = register;
  title.textContent = register ? 'Criar conta' : 'Entrar';
  submit.textContent = register ? 'Criar minha conta' : 'Entrar';
  switchAuth.textContent = register ? 'Já tenho uma conta' : 'Ainda não tenho conta';
  registerFields.hidden = !register;
  message.textContent = '';
  form.reset();
  dialog.showModal();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = 'Processando...';
  submit.disabled = true;
  try {
    const phone = onlyDigits(document.getElementById('phone').value);
    const password = document.getElementById('password').value;
    if (phone.length < 10) throw new Error('Informe um telefone válido.');
    if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');

    if (registerMode) {
      const fullName = document.getElementById('fullName').value.trim();
      const cpf = onlyDigits(document.getElementById('cpf').value);
      if (!fullName) throw new Error('Informe seu nome completo.');
      if (cpf.length !== 11) throw new Error('Informe um CPF válido.');
      const { data, error } = await supabase.auth.signUp({
        phone: `+55${phone}`,
        password,
        options: { data: { full_name: fullName, cpf, phone } }
      });
      if (error) throw error;
      if (!data.session) {
        message.textContent = 'Cadastro criado. Confirme seu telefone por SMS para entrar.';
      } else {
        message.textContent = 'Conta criada com sucesso! Entrando...';
        setTimeout(() => { dialog.close(); updateSessionUI(); }, 600);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ phone: `+55${phone}`, password });
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

async function updateSessionUI() {
  const { data: { session } } = await supabase.auth.getSession();
  const area = document.getElementById('sessionArea');
  if (!session) {
    area.innerHTML = '<button class="btn btn-outline" id="loginBtn">Entrar</button><button class="btn" id="registerBtn">Criar conta</button>';
    area.querySelector('#loginBtn').onclick = () => openAuth(false);
    area.querySelector('#registerBtn').onclick = () => openAuth(true);
    return;
  }
  area.innerHTML = '<button class="btn" id="accountBtn">Minha conta</button><button class="btn btn-outline" id="logoutBtn">Sair</button>';
  area.querySelector('#accountBtn').onclick = () => { window.location.href = 'minha-conta.html'; };
  area.querySelector('#logoutBtn').onclick = async () => { await supabase.auth.signOut(); await updateSessionUI(); };
}

async function loadBoloes() {
  const list = document.getElementById('boloesList');
  const { data, error } = await supabase.from('boloes').select('id,nome,descricao,concurso,data_sorteio,valor_jogo').eq('status','ativo').order('data_sorteio');
  if (error) { list.innerHTML = '<div class="empty">Não foi possível carregar os bolões agora.</div>'; return; }
  if (!data?.length) return;
  list.innerHTML = data.map(b => `<article class="card"><h3>${escapeHtml(b.nome)}</h3><p>${escapeHtml(b.descricao || 'Escolha suas 10 dezenas para participar.')}</p><p><strong>Concurso:</strong> ${b.concurso}<br><strong>Sorteio:</strong> ${new Date(`${b.data_sorteio}T00:00:00`).toLocaleDateString('pt-BR')}<br><strong>Jogo:</strong> R$ ${Number(b.valor_jogo).toFixed(2).replace('.',',')}</p><button class="btn" onclick="startGame('${b.id}')">Escolher dezenas</button></article>`).join('');
}

function startGame(id) { window.location.href = `jogar.html?bolao=${encodeURIComponent(id)}`; }
window.startGame = startGame;
function escapeHtml(value) { return String(value).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
supabase.auth.onAuthStateChange(() => updateSessionUI());
updateSessionUI();
loadBoloes();
