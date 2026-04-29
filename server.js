const express = require("express");
const path = require("path");
const db = require("./db"); // importa a conexão com o banco

const app = express();

app.use(express.json()); // permite ler JSON no body das requisições
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// ROTAS DE PÁGINAS (servir os HTMLs)
// ============================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/clientes", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "clientes.html"));
});
app.get("/documentacao", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "documentacao.html"));
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

// ============================================================
// API — LOGIN
// ============================================================

// POST /api/login — verifica email e senha no banco
app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM pessoa WHERE email = $1 AND senha = $2",
      [email, senha]
    );
    if (result.rows.length > 0) {
      res.json({ sucesso: true, usuario: result.rows[0] });
    } else {
      res.json({ sucesso: false, mensagem: "Email ou senha inválidos" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro no servidor" });
  }
});

// ============================================================
// API — USUÁRIOS / GESTORES
// ============================================================

// GET /api/usuarios — lista todos os usuários (não clientes)
app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT pessoa_id, nome, email, documento, telefone FROM pessoa WHERE tipo_pessoa = 'FISICA'"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar usuários" });
  }
});

// POST /api/usuarios — cadastra novo usuário/gestor
app.post("/api/usuarios", async (req, res) => {
  const { nome, documento, email, senha, tipo } = req.body;
  try {
    // Insere a pessoa
    const result = await db.query(
      `INSERT INTO pessoa (nome, documento, email, senha, tipo_pessoa, tipo_documento)
       VALUES ($1, $2, $3, $4, 'FISICA', 'CPF') RETURNING pessoa_id`,
      [nome, documento, email, senha]
    );
    const pessoa_id = result.rows[0].pessoa_id;

    // Busca o papel pelo nome (vendedor, admin, desenhista)
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

// ============================================================
// API — CLIENTES
// ============================================================

// GET /api/clientes — lista todos os clientes
app.get("/api/clientes", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT pessoa_id, nome, email, documento, telefone, cidade, estado FROM pessoa"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar clientes" });
  }
});

// POST /api/clientes — cadastra novo cliente
app.post("/api/clientes", async (req, res) => {
  const { nome, documento, email, telefone, cidade, estado } = req.body;

  // Define tipo de pessoa e documento com base no tamanho do documento
  const tipo_documento = documento && documento.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF";
  const tipo_pessoa = tipo_documento === "CNPJ" ? "JURIDICA" : "FISICA";

  try {
    await db.query(
      `INSERT INTO pessoa (nome, documento, email, telefone, cidade, estado, tipo_documento, tipo_pessoa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [nome, documento, email, telefone, cidade, estado, tipo_documento, tipo_pessoa]
    );
    res.json({ sucesso: true, mensagem: "Cliente cadastrado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao cadastrar cliente" });
  }
});

// ============================================================
// API — SOLICITAÇÕES
// ============================================================

// GET /api/solicitacoes — lista todas as solicitações com nome do cliente e status
app.get("/api/solicitacoes", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.solicitacao_id, p.nome AS cliente, s.descricao, s.tipo,
              st.nome AS status, s.data_criacao
       FROM solicitacoes s
       JOIN pessoa p ON s.cliente_id = p.pessoa_id
       JOIN status st ON s.status_id = st.id
       ORDER BY s.data_criacao DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar solicitações" });
  }
});

// POST /api/solicitacoes — cria nova solicitação
app.post("/api/solicitacoes", async (req, res) => {
  const { cliente_id, descricao, tipo } = req.body;
  try {
    // Status inicial = 'aberto' (id 1)
    const statusResult = await db.query("SELECT id FROM status WHERE nome = 'aberto'");
    const status_id = statusResult.rows[0].id;

    await db.query(
      `INSERT INTO solicitacoes (cliente_id, descricao, tipo, status_id)
       VALUES ($1, $2, $3, $4)`,
      [cliente_id, descricao, tipo, status_id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação criada com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao criar solicitação" });
  }
});

// ============================================================
// API — STATUS
// ============================================================

// PUT /api/status — atualiza o status de uma solicitação
app.put("/api/status", async (req, res) => {
  const { solicitacao_id, status_nome, observacao, usuario_id } = req.body;
  try {
    // Busca o id do status pelo nome
    const statusResult = await db.query(
      "SELECT id FROM status WHERE nome = $1",
      [status_nome]
    );
    if (statusResult.rows.length === 0) {
      return res.status(400).json({ erro: "Status inválido" });
    }
    const status_id = statusResult.rows[0].id;

    // Atualiza a solicitação
    await db.query(
      "UPDATE solicitacoes SET status_id = $1 WHERE solicitacao_id = $2",
      [status_id, solicitacao_id]
    );

    // Registra no histórico de status
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

// ============================================================
// API — HISTÓRICO
// ============================================================

// GET /api/historico/:solicitacao_id — busca histórico de uma solicitação
app.get("/api/historico/:solicitacao_id", async (req, res) => {
  const { solicitacao_id } = req.params;
  try {
    const result = await db.query(
      `SELECT p.nome AS usuario, st.nome AS status, hs.observacao, hs.data_criacao
       FROM historico_status hs
       LEFT JOIN pessoa p ON hs.usuario_id = p.pessoa_id
       JOIN status st ON hs.status_id = st.id
       WHERE hs.solicitacao_id = $1
       ORDER BY hs.data_criacao DESC`,
      [solicitacao_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar histórico" });
  }
});

// ============================================================
// API — ORÇAMENTOS
// ============================================================

// GET /api/orcamentos — lista todos os orçamentos
app.get("/api/orcamentos", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.id, o.numero_pedido, o.valor_total, o.data_finalizacao,
              s.descricao AS solicitacao
       FROM orcamentos o
       JOIN solicitacoes s ON o.solicitacao_id = s.solicitacao_id
       ORDER BY o.data_finalizacao DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar orçamentos" });
  }
});

// POST /api/orcamentos — cadastra novo orçamento e finaliza a solicitação
app.post("/api/orcamentos", async (req, res) => {
  const { solicitacao_id, numero_pedido, valor_total } = req.body;
  try {
    await db.query(
      `INSERT INTO orcamentos (solicitacao_id, numero_pedido, valor_total, data_finalizacao)
       VALUES ($1, $2, $3, CURRENT_DATE)`,
      [solicitacao_id, numero_pedido, valor_total]
    );

    // Marca a solicitação como finalizada
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

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
