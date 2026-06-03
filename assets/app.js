const SUPABASE_URL = 'https://yopftjuohlkwkensbqwh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGZ0anVvaGxrd2tlbnNicXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjU3OTgsImV4cCI6MjA5NjAwMTc5OH0.qW21j0VikVlYNTweAPpU-3lj-Dh9iekY2esokA0_MXM';

let dadosOriginais = [];
let filtroAtivo = 'todos';
let editandoId = null;

async function supabaseFetch(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    },
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function init() {
  await carregarDados();
}

async function carregarDados() {
  dadosOriginais = await supabaseFetch('chamados?order=created_at.desc');
  renderKPIs();
  renderStatusBars();
  renderChartStatus();
  renderFinCards();
  renderChartFin();
  renderChartLojas();
  renderRespBars();
  renderTabela(dadosOriginais);
}

function getStatus(s) {
  if (!s) return 'outro';
  const l = s.toLowerCase();
  if (l.includes('faturado') && !l.includes('aguardando')) return 'faturado';
  if (l.includes('faturar')) return 'faturar';
  if (l.includes('executado')) return 'executado';
  if (l.includes('aguardando')) return 'aguardando';
  if (l.includes('não atendido') || l.includes('nao atendido')) return 'nao-atendido';
  return 'outro';
}

const STATUS_TOOLTIP = {
  'executado':  'Serviço executado. Nota fiscal pendente de emissão.',
  'aguardando': 'Orçamento enviado ao cliente. Aguardando aprovação para execução.',
  'nao-atendido': 'OS registrada mas ainda sem atendimento ou visita técnica.',
  'faturar':    'Serviço aprovado e liberado para emissão de nota fiscal.',
  'faturado':   'Serviço executado e nota fiscal emitida. Processo encerrado.',
  'outro':      'Status não classificado.',
};

function pillHTML(status) {
  const s = getStatus(status);
  const map = {
    'executado':    ['pill pill-blue',   'Executado — Ag. Faturamento'],
    'aguardando':   ['pill pill-amber',  'Ag. Aprovação'],
    'nao-atendido': ['pill pill-red',    'Não Atendido'],
    'faturar':      ['pill pill-purple', 'Faturar'],
    'faturado':     ['pill pill-green',  'Faturado'],
    'outro':        ['pill pill-blue',   'S/OS'],
  };
  const [cls, label] = map[s] || map['outro'];
  const tooltip = STATUS_TOOLTIP[s] || '';
  return `<span class="${cls}" title="${tooltip}" style="cursor:help;">${label}</span>`;
}

