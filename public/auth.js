function getUsuario() {
  const u = sessionStorage.getItem('usuario');
  return u ? JSON.parse(u) : null;
}

function getPapel() {
  const u = getUsuario();
  return u ? u.papel : null;
}

function requireAuth() {
  const u = getUsuario();
  if (!u) { window.location.href = '/'; return null; }
  return u;
}

function requirePapel(papeis) {
  const u = requireAuth();
  if (!u) return null;
  const allowed = Array.isArray(papeis) ? papeis : [papeis];
  if (!allowed.includes(u.papel)) {
    alert('Acesso negado: você não tem permissão para acessar esta página.');
    window.location.href = '/dashboard';
    return null;
  }
  return u;
}

function sair() {
  sessionStorage.removeItem('usuario');
  window.location.href = '/';
}

function iniciais(nome) {
  if (!nome) return 'U';
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function papelLabel(papel) {
  const map = {
    supervisor: 'GERENTE',
    vendedor: 'VENDEDOR',
    desenhista: 'DESENHISTA',
    cliente: 'CLIENTE',
    administrador: 'ADMINISTRADOR'
  };
  return map[papel] || papel.toUpperCase();
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR');
}

function formatMoeda(v) {
  return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function badgeStatus(status) {
  const map = {
    'aberto': 'badge-aberto',
    'em andamento': 'badge-em-andamento',
    'finalizado': 'badge-finalizado',
    'cancelado': 'badge-cancelado'
  };
  const cls = map[(status || '').toLowerCase()] || '';
  return `<span class="badge ${cls}">${status}</span>`;
}

function buildSidebar(paginaAtiva) {
  const u = getUsuario();
  if (!u) return;

  const menus = {
    supervisor: [
      { href: '/dashboard', icon: '▦', label: 'Dashboard' },
      { href: '/clientes', icon: '◎', label: 'Clientes' },
      { href: '/solicitacoes', icon: '◈', label: 'Solicitações' },
      { href: '/status', icon: '◐', label: 'Alterar Status' },
      { href: '/orcamento', icon: '◆', label: 'Orçamentos' },
      { href: '/historico', icon: '◑', label: 'Histórico' },
      { href: '/perfil', icon: '◉', label: 'Meu Perfil' },
    ],
    vendedor: [
      { href: '/dashboard', icon: '▦', label: 'Dashboard' },
      { href: '/clientes', icon: '◎', label: 'Clientes' },
      { href: '/solicitacoes', icon: '◈', label: 'Solicitações' },
      { href: '/orcamento', icon: '◆', label: 'Orçamentos' },
      { href: '/perfil', icon: '◉', label: 'Meu Perfil' },
    ],
    desenhista: [
      { href: '/dashboard', icon: '▦', label: 'Dashboard' },
      { href: '/clientes', icon: '◎', label: 'Clientes' },
      { href: '/fila', icon: '◈', label: 'Fila de Orçamentos' },
      { href: '/status', icon: '◐', label: 'Alterar Status' },
      { href: '/perfil', icon: '◉', label: 'Meu Perfil' },
    ],
  };

  const itens = menus[u.papel] || menus.vendedor;

  const navHTML = itens.map(item => `
    <a href="${item.href}" class="nav-item ${paginaAtiva === item.href ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      ${item.label}
    </a>
  `).join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-badge">P</div>
      <div class="logo-name">PLO</div>
      <div class="logo-sub">Perfil Metais</div>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">${iniciais(u.nome)}</div>
      <div class="user-name">${u.nome}</div>
      <div class="user-role">${papelLabel(u.papel)}</div>
    </div>
    <nav class="sidebar-menu">
      <div class="menu-label">Menu</div>
      ${navHTML}
    </nav>
    <div class="sidebar-bottom">
      <button class="nav-item" onclick="sair()" style="color:#e74c3c">
        <span class="nav-icon">⊗</span> Sair
      </button>
    </div>
  `;
}

function buildTopbar(titulo) {
  const el = document.getElementById('topbar');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dateStr = now.toLocaleDateString('pt-BR', opts);
  el.innerHTML = `
    <span class="topbar-title">${titulo}</span>
    <span class="topbar-date">${dateStr}</span>
  `;
}

function validarEmail(email) {
  if (!email || !email.trim()) return 'Email é obrigatório.';
  if (!email.includes('@')) return 'Email deve conter @.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'Email inválido.';
  return null;
}

function validarTelefone(tel) {
  if (!tel || !tel.trim()) return null; // telefone é opcional
  const digits = tel.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return 'Telefone deve ter 10 ou 11 dígitos (com DDD).';
  return null;
}

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return 'CPF deve ter 11 dígitos.';
  if (/^(\d)\1{10}$/.test(d)) return 'CPF inválido.';
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return 'CPF inválido.';
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[10])) return 'CPF inválido.';
  return null;
}

function validarCNPJ(cnpj) {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return 'CNPJ deve ter 14 dígitos.';
  if (/^(\d)\1{13}$/.test(d)) return 'CNPJ inválido.';
  const calc = (n, len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(n.charAt(len - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  if (calc(d, 12) !== parseInt(d[12])) return 'CNPJ inválido.';
  if (calc(d, 13) !== parseInt(d[13])) return 'CNPJ inválido.';
  return null;
}

function validarDocumento(doc) {
  if (!doc || !doc.trim()) return null; // documento é opcional para clientes
  const digits = doc.replace(/\D/g, '');
  if (digits.length <= 11) return validarCPF(doc);
  return validarCNPJ(doc);
}

function validarSenha(senha) {
  if (!senha || !senha.trim()) return 'Senha é obrigatória.';
  if (senha.length < 6) return 'Senha deve ter no mínimo 6 caracteres.';
  return null;
}

function validarNome(nome) {
  if (!nome || !nome.trim()) return 'Nome é obrigatório.';
  if (nome.trim().length < 2) return 'Nome deve ter no mínimo 2 caracteres.';
  return null;
}

function validarValor(valor) {
  if (!valor && valor !== 0) return 'Valor é obrigatório.';
  if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) return 'Valor deve ser maior que zero.';
  return null;
}

function validar(regras) {
  for (const [campo, erro] of regras) {
    if (erro) { showMsg(campo, erro, 'erro'); return false; }
  }
  return true;
}

function showMsg(id, msg, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = tipo === 'erro' ? 'msg-error' : 'msg-success';
  el.textContent = msg;
  setTimeout(() => { el.className = 'msg-hidden'; el.textContent = ''; }, 4000);
}
