const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();

function validarEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function validarTelefone(tel) {
  if (!tel) return true;
  const d = tel.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 11;
}

function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11; if (r >= 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11; if (r >= 10) r = 0;
  return r === parseInt(d[10]);
}

function validarCNPJ(cnpj) {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n, len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += parseInt(n[len - i]) * pos--; if (pos < 2) pos = 9; }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(d, 12) === parseInt(d[12]) && calc(d, 13) === parseInt(d[13]);
}

function validarDocumento(doc) {
  if (!doc) return true;
  const digits = doc.replace(/\D/g, '');
  return digits.length <= 11 ? validarCPF(doc) : validarCNPJ(doc);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});
app.get("/clientes", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "clientes.html"));
});
app.get("/solicitacoes", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "solicitacoes.html"));
});
app.get("/status", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "status.html"));
});
app.get("/historico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "historico.html"));
});
app.get("/orcamento", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "orcamento.html"));
});
app.get("/usuarios", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "usuarios.html"));
});
app.get("/fila", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "fila.html"));
});
app.get("/perfil", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "perfil.html"));
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM pessoa WHERE email = $1 AND senha = $2",
      [email, senha]
    );
    if (result.rows.length === 0) {
      return res.json({ sucesso: false, mensagem: "Email ou senha inválidos" });
    }

    const usuario = result.rows[0];

    const papelResult = await db.query(
      `SELECT p.nome FROM papel p
       JOIN pessoa_papel pp ON pp.papel_id = p.id
       WHERE pp.pessoa_id = $1`,
      [usuario.pessoa_id]
    );

    const papeis = papelResult.rows.map(r => r.nome);

    let papel = "cliente";
    if (papeis.includes("supervisor")) papel = "supervisor";
    else if (papeis.includes("desenhista")) papel = "desenhista";
    else if (papeis.includes("vendedor")) papel = "vendedor";

    delete usuario.senha;

    res.json({ sucesso: true, usuario: { ...usuario, papel, papeis } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
});

app.get("/api/perfil/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT pessoa_id, nome, email, documento, telefone, cidade, estado FROM pessoa WHERE pessoa_id = $1",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ erro: "Usuário não encontrado." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar perfil." });
  }
});

