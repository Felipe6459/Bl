import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ujddnzckfrksetsfgden.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lo9uaX-E9hHcL-w2El6M3g_OoCRma3W';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let games = [];

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = value => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
const digits = value => String(value || '').replace(/\D/g, '');

async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = './login.html'; return null; }
  const { data: profile, error } = await supabase.from('profiles').select('full_name,is_admin').eq('id', user.id).single();
  if (error || !profile?.is_admin) {
    await supabase.auth.signOut();
    window.location.href = './login.html';
    return null;
  }
  return profile;
}

async function loadDashboard() {
  const profile = await requireAdmin();
  if (!profile) return;
  document.getElementById('adminMessage').textContent = `Olá, ${profile.full_name}. Aqui você acompanha todos os jogos e clientes.`;

  const [{ data: profiles }, { data: orders }, { data: allGames }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,cpf,phone,created_at').order('created_at', { ascending: false }),
    supabase.from('pedidos').select('id,comprador_id,bolao_id,quantidade_jogos,valor_total,status,asaas_payment_id,created_at,paid_at').order('created_at', { ascending: false }),
    supabase.from('jogos').select('id,pedido_id,comprador_id,bolao_id,numero,dezenas,created_at').order('created_at', { ascending: false })
  ]);

  const clientMap = new Map((profiles || []).map(p => [p.id, p]));
  const orderMap = new Map((orders || []).map(o => [o.id, o]));
  games = (allGames || []).map(g => ({ ...g, client: clientMap.get(g.comprador_id), order: orderMap.get(g.pedido_id) }));

  const paidOrders = (orders || []).filter(o => o.status === 'pago' || o.status === 'paid');
  document.getElementById('stats').innerHTML = `
    <article class="admin-stat"><span>CLIENTES</span><strong>${(profiles || []).length}</strong></article>
    <article class="admin-stat"><span>TODOS OS JOGOS</span><strong>${games.length}</strong></article>
    <article class="admin-stat"><span>JOGOS PAGOS</span><strong>${games.filter(g => ['pago','paid'].includes(g.order?.status)).length}</strong></article>
    <article class="admin-stat"><span>VENDIDO</span><strong>${money(paidOrders.reduce((sum,o) => sum + Number(o.valor_total || 0), 0))}</strong></article>`;

  renderGames();
  renderClients(profiles || [], orders || []);
}

function renderGames() {
  const term = document.getElementById('searchGames').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const filtered = games.filter(g => {
    const customer = g.client || {};
    const haystack = `${customer.full_name || ''} ${customer.phone || ''} ${customer.cpf || ''} ${g.dezenas || ''} ${g.numero || ''}`.toLowerCase();
    return (!term || haystack.includes(term)) && (!status || g.order?.status === status);
  });
  const el = document.getElementById('gamesList');
  if (!filtered.length) { el.innerHTML = '<div class="empty">Nenhum jogo encontrado.</div>'; return; }
  el.innerHTML = `<table class="admin-table"><thead><tr><th>Jogo</th><th>Cliente</th><th>Dezenas</th><th>Status</th><th>Data</th></tr></thead><tbody>${filtered.map(g => {
    const statusText = g.order?.status || 'sem pedido';
    return `<tr><td>#${escapeHtml(g.numero)}</td><td><strong>${escapeHtml(g.client?.full_name || 'Cliente')}</strong><br><small>${escapeHtml(g.client?.phone || '')}</small></td><td class="numbers">${escapeHtml(g.dezenas)}</td><td><span class="status ${escapeHtml(statusText)}">${escapeHtml(statusText)}</span></td><td>${new Date(g.created_at).toLocaleString('pt-BR')}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function renderClients(profiles, orders) {
  const orderCount = new Map();
  for (const o of orders) orderCount.set(o.comprador_id, (orderCount.get(o.comprador_id) || 0) + Number(o.quantidade_jogos || 0));
  document.getElementById('clientsList').innerHTML = profiles.length ? `<table class="admin-table"><thead><tr><th>Cliente</th><th>CPF</th><th>Telefone</th><th>Jogos</th></tr></thead><tbody>${profiles.map(p => `<tr><td>${escapeHtml(p.full_name)}</td><td>${escapeHtml(p.cpf)}</td><td>${escapeHtml(p.phone)}</td><td>${orderCount.get(p.id) || 0}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nenhum cliente cadastrado.</div>';
}

document.getElementById('searchGames').addEventListener('input', renderGames);
document.getElementById('statusFilter').addEventListener('change', renderGames);
document.getElementById('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = './login.html'; });
loadDashboard();
