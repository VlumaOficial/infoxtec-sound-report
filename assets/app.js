let dadosOriginais = [];
let filtroAtivo = 'todos';

async function init() {
  const res = await fetch('data/chamados.json');
  const json = await res.json();
  dadosOriginais = json.chamados;

  const geradoEm = new Date(json.gerado_em);
  document.getElementById('data-ref').textContent =
    geradoEm.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

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
  if (l.includes('conclu')) return 'concluido';
  if (l.includes('aguardando')) return 'aguardando';
  if (l.includes('não atendido') || l.includes('nao atendido')) return 'nao-atendido';
  return 'outro';
}

function pillHTML(status) {
  const s = getStatus(status);
  const map = {
    'concluido':    ['pill pill-green',  'Concluído'],
    'aguardando':   ['pill pill-amber',  'Ag. Aprovação'],
    'nao-atendido': ['pill pill-red',    'Não Atendido'],
    'outro':        ['pill pill-blue',   'S/OS'],
  };
  const [cls, label] = map[s] || map['outro'];
  return `<span class="${cls}">${label}</span>`;
}

function fmt(val) {
  if (!val) return '—';
  return 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function renderKPIs() {
  const total     = dadosOriginais.length;
  const concluido = dadosOriginais.filter(c => getStatus(c.status) === 'concluido').length;
  const aguardando= dadosOriginais.filter(c => getStatus(c.status) === 'aguardando').length;
  const naoAtend  = dadosOriginais.filter(c => getStatus(c.status) === 'nao-atendido').length;

  document.getElementById('kpi-total').textContent       = total;
  document.getElementById('kpi-concluido').textContent   = concluido;
  document.getElementById('kpi-aguardando').textContent  = aguardando;
  document.getElementById('kpi-nao-atendido').textContent= naoAtend;
}

function renderStatusBars() {
  const total     = dadosOriginais.length;
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

function renderChartStatus() {
  const concluido = dadosOriginais.filter(c => getStatus(c.status) === 'concluido').length;
  const aguardando= dadosOriginais.filter(c => getStatus(c.status) === 'aguardando').length;
  const naoAtend  = dadosOriginais.filter(c => getStatus(c.status) === 'nao-atendido').length;

  new Chart(document.getElementById('chart-status'), {
    type: 'doughnut',
    data: {
      labels: ['Concluído', 'Ag. Aprovação', 'Não Atendido'],
      datasets: [{ data: [concluido, aguardando, naoAtend], backgroundColor: ['#1D9E75','#EF9F27','#E24B4A'], borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} chamados` } } }
    }
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

  new Chart(document.getElementById('chart-fin'), {
    type: 'bar',
    data: {
      labels: ['Total orçado', 'Aprovado', 'Pendente'],
      datasets: [{ data: [orcado, aprovado, pendente], backgroundColor: ['#378ADD','#1D9E75','#EF9F27'], borderWidth: 0, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` R$ ${Number(c.raw).toLocaleString('pt-BR', {minimumFractionDigits:2})}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#5A7A99' } },
        y: { grid: { color: '#EEF3F8' }, ticks: { font: { size: 10 }, color: '#5A7A99', callback: v => 'R$ ' + (v/1000).toFixed(0) + 'k' } }
      }
    }
  });
}

function renderChartLojas() {
  const contagem = {};
  dadosOriginais.forEach(c => { if (c.loja) contagem[c.loja] = (contagem[c.loja] || 0) + 1; });
  const sorted = Object.entries(contagem).sort((a,b) => b[1]-a[1]);
  const labels = sorted.map(e => e[0]);
  const data   = sorted.map(e => e[1]);

  new Chart(document.getElementById('chart-lojas'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: '#378ADD', borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#EEF3F8' }, ticks: { font: { size: 10 }, color: '#5A7A99', stepSize: 1 } },
        y: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#1A2B3C' } }
      }
    }
  });
}

