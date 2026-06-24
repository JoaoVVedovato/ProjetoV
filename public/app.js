const Auth = {
  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem('usuarioAutenticado'));
    } catch { return null; }
  },

  isLoggedIn() { return !!this.getUser(); },

  logout() {
    sessionStorage.removeItem('usuarioAutenticado');
    window.location.href = '/';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/';
      return false;
    }
    return true;
  }
};

const Api = {
  async request(method, endpoint, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
      const res = await fetch(`/api${endpoint}`, config);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || data.mensagem || 'Erro na requisição');
      }
      return data;
    } catch (err) { throw err; }
  },

  get(endpoint)         { return this.request('GET', endpoint); },
  post(endpoint, body)  { return this.request('POST', endpoint, body); },
  put(endpoint, body)   { return this.request('PUT', endpoint, body); },
  delete(endpoint)      { return this.request('DELETE', endpoint); },
};

const Toast = {
  show(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', info: 'i' };
    const colors = { success: '#27ae60', error: '#e74c3c', info: '#2980b9' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-weight:700;color:${colors[type]}">${icons[type]}</span>
      <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

const Modal = {
  open(id) { document.getElementById(id)?.classList.remove('hidden'); document.body.style.overflow = 'hidden'; },
  close(id) { document.getElementById(id)?.classList.add('hidden'); document.body.style.overflow = ''; },
  confirm(message, onConfirm) {
    const existing = document.getElementById('modal-confirm');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'modal-confirm';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header"><span class="modal-title">Confirmar ação</span></div>
        <div class="modal-body"><p style="color:var(--text-secondary);font-size:14px">${message}</p></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modal-confirm').remove()">Cancelar</button>
          <button class="btn btn-danger" id="btn-confirm-action">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('btn-confirm-action').onclick = () => { modal.remove(); onConfirm(); };
  }
};

const Fmt = {
  date(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  },
  datetime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },
  currency(value) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
};

const Status = {
  labels: {
    'aberto':        'Aberto',
    'em andamento':  'Em Andamento',
    'finalizado':    'Finalizado',
    'cancelado':     'Cancelado'
  },
  classes: {
    'aberto':       'badge-aberto',
    'em andamento': 'badge-em-andamento',
    'finalizado':   'badge-finalizado',
    'cancelado':    'badge-cancelado'
  },
  badge(status) {
    const label = this.labels[status] || status;
    const cls   = this.classes[status] || 'badge-aberto';
    return `<span class="badge ${cls}">${label}</span>`;
  }
};

function buildSidebar(activePage) {
  const user = Auth.getUser();
  if (!user) return;

  const initials = user.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const papel = user.papel || 'usuário';
  const papelLabel = { vendedor: 'Vendedor', supervisor: 'Supervisor', desenhista: 'Desenhista' }[papel] || papel;

  const navItems = [
    { id: 'index',       icon: '⊞', label: 'Início',       href: '/' },
    { id: 'clientes',    icon: '◉', label: 'Clientes',      href: '/clientes' },
    { id: 'documentacao',icon: '◈', label: 'Solicitações',  href: '/documentacao' },
    { id: 'status',      icon: '⚙', label: 'Alterar Status', href: '/status' },
    { id: 'orcamento',   icon: '◎', label: 'Orçamentos',    href: '/orcamento' },
    { id: 'historico',   icon: '📋', label: 'Histórico',     href: '/historico' },
    { id: 'usuarios',    icon: '👤', label: 'Gestores',      href: '/usuarios' },
  ];

  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">P</div>
      <div>
        <div class="logo-text">PLO</div>
        <span class="logo-sub">Perfil Metais</span>
      </div>
    </div>

    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-name">${user.nome}</div>
      <div class="user-role">${papelLabel}</div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-title">Menu</div>
      ${navItems.map(item => `
        <div class="nav-item ${item.id === activePage ? 'active' : ''}" onclick="window.location.href='${item.href}'">
          <span class="nav-icon">${item.icon}</span>
          ${item.label}
        </div>
      `).join('')}
    </nav>

    <div class="sidebar-bottom">
      <button class="btn-logout" onclick="Auth.logout()">
        <span>⬡</span> Sair do sistema
      </button>
    </div>
  `;
}