app.put("/api/perfil/:id", async (req, res) => {
  const { nome, telefone, cidade, estado, senha_atual, senha_nova } = req.body;
  if (!nome || nome.trim().length < 2) return res.status(400).json({ erro: "Nome inválido." });
  try {
    if (senha_nova) {
      if (!senha_atual) return res.status(400).json({ erro: "Informe a senha atual." });
      if (senha_nova.length < 6) return res.status(400).json({ erro: "Nova senha deve ter no mínimo 6 caracteres." });
      const check = await db.query(
        "SELECT pessoa_id FROM pessoa WHERE pessoa_id = $1 AND senha = $2",
        [req.params.id, senha_atual]
      );
      if (!check.rows.length) return res.status(400).json({ erro: "Senha atual incorreta." });
      await db.query(
        "UPDATE pessoa SET nome=$1, telefone=$2, cidade=$3, estado=$4, senha=$5 WHERE pessoa_id=$6",
        [nome.trim(), telefone || null, cidade || null, estado || null, senha_nova, req.params.id]
      );
    } else {
      await db.query(
        "UPDATE pessoa SET nome=$1, telefone=$2, cidade=$3, estado=$4 WHERE pessoa_id=$5",
        [nome.trim(), telefone || null, cidade || null, estado || null, req.params.id]
      );
    }
    const updated = await db.query(
      "SELECT pessoa_id, nome, email, documento, telefone, cidade, estado FROM pessoa WHERE pessoa_id = $1",
      [req.params.id]
    );
    res.json({ sucesso: true, mensagem: "Perfil atualizado com sucesso!", usuario: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar perfil." });
  }
});

app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.pessoa_id, p.nome, p.email, p.documento, p.telefone,
              STRING_AGG(pa.nome, ', ') AS papeis
       FROM pessoa p
       LEFT JOIN pessoa_papel pp ON pp.pessoa_id = p.pessoa_id
       LEFT JOIN papel pa ON pa.id = pp.papel_id
       WHERE p.tipo_pessoa = 'FISICA'
       GROUP BY p.pessoa_id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar usuários" });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const { nome, documento, email, senha, tipo } = req.body;
  if (!nome || nome.trim().length < 2) return res.status(400).json({ erro: "Nome inválido." });
  if (!validarEmail(email)) return res.status(400).json({ erro: "Email inválido." });
  if (!senha || senha.length < 6) return res.status(400).json({ erro: "Senha deve ter no mínimo 6 caracteres." });
  if (documento && !validarCPF(documento)) return res.status(400).json({ erro: "CPF inválido." });
  try {
    const result = await db.query(
      `INSERT INTO pessoa (nome, documento, email, senha, tipo_pessoa, tipo_documento)
       VALUES ($1, $2, $3, $4, 'FISICA', 'CPF') RETURNING pessoa_id`,
      [nome, documento, email, senha]
    );
    const pessoa_id = result.rows[0].pessoa_id;
    const papel = await db.query("SELECT id FROM papel WHERE nome = $1", [tipo]);
    if (papel.rows.length > 0) {
      await db.query(
        "INSERT INTO pessoa_papel (pessoa_id, papel_id) VALUES ($1, $2)",
        [pessoa_id, papel.rows[0].id]
      );
    }
    res.json({ sucesso: true, mensagem: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar usuário" });
  }
});

app.get("/api/clientes", async (req, res) => {
  try {
    const pagina    = Math.max(1, parseInt(req.query.pagina)    || 1);
    const porPagina = Math.min(100, parseInt(req.query.por_pagina) || 10);
    const nome      = (req.query.nome    || '').trim();
    const documento = (req.query.doc     || '').trim();
    const cidade    = (req.query.cidade  || '').trim();

    const params = [];
    const where  = [
      `(pa.nome = 'cliente' OR pp.pessoa_id IS NULL)`
    ];

    if (nome)      { params.push(`%${nome}%`);      where.push(`p.nome      ILIKE $${params.length}`); }
    if (documento) { params.push(`%${documento}%`); where.push(`p.documento ILIKE $${params.length}`); }
    if (cidade)    { params.push(`%${cidade}%`);    where.push(`p.cidade    ILIKE $${params.length}`); }

    const whereSQL = where.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(DISTINCT p.pessoa_id) AS total
       FROM pessoa p
       LEFT JOIN pessoa_papel pp ON pp.pessoa_id = p.pessoa_id
       LEFT JOIN papel pa ON pa.id = pp.papel_id
       WHERE ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    params.push(porPagina);
    params.push((pagina - 1) * porPagina);

    const result = await db.query(
      `SELECT p.pessoa_id, p.nome, p.email, p.documento, p.telefone, p.cidade, p.estado
       FROM pessoa p
       LEFT JOIN pessoa_papel pp ON pp.pessoa_id = p.pessoa_id
       LEFT JOIN papel pa ON pa.id = pp.papel_id
       WHERE ${whereSQL}
       GROUP BY p.pessoa_id
       ORDER BY p.nome
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ clientes: result.rows, total, pagina, por_pagina: porPagina });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar clientes" });
  }
});

app.post("/api/clientes", async (req, res) => {
  const { nome, documento, email, telefone, cidade, estado } = req.body;
  if (!nome || nome.trim().length < 2) return res.status(400).json({ erro: "Nome inválido." });
  if (email && !validarEmail(email)) return res.status(400).json({ erro: "Email inválido." });
  if (!validarDocumento(documento)) return res.status(400).json({ erro: "CPF ou CNPJ inválido." });
  if (!validarTelefone(telefone)) return res.status(400).json({ erro: "Telefone inválido. Use 10 ou 11 dígitos com DDD." });
  const tipo_documento = documento && documento.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF";
  const tipo_pessoa = tipo_documento === "CNPJ" ? "JURIDICA" : "FISICA";
  try {
    const result = await db.query(
      `INSERT INTO pessoa (nome, documento, email, telefone, cidade, estado, tipo_documento, tipo_pessoa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING pessoa_id`,
      [nome, documento, email, telefone, cidade, estado, tipo_documento, tipo_pessoa]
    );
    const pessoa_id = result.rows[0].pessoa_id;
    const papel = await db.query("SELECT id FROM papel WHERE nome = 'cliente'");
    if (papel.rows.length > 0) {
      await db.query(
        "INSERT INTO pessoa_papel (pessoa_id, papel_id) VALUES ($1, $2)",
        [pessoa_id, papel.rows[0].id]
      );
    }
    res.json({ sucesso: true, mensagem: "Cliente cadastrado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar cliente" });
  }
});

app.get("/api/solicitacoes", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.solicitacao_id, c.nome AS cliente, c.documento, v.nome AS vendedor,
              s.descricao, s.tipo, st.nome AS status, s.data_criacao,
              s.cliente_id, s.vendedor_id,
              CASE WHEN o.id IS NOT NULL THEN true ELSE false END AS tem_orcamento
       FROM solicitacoes s
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       LEFT JOIN pessoa v ON s.vendedor_id = v.pessoa_id
       JOIN status st ON s.status_id = st.id
       LEFT JOIN orcamentos o ON o.solicitacao_id = s.solicitacao_id
       ORDER BY s.data_criacao DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});

app.get("/api/solicitacoes/:id", async (req, res) => {
  try {
    const sol = await db.query(
      `SELECT s.solicitacao_id, c.nome AS cliente, c.pessoa_id AS cliente_id,
              v.nome AS vendedor, s.vendedor_id,
              s.descricao, s.tipo, st.nome AS status, s.data_criacao
       FROM solicitacoes s
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       LEFT JOIN pessoa v ON s.vendedor_id = v.pessoa_id
       JOIN status st ON s.status_id = st.id
       WHERE s.solicitacao_id = $1`, [req.params.id]
    );
    if (!sol.rows.length) return res.status(404).json({ erro: "Solicitação não encontrada." });

    const historico = await db.query(
      `SELECT p.nome AS usuario, st.nome AS status, hs.observacao, hs.data_criacao
       FROM historico_status hs
       LEFT JOIN pessoa p ON hs.usuario_id = p.pessoa_id
       JOIN status st ON hs.status_id = st.id
       WHERE hs.solicitacao_id = $1
       ORDER BY hs.data_criacao ASC`, [req.params.id]
    );

    res.json({ ...sol.rows[0], historico: historico.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar solicitação." });
  }
});

app.put("/api/solicitacoes/:id", async (req, res) => {
  const { cliente_id, tipo, descricao } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: "Cliente é obrigatório." });
  if (!descricao || descricao.trim().length < 10)
    return res.status(400).json({ erro: "Descrição deve ter no mínimo 10 caracteres." });
  try {
    const check = await db.query(
      `SELECT s.status_id, st.nome FROM solicitacoes s JOIN status st ON s.status_id = st.id WHERE s.solicitacao_id = $1`,
      [req.params.id]
    );
    if (!check.rows.length) return res.status(404).json({ erro: "Solicitação não encontrada." });
    if (check.rows[0].nome === 'finalizado')
      return res.status(400).json({ erro: "Não é possível editar uma solicitação finalizada." });

    await db.query(
      "UPDATE solicitacoes SET cliente_id=$1, tipo=$2, descricao=$3 WHERE solicitacao_id=$4",
      [cliente_id, tipo, descricao.trim(), req.params.id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação atualizada com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar solicitação." });
  }
});

app.put("/api/solicitacoes/:id/cancelar", async (req, res) => {
  const { usuario_id, observacao } = req.body;
  try {
    const statusResult = await db.query("SELECT id FROM status WHERE nome = 'cancelado'");
    const status_id = statusResult.rows[0].id;
    await db.query("UPDATE solicitacoes SET status_id=$1 WHERE solicitacao_id=$2", [status_id, req.params.id]);
    await db.query(
      "INSERT INTO historico_status (solicitacao_id, status_id, usuario_id, observacao) VALUES ($1,$2,$3,$4)",
      [req.params.id, status_id, usuario_id || null, observacao || 'Solicitação cancelada.']
    );
    res.json({ sucesso: true, mensagem: "Solicitação cancelada." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao cancelar solicitação." });
  }
});

app.post("/api/solicitacoes", async (req, res) => {
  const { cliente_id, descricao, tipo, vendedor_id } = req.body;
  if (!cliente_id) return res.status(400).json({ erro: "Cliente é obrigatório." });
  if (!descricao || descricao.trim().length < 10) return res.status(400).json({ erro: "Descrição deve ter no mínimo 10 caracteres." });
  try {
    const statusResult = await db.query("SELECT id FROM status WHERE nome = 'aberto'");
    const status_id = statusResult.rows[0].id;
    await db.query(
      `INSERT INTO solicitacoes (cliente_id, vendedor_id, descricao, tipo, status_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [cliente_id, vendedor_id || null, descricao, tipo, status_id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação criada com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao criar solicitação" });
  }
});

app.put("/api/status", async (req, res) => {
  const { solicitacao_id, status_nome, observacao, usuario_id } = req.body;
  if (!solicitacao_id) return res.status(400).json({ erro: "Solicitação é obrigatória." });
  if (!observacao || observacao.trim().length < 5) return res.status(400).json({ erro: "Observação deve ter no mínimo 5 caracteres." });
  try {
    const statusResult = await db.query("SELECT id FROM status WHERE nome = $1", [status_nome]);
    if (statusResult.rows.length === 0) {
      return res.status(400).json({ erro: "Status inválido" });
    }
    const status_id = statusResult.rows[0].id;
    await db.query(
      "UPDATE solicitacoes SET status_id = $1 WHERE solicitacao_id = $2",
      [status_id, solicitacao_id]
    );
    await db.query(
      `INSERT INTO historico_status (solicitacao_id, status_id, usuario_id, observacao)
       VALUES ($1, $2, $3, $4)`,
      [solicitacao_id, status_id, usuario_id || null, observacao]
    );
    res.json({ sucesso: true, mensagem: "Status atualizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar status" });
  }
});

app.get("/api/historico/:solicitacao_id", async (req, res) => {
  const { solicitacao_id } = req.params;
  try {
    const result = await db.query(
      `SELECT p.nome AS usuario, st.nome AS status, hs.observacao, hs.data_criacao
       FROM historico_status hs
       LEFT JOIN pessoa p ON hs.usuario_id = p.pessoa_id
       JOIN status st ON hs.status_id = st.id
       WHERE hs.solicitacao_id = $1
       ORDER BY hs.data_criacao ASC`,
      [solicitacao_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar histórico" });
  }
});

app.get("/api/historico-completo", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.solicitacao_id, c.nome AS cliente, v.nome AS vendedor,
              s.tipo, st_atual.nome AS status_atual, s.data_criacao,
              hs.observacao, p.nome AS alterado_por, st.nome AS status_alterado,
              hs.data_criacao AS data_alteracao
       FROM solicitacoes s
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       LEFT JOIN pessoa v ON s.vendedor_id = v.pessoa_id
       JOIN status st_atual ON s.status_id = st_atual.id
       LEFT JOIN historico_status hs ON hs.solicitacao_id = s.solicitacao_id
       LEFT JOIN pessoa p ON hs.usuario_id = p.pessoa_id
       LEFT JOIN status st ON hs.status_id = st.id
       ORDER BY s.solicitacao_id DESC, hs.data_criacao ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar histórico completo" });
  }
});

app.put("/api/orcamentos/:id/aprovacao", async (req, res) => {
  const { aprovado, obs_aprovacao } = req.body;
  if (typeof aprovado !== 'boolean') return res.status(400).json({ erro: "Informe se foi aprovado ou recusado." });
  try {
    await db.query(
      "UPDATE orcamentos SET aprovado=$1, obs_aprovacao=$2, data_aprovacao=NOW() WHERE id=$3",
      [aprovado, obs_aprovacao || null, req.params.id]
    );
    res.json({ sucesso: true, mensagem: aprovado ? "Orçamento marcado como aprovado!" : "Orçamento marcado como recusado." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao registrar aprovação." });
  }
});

app.get("/api/orcamentos", async (req, res) => {
  try {
    const pagina    = Math.max(1, parseInt(req.query.pagina)    || 1);
    const porPagina = Math.min(100, parseInt(req.query.por_pagina) || 10);
    const aprovacao = req.query.aprovacao;

    const params = [];
    const where  = [];

    if (aprovacao === 'pendente') where.push('o.aprovado IS NULL');
    else if (aprovacao === 'true')  { params.push(true);  where.push(`o.aprovado = $${params.length}`); }
    else if (aprovacao === 'false') { params.push(false); where.push(`o.aprovado = $${params.length}`); }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM orcamentos o ${whereSQL}`,
      params
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    params.push(porPagina);
    params.push((pagina - 1) * porPagina);

    const result = await db.query(
      `SELECT o.id, o.numero_pedido, o.valor_total, o.data_finalizacao,
              o.aprovado, o.obs_aprovacao, o.data_aprovacao,
              s.descricao AS solicitacao, s.solicitacao_id, c.nome AS cliente, s.tipo
       FROM orcamentos o
       JOIN solicitacoes s ON o.solicitacao_id = s.solicitacao_id
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       ${whereSQL}
       ORDER BY o.data_finalizacao DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ orcamentos: result.rows, total, pagina, por_pagina: porPagina });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar orçamentos" });
  }
});

app.post("/api/orcamentos", async (req, res) => {
  const { solicitacao_id, numero_pedido, valor_total } = req.body;
  try {
    if (!numero_pedido || !numero_pedido.trim()) {
      return res.status(400).json({ erro: "Código do orçamento é obrigatório." });
    }
    await db.query(
      `INSERT INTO orcamentos (solicitacao_id, numero_pedido, valor_total, data_finalizacao)
       VALUES ($1, $2, $3, CURRENT_DATE)`,
      [solicitacao_id, numero_pedido, valor_total]
    );
    const statusResult = await db.query("SELECT id FROM status WHERE nome = 'finalizado'");
    await db.query(
      "UPDATE solicitacoes SET status_id = $1 WHERE solicitacao_id = $2",
      [statusResult.rows[0].id, solicitacao_id]
    );
    res.json({ sucesso: true, mensagem: "Orçamento finalizado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao finalizar orçamento" });
  }
});

app.get("/api/dashboard/resumo", async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const filtroData = inicio && fim
      ? `WHERE s.data_criacao BETWEEN '${inicio}' AND '${fim} 23:59:59'`
      : '';
    const filtroOrc = inicio && fim
      ? `WHERE o.data_finalizacao BETWEEN '${inicio}' AND '${fim}'`
      : '';

    const total = await db.query(`SELECT COUNT(*) FROM solicitacoes s ${filtroData}`);
    const convertidos = await db.query(`SELECT COUNT(*) FROM orcamentos o ${filtroOrc}`);
    const valorTotal = await db.query(`SELECT COALESCE(SUM(o.valor_total),0) AS valor FROM orcamentos o ${filtroOrc}`);
    const valorConvertido = await db.query(`SELECT COALESCE(SUM(o.valor_total),0) AS valor FROM orcamentos o ${filtroOrc}`);

    const filtroVendedor = inicio && fim
      ? `WHERE s.data_criacao BETWEEN '${inicio}' AND '${fim} 23:59:59'` : '';
    const porVendedor = await db.query(
      `SELECT v.nome AS vendedor,
              COUNT(DISTINCT s.solicitacao_id) AS total,
              COUNT(DISTINCT o.id) AS convertidos
       FROM solicitacoes s
       LEFT JOIN pessoa v ON s.vendedor_id = v.pessoa_id
       LEFT JOIN orcamentos o ON o.solicitacao_id = s.solicitacao_id
       ${filtroVendedor}
       GROUP BY v.nome
       ORDER BY total DESC`
    );

    const filtroDesenhista = inicio && fim
      ? `AND s.data_criacao BETWEEN '${inicio}' AND '${fim} 23:59:59'` : '';
    const porDesenhista = await db.query(
      `SELECT p.nome AS desenhista,
              COUNT(DISTINCT hs.solicitacao_id) AS finalizados,
              ROUND(AVG(
                EXTRACT(EPOCH FROM (hs.data_criacao - s.data_criacao)) / 3600
              )::numeric, 1) AS tempo_medio
       FROM historico_status hs
       JOIN pessoa p ON hs.usuario_id = p.pessoa_id
       JOIN pessoa_papel pp ON pp.pessoa_id = p.pessoa_id
       JOIN papel pa ON pa.id = pp.papel_id AND pa.nome = 'desenhista'
       JOIN solicitacoes s ON s.solicitacao_id = hs.solicitacao_id
       WHERE 1=1 ${filtroDesenhista}
       GROUP BY p.nome
       ORDER BY finalizados DESC`
    );

    const filtroTempo = inicio && fim
      ? `AND o.data_finalizacao BETWEEN '${inicio}' AND '${fim}'` : '';
    const tempoMedio = await db.query(
      `SELECT ROUND(AVG(
         (o.data_finalizacao - s.data_criacao::date) * 24.0
       )::numeric, 1) AS tempo_medio
       FROM orcamentos o
       JOIN solicitacoes s ON s.solicitacao_id = o.solicitacao_id
       WHERE 1=1 ${filtroTempo}`
    );

    const totalNum = parseInt(total.rows[0].count) || 0;
    const convertidosNum = parseInt(convertidos.rows[0].count) || 0;
    const taxa = totalNum > 0 ? Math.round((convertidosNum / totalNum) * 100) : 0;

    res.json({
      total_orcamentos: totalNum,
      convertidos: convertidosNum,
      taxa_conversao: taxa,
      valor_total_orcado: parseFloat(valorTotal.rows[0].valor) || 0,
      valor_convertido: parseFloat(valorConvertido.rows[0].valor) || 0,
      tempo_medio: parseFloat(tempoMedio.rows[0].tempo_medio) || 0,
      por_vendedor: porVendedor.rows,
      por_desenhista: porDesenhista.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar resumo" });
  }
});

app.get("/api/dashboard/vendedor", async (req, res) => {
  const { vendedor_id } = req.query;
  if (!vendedor_id) return res.status(400).json({ erro: "vendedor_id obrigatório" });
  try {
    const total = await db.query(
      "SELECT COUNT(*) FROM solicitacoes WHERE vendedor_id = $1", [vendedor_id]
    );
    const pendentes = await db.query(
      `SELECT COUNT(*) FROM solicitacoes s
       JOIN status st ON s.status_id = st.id
       WHERE s.vendedor_id = $1 AND st.nome = 'aberto'`, [vendedor_id]
    );
    const orcRecebidos = await db.query(
      `SELECT COUNT(*) FROM orcamentos o
       JOIN solicitacoes s ON s.solicitacao_id = o.solicitacao_id
       WHERE s.vendedor_id = $1`, [vendedor_id]
    );
    const convertidos = await db.query(
      `SELECT COUNT(*) FROM orcamentos o
       JOIN solicitacoes s ON s.solicitacao_id = o.solicitacao_id
       WHERE s.vendedor_id = $1`, [vendedor_id]
    );
    const ultimas = await db.query(
      `SELECT s.solicitacao_id, c.nome AS cliente, st.nome AS status, s.data_criacao
       FROM solicitacoes s
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       JOIN status st ON s.status_id = st.id
       WHERE s.vendedor_id = $1
       ORDER BY s.data_criacao DESC LIMIT 5`, [vendedor_id]
    );
    const orcamentos = await db.query(
      `SELECT o.numero_pedido, o.valor_total, c.nome AS cliente
       FROM orcamentos o
       JOIN solicitacoes s ON s.solicitacao_id = o.solicitacao_id
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       WHERE s.vendedor_id = $1
       ORDER BY o.data_finalizacao DESC LIMIT 10`, [vendedor_id]
    );
    res.json({
      total: parseInt(total.rows[0].count) || 0,
      pendentes: parseInt(pendentes.rows[0].count) || 0,
      orc_recebidos: parseInt(orcRecebidos.rows[0].count) || 0,
      convertidos: parseInt(convertidos.rows[0].count) || 0,
      ultimas_solicitacoes: ultimas.rows,
      orcamentos_prontos: orcamentos.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar dashboard vendedor" });
  }
});

app.get("/api/dashboard/desenhista", async (req, res) => {
  try {
    const usuario_id = req.query.usuario_id || null;

    const fila = await db.query(
      `SELECT s.solicitacao_id, c.nome AS cliente, v.nome AS vendedor,
              s.tipo, s.descricao, s.data_criacao, st.nome AS status
       FROM solicitacoes s
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       LEFT JOIN pessoa v ON s.vendedor_id = v.pessoa_id
       JOIN status st ON s.status_id = st.id
       WHERE st.nome = 'aberto'
       ORDER BY s.data_criacao ASC`
    );

    const meusChamados = usuario_id ? await db.query(
      `SELECT s.solicitacao_id, c.nome AS cliente, v.nome AS vendedor,
              s.tipo, s.descricao, s.data_criacao, st.nome AS status
       FROM solicitacoes s
       JOIN pessoa c ON s.cliente_id = c.pessoa_id
       LEFT JOIN pessoa v ON s.vendedor_id = v.pessoa_id
       JOIN status st ON s.status_id = st.id
       WHERE st.nome = 'em andamento'
         AND EXISTS (
           SELECT 1 FROM historico_status hs
           JOIN status st2 ON hs.status_id = st2.id AND st2.nome = 'em andamento'
           WHERE hs.solicitacao_id = s.solicitacao_id
             AND hs.usuario_id = $1
         )
       ORDER BY s.data_criacao ASC`,
      [usuario_id]
    ) : { rows: [] };
    const finalizadosHoje = await db.query(
      `SELECT COUNT(*) FROM historico_status hs
       JOIN pessoa_papel pp ON pp.pessoa_id = hs.usuario_id
       JOIN papel pa ON pa.id = pp.papel_id AND pa.nome = 'desenhista'
       WHERE DATE(hs.data_criacao) = CURRENT_DATE`
    );
    const tempoMedio = await db.query(
      `SELECT ROUND(AVG(
         EXTRACT(EPOCH FROM (hs.data_criacao - s.data_criacao)) / 3600
       )::numeric, 1) AS tempo_medio
       FROM historico_status hs
       JOIN pessoa_papel pp ON pp.pessoa_id = hs.usuario_id
       JOIN papel pa ON pa.id = pp.papel_id AND pa.nome = 'desenhista'
       JOIN solicitacoes s ON s.solicitacao_id = hs.solicitacao_id`
    );

    res.json({
      fila: fila.rows,
      meus_chamados: meusChamados.rows,
      finalizados_hoje: parseInt(finalizadosHoje.rows[0].count) || 0,
      tempo_medio: parseFloat(tempoMedio.rows[0].tempo_medio) || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar dashboard desenhista" });
  }
});

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