function renderRespBars() {
  const contagem = {};
  dadosOriginais.forEach(c => {
    const r = c.responsavel && c.responsavel !== '—' ? c.responsavel.split('/')[0].trim() : 'Não definido';
    contagem[r] = (contagem[r] || 0) + 1;
  });
  const sorted = Object.entries(contagem).sort((a,b) => b[1]-a[1]);
  const max = sorted[0][1];
  const colors = ['#378ADD','#1D9E75','#EF9F27','#E24B4A','#7F77DD'];

  document.getElementById('resp-bars').innerHTML = sorted.map(([nome, count], i) => {
    const initials = nome.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
    const color = colors[i % colors.length];
    return `
      <div class="bar-item" style="margin-bottom:12px;">
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
  document.getElementById('tabela-body').innerHTML = dados.map(c => `
    <tr>
      <td style="font-weight:500;white-space:nowrap;">${c.n_os || '—'}</td>
      <td style="white-space:nowrap;">${c.loja || '—'}</td>
      <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${c.problema || ''}">${c.problema || '—'}</td>
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

  if (filtroAtivo !== 'todos') {
    dados = dados.filter(c => getStatus(c.status) === filtroAtivo);
  }
  if (termo) {
    dados = dados.filter(c =>
      (c.n_os || '').toLowerCase().includes(termo) ||
      (c.loja || '').toLowerCase().includes(termo) ||
      (c.problema || '').toLowerCase().includes(termo)
    );
  }
  renderTabela(dados);
}

function exportarPDF() {
  window.print();
}

document.addEventListener('DOMContentLoaded', init);

function exportarCSV() {
  const termo = document.getElementById('search').value.toLowerCase();
  let dados = dadosOriginais;

  if (filtroAtivo !== 'todos') {
    dados = dados.filter(c => getStatus(c.status) === filtroAtivo);
  }
  if (termo) {
    dados = dados.filter(c =>
      (c.n_os || '').toLowerCase().includes(termo) ||
      (c.loja || '').toLowerCase().includes(termo) ||
      (c.problema || '').toLowerCase().includes(termo)
    );
  }

  const cabecalho = ['Nº OS','Loja','Problema','Responsável','Valor Orçado','Valor Aprovado','Status'];
  const linhas = dados.map(c => [
    c.n_os || '',
    c.loja || '',
    (c.problema || '').replace(/"/g, '""'),
    (c.responsavel || '').split('/')[0].trim(),
    c.valor_orcado ? Number(c.valor_orcado).toFixed(2).replace('.',',') : '',
    c.valor_aprovado ? Number(c.valor_aprovado).toFixed(2).replace('.',',') : '',
    c.status || ''
  ]);

  const csv = [cabecalho, ...linhas]
    .map(r => r.map(v => `"${v}"`).join(';'))
    .join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `infoxtec-sound-report-${filtroAtivo}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function sincronizar() {
  const btn = document.getElementById('btn-sync');
  btn.classList.add('loading');
  btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite;"></i> Sincronizando...';
  btn.disabled = true;

  try {
    const res = await fetch('https://sync.vluma.com.br/sync', {
      method: 'POST',
      headers: { 'X-API-Key': 'o_g1PPynodbzaXwlfrp_QHlm6iT1N-2OaH_NOojaM7c' }
    });
    const data = await res.json();
    if (data.status === 'ok') {
      btn.innerHTML = '<i class="ti ti-check"></i> Atualizado!';
      btn.style.background = '#0F6E56';
      setTimeout(() => location.reload(), 3000);
    } else {
      throw new Error(data.detail || 'Erro desconhecido');
    }
  } catch (err) {
    btn.innerHTML = '<i class="ti ti-alert-triangle"></i> Erro!';
    btn.style.background = '#E24B4A';
    setTimeout(() => {
      btn.classList.remove('loading');
      btn.innerHTML = '<i class="ti ti-refresh"></i> Atualizar dados';
      btn.style.background = '';
      btn.disabled = false;
    }, 4000);
  }
}

const style = document.createElement('style');
style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
document.head.appendChild(style);