function fmt(val) {
  if (!val) return '—';
  return 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function renderKPIs() {
  document.getElementById('kpi-total').textContent        = dadosOriginais.length;
  document.getElementById('kpi-concluido').textContent   = dadosOriginais.filter(c => getStatus(c.status) === 'concluido').length;
  document.getElementById('kpi-aguardando').textContent  = dadosOriginais.filter(c => getStatus(c.status) === 'aguardando').length;
  document.getElementById('kpi-nao-atendido').textContent= dadosOriginais.filter(c => getStatus(c.status) === 'nao-atendido').length;
}

function renderStatusBars() {
  const total     = dadosOriginais.length || 1;
  const concluido = dadosOriginais.filter(c => getStatus(c.status) === 'concluido').length;
  const aguardando= dadosOriginais.filter(c => getStatus(c.status) === 'aguardando').length;
  const naoAtend  = dadosOriginais.filter(c => getStatus(c.status) === 'nao-atendido').length;
  const items = [
    { label: 'Concluído Ag. Faturamento', count: concluido, color: '#1D9E75' },
    { label: 'Aguardando Aprovação ORC',  count: aguardando, color: '#EF9F27' },
    { label: 'Não Atendido',              count: naoAtend,   color: '#E24B4A' },
  ];
  document.getElementById('status-bars').innerHTML = items.map(i => `
    <div class="bar-item">
      <span class="bar-label">${i.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(i.count/total*100)}%;background:${i.color};"></div></div>
      <span class="bar-count">${i.count}</span>
    </div>`).join('');
}

let chartStatus = null, chartFin = null, chartLojas = null;

function renderChartStatus() {
  const concluido = dadosOriginais.filter(c => getStatus(c.status) === 'concluido').length;
  const aguardando= dadosOriginais.filter(c => getStatus(c.status) === 'aguardando').length;
  const naoAtend  = dadosOriginais.filter(c => getStatus(c.status) === 'nao-atendido').length;
  if (chartStatus) chartStatus.destroy();
  chartStatus = new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: { labels: ['Concluído','Ag. Aprovação','Não Atendido'], datasets: [{ data: [concluido, aguardando, naoAtend], backgroundColor: ['#1D9E75','#EF9F27','#E24B4A'], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} chamados` } } } }
  });
}

function renderFinCards() {
  const orcado   = dadosOriginais.reduce((s,c) => s + (c.valor_orcado || 0), 0);
  const aprovado = dadosOriginais.reduce((s,c) => s + (c.valor_aprovado || 0), 0);
  const pendente = orcado - aprovado;
  const taxa     = orcado > 0 ? Math.round(aprovado / orcado * 100) : 0;
  document.getElementById('fin-cards').innerHTML = `
    <div style="background:var(--infox-pale);border-radius:8px;padding:10px 12px;">
      <div style="font-size:9px;color:var(--infox-primary);margin-bottom:3px;font-weight:500;text-transform:uppercase;">Total orçado</div>
      <div style="font-size:15px;font-weight:600;color:var(--infox-primary);">${fmt(orcado)}</div>
    </div>
    <div style="background:var(--green-light);border-radius:8px;padding:10px 12px;">
      <div style="font-size:9px;color:#085041;margin-bottom:3px;font-weight:500;text-transform:uppercase;">Aprovado</div>
      <div style="font-size:15px;font-weight:600;color:#0F6E56;">${fmt(aprovado)}</div>
    </div>
    <div style="background:var(--amber-light);border-radius:8px;padding:10px 12px;">
      <div style="font-size:9px;color:#633806;margin-bottom:3px;font-weight:500;text-transform:uppercase;">Pendente</div>
      <div style="font-size:15px;font-weight:600;color:#854F0B;">${fmt(pendente)}</div>
    </div>
    <div style="background:#F0F4F8;border-radius:8px;padding:10px 12px;">
      <div style="font-size:9px;color:var(--text-secondary);margin-bottom:3px;font-weight:500;text-transform:uppercase;">Taxa aprovação</div>
      <div style="font-size:15px;font-weight:600;color:var(--text-primary);">${taxa}%</div>
    </div>`;
}

function renderChartFin() {
  const orcado   = dadosOriginais.reduce((s,c) => s + (c.valor_orcado || 0), 0);
  const aprovado = dadosOriginais.reduce((s,c) => s + (c.valor_aprovado || 0), 0);
  const pendente = orcado - aprovado;
  if (chartFin) chartFin.destroy();
  chartFin = new Chart(document.getElementById('chart-fin'), {
    type: 'bar',
    data: { labels: ['Total orçado','Aprovado','Pendente'], datasets: [{ data: [orcado, aprovado, pendente], backgroundColor: ['#378ADD','#1D9E75','#EF9F27'], borderWidth: 0, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` R$ ${Number(c.raw).toLocaleString('pt-BR',{minimumFractionDigits:2})}` } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#5A7A99' } }, y: { grid: { color: '#EEF3F8' }, ticks: { font: { size: 10 }, color: '#5A7A99', callback: v => 'R$ '+(v/1000).toFixed(0)+'k' } } } }
  });
}

function renderChartLojas() {
  const contagem = {};
  dadosOriginais.forEach(c => { if (c.loja) contagem[c.loja] = (contagem[c.loja] || 0) + 1; });
  const sorted = Object.entries(contagem).sort((a,b) => b[1]-a[1]);
  if (chartLojas) chartLojas.destroy();
  chartLojas = new Chart(document.getElementById('chart-lojas'), {
    type: 'bar',
    data: { labels: sorted.map(e=>e[0]), datasets: [{ data: sorted.map(e=>e[1]), backgroundColor: '#378ADD', borderWidth: 0, borderRadius: 4 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#EEF3F8' }, ticks: { font: { size: 10 }, color: '#5A7A99', stepSize: 1 } }, y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#1A2B3C' } } } }
  });
}

function renderRespBars() {
  const contagem = {};
  dadosOriginais.forEach(c => {
    const r = c.responsavel && c.responsavel !== '—' ? c.responsavel.split('/')[0].trim() : 'Não definido';
    contagem[r] = (contagem[r] || 0) + 1;
  });
  const sorted = Object.entries(contagem).sort((a,b) => b[1]-a[1]);
  const max = sorted[0]?.[1] || 1;
  const colors = ['#378ADD','#1D9E75','#EF9F27','#E24B4A','#7F77DD'];
  document.getElementById('resp-bars').innerHTML = sorted.map(([nome, count], i) => {
    const initials = nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const color = colors[i % colors.length];
    return `<div class="bar-item" style="margin-bottom:12px;">
      <div style="width:30px;height:30px;border-radius:50%;background:${color}22;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:${color};flex-shrink:0;">${initials}</div>
      <div style="flex:1;margin-left:8px;">
        <div style="font-size:11px;color:var(--text-primary);margin-bottom:4px;">${nome}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/max*100)}%;background:${color};"></div></div>
      </div>
      <span class="bar-count">${count}</span>
    </div>`;
  }).join('');
}

function renderTabela(dados) {
  document.getElementById('tabela-body').innerHTML = dados.length === 0
    ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum chamado encontrado</td></tr>`
    : dados.map(c => `
    <tr style="cursor:pointer;" onclick="abrirModal('${c.id}')">
      <td style="font-weight:500;white-space:nowrap;">${c.n_os || '—'}</td>
      <td style="white-space:nowrap;">${c.loja || '—'}</td>
      <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${c.problema||''}">${c.problema||'—'}</td>
      <td style="white-space:nowrap;">${c.responsavel && c.responsavel !== '—' ? c.responsavel.split('/')[0].trim() : '—'}</td>
      <td style="white-space:nowrap;">${fmt(c.valor_orcado)}</td>
      <td style="white-space:nowrap;">${fmt(c.valor_aprovado)}</td>
      <td>${pillHTML(c.status)}</td>
    </tr>`).join('');
}

function filtrar(tipo, btn) {
  filtroAtivo = tipo;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtrarTabela();
}

function filtrarTabela() {
  const termo = document.getElementById('search').value.toLowerCase();
  let dados = dadosOriginais;
  if (filtroAtivo !== 'todos') dados = dados.filter(c => getStatus(c.status) === filtroAtivo);
  if (termo) dados = dados.filter(c =>
    (c.n_os||'').toLowerCase().includes(termo) ||
    (c.loja||'').toLowerCase().includes(termo) ||
    (c.problema||'').toLowerCase().includes(termo)
  );
  renderTabela(dados);
}

function exportarCSV() {
  const termo = document.getElementById('search').value.toLowerCase();
  let dados = dadosOriginais;
  if (filtroAtivo !== 'todos') dados = dados.filter(c => getStatus(c.status) === filtroAtivo);
  if (termo) dados = dados.filter(c =>
    (c.n_os||'').toLowerCase().includes(termo) ||
    (c.loja||'').toLowerCase().includes(termo) ||
    (c.problema||'').toLowerCase().includes(termo)
  );
  const cabecalho = ['Nº OS','Loja','Problema','Responsável','Valor Orçado','Valor Aprovado','Status'];
  const linhas = dados.map(c => [
    c.n_os||'', c.loja||'', (c.problema||'').replace(/"/g,'""'),
    (c.responsavel||'').split('/')[0].trim(),
    c.valor_orcado ? Number(c.valor_orcado).toFixed(2).replace('.',',') : '',
    c.valor_aprovado ? Number(c.valor_aprovado).toFixed(2).replace('.',',') : '',
    c.status||''
  ]);
  const csv = [cabecalho,...linhas].map(r=>r.map(v=>`"${v}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `infoxtec-sound-report-${filtroAtivo}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportarPDF() { window.print(); }

// ── MODAL ──
function abrirModal(id = null) {
  pedirSenha(() => _abrirModal(id));
  return;
}

function _abrirModal(id = null) {
  editandoId = id;
  const c = id ? dadosOriginais.find(x => x.id === id) : {};
  document.getElementById('modal-titulo').textContent = id ? 'Editar Chamado' : 'Novo Chamado';
  document.getElementById('f-n_os').value         = c.n_os || '';
  document.getElementById('f-loja').value         = c.loja || '';
  document.getElementById('f-problema').value     = c.problema || '';
  document.getElementById('f-data_abertura').value= c.data_abertura || '';
  document.getElementById('f-data_atend').value   = c.data_atend || '';
  document.getElementById('f-acao').value         = c.acao || '';
  document.getElementById('f-responsavel').value  = c.responsavel || '';
  document.getElementById('f-status').value       = c.status || '';
  document.getElementById('f-valor_orcado').value = c.valor_orcado || '';
  document.getElementById('f-valor_aprovado').value= c.valor_aprovado || '';
  document.getElementById('f-n_protocolo').value  = c.n_protocolo || '';
  document.getElementById('f-observacoes').value  = c.observacoes || '';
  document.getElementById('btn-deletar').style.display = id ? 'block' : 'none';
  document.getElementById('modal-overlay').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editandoId = null;
}

async function salvarChamado() {
  const payload = {
    n_os:           document.getElementById('f-n_os').value.trim() || null,
    loja:           document.getElementById('f-loja').value.trim() || null,
    problema:       document.getElementById('f-problema').value.trim() || null,
    data_abertura:  document.getElementById('f-data_abertura').value || null,
    data_atend:     document.getElementById('f-data_atend').value || null,
    acao:           document.getElementById('f-acao').value.trim() || null,
    responsavel:    document.getElementById('f-responsavel').value.trim() || null,
    status:         document.getElementById('f-status').value || null,
    valor_orcado:   parseFloat(document.getElementById('f-valor_orcado').value.replace(',','.')) || null,
    valor_aprovado: parseFloat(document.getElementById('f-valor_aprovado').value.replace(',','.')) || null,
    n_protocolo:    document.getElementById('f-n_protocolo').value.trim() || null,
    observacoes:    document.getElementById('f-observacoes').value.trim() || null,
  };
  try {
    if (editandoId) {
      await supabaseFetch(`chamados?id=eq.${editandoId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await supabaseFetch('chamados', { method: 'POST', body: JSON.stringify(payload) });
    }
    fecharModal();
    await carregarDados();
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

async function deletarChamado() {
  if (!editandoId) return;
  if (!confirm('Deseja excluir este chamado?')) return;
  try {
    await supabaseFetch(`chamados?id=eq.${editandoId}`, { method: 'DELETE', headers: { 'Prefer': '' } });
    fecharModal();
    await carregarDados();
  } catch (err) {
    alert('Erro ao excluir: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', init);

const style = document.createElement('style');
style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// ── AUTENTICAÇÃO SIMPLES ──
const SENHA_HASH = 'a8f5f167f44f4964e6c998dee827110c'; // Infoxtec@!
const SESSION_KEY = 'infox_auth';
const SESSION_DURATION = 15 * 60 * 1000; // 15 minutos

function md5(str) {
  // Implementação simples de hash para validação
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const SENHA_CORRETA = md5('Infoxtec@!');

function isSessaoValida() {
  const auth = sessionStorage.getItem(SESSION_KEY);
  if (!auth) return false;
  const { token, timestamp } = JSON.parse(auth);
  if (token !== SENHA_CORRETA) return false;
  if (Date.now() - timestamp > SESSION_DURATION) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

function salvarSessao() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    token: SENHA_CORRETA,
    timestamp: Date.now()
  }));
}

function pedirSenha(callback) {
  if (isSessaoValida()) { callback(); return; }
  document.getElementById('senha-input').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('senha-callback').dataset.cb = 'pendente';
  window._senhaCallback = callback;
  document.getElementById('modal-senha').style.display = 'flex';
  setTimeout(() => document.getElementById('senha-input').focus(), 100);
}
function confirmarSenha() {
  const val = document.getElementById('senha-input').value;
  if (md5(val) === SENHA_CORRETA) {
    salvarSessao();
    const cb = window._senhaCallback;
    fecharModalSenha();
    if (cb) cb();
  } else {
    document.getElementById('senha-erro').style.display = 'block';
    document.getElementById('senha-input').value = '';
    document.getElementById('senha-input').focus();
  }
}

function fecharModalSenha() {
  document.getElementById('modal-senha').style.display = 'none';
  window._senhaCallback = null;
}

document.addEventListener('keydown', function(e) {
  if (document.getElementById('modal-senha').style.display === 'flex' && e.key === 'Enter') {
    confirmarSenha();
  }
  if (document.getElementById('modal-senha').style.display === 'flex' && e.key === 'Escape') {
    fecharModalSenha();
  }
});
