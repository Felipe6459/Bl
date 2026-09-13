import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
const money = value => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { location.href = './login.html'; return false; }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) { await supabase.auth.signOut(); location.href = './login.html'; return false; }
  return true;
}

function message(text, error = false) {
  $('bolaoMessage').textContent = text;
  $('bolaoMessage').className = `message ${error ? 'error' : ''}`;
}

async function loadBoloes() {
  const { data, error } = await supabase.from('boloes').select('id,nome,descricao,concurso,data_sorteio,valor_jogo,premio,quantidade_dezenas,status,created_at').order('created_at', { ascending: false });
  if (error) { message(`Erro ao carregar bolões: ${error.message}`, true); return; }
  const el = $('boloesList');
  if (!data?.length) { el.innerHTML = '<div class="empty">Nenhum bolão cadastrado.</div>'; return; }
  el.innerHTML = `<table class="admin-table"><thead><tr><th>Bolão</th><th>Concurso</th><th>Data</th><th>Jogo</th><th>Dezenas</th><th>Prêmio</th><th>Status</th><th>Ação</th></tr></thead><tbody>${data.map(b => `<tr>
    <td><strong>${esc(b.nome)}</strong>${b.descricao ? `<br><small>${esc(b.descricao)}</small>` : ''}</td>
    <td>${esc(b.concurso)}</td><td>${new Date(`${b.data_sorteio}T00:00:00`).toLocaleDateString('pt-BR')}</td>
    <td>${money(b.valor_jogo)}</td><td>${esc(b.quantidade_dezenas)}</td><td>${money(b.premio)}</td>
    <td><span class="status ${esc(b.status)}">${esc(b.status)}</span></td>
    <td>${b.status === 'ativo' ? `<button class="btn btn-outline action" data-id="${b.id}" data-status="encerrado">Encerrar</button>` : b.status === 'encerrado' ? `<button class="btn btn-outline action" data-id="${b.id}" data-status="ativo">Reabrir</button>` : ''}</td>
  </tr>`).join('')}</tbody></table>`;
  el.querySelectorAll('.action').forEach(btn => btn.addEventListener('click', () => changeStatus(btn.dataset.id, btn.dataset.status)));
}

async function changeStatus(id, status) {
  const { error } = await supabase.from('boloes').update({ status }).eq('id', id);
  if (error) { message(`Erro: ${error.message}`, true); return; }
  message(`Bolão ${status === 'ativo' ? 'reaberto' : 'encerrado'} com sucesso.`);
  loadBoloes();
}

$('bolaoForm').addEventListener('submit', async event => {
  event.preventDefault();
  const payload = {
    nome: $('nome').value.trim(),
    concurso: Number($('concurso').value),
    data_sorteio: $('dataSorteio').value,
    valor_jogo: Number($('valorJogo').value),
    premio: Number($('premio').value),
    quantidade_dezenas: Number($('quantidadeDezenas').value),
    descricao: $('descricao').value.trim() || null,
    status: 'ativo'
  };
  if (payload.quantidade_dezenas < 1 || payload.quantidade_dezenas > 60) return message('A quantidade de dezenas deve estar entre 1 e 60.', true);
  if (payload.valor_jogo <= 0) return message('O preço do jogo deve ser maior que zero.', true);
  if (payload.premio < 0) return message('O prêmio não pode ser negativo.', true);
  const { error } = await supabase.from('boloes').insert(payload);
  if (error) { message(`Erro ao criar bolão: ${error.message}`, true); return; }
  event.target.reset();
  $('valorJogo').value = '10.00'; $('premio').value = '10000.00'; $('quantidadeDezenas').value = '10';
  message('Bolão criado e ativado com sucesso.');
  loadBoloes();
});

(async () => { if (await requireAdmin()) loadBoloes(); })();
