// src/db.js
// Conexão com o PostgreSQL.
//
// O driver "pg" é usado SÓ para abrir a conexão e enviar comandos. Todo o SQL é
// escrito à mão nos arquivos de src/repositorio/ (sem ORM nem gerador de consultas).
//
// A configuração vem de variáveis de ambiente, para que a senha nunca fique no código:
//   PGPASSWORD  senha do usuário do banco (obrigatória se o PostgreSQL pedir senha)
//   PGUSER      usuário            (padrão: postgres)
//   PGDATABASE  nome do banco      (padrão: conetaai)
//   PGHOST      endereço           (padrão: localhost)
//   PGPORT      porta              (padrão: 5432)
const { Pool } = require("pg");

const configuracao = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "conetaai",
};

const pool = new Pool(configuracao);

// Um erro numa conexão ociosa não deve derrubar o servidor.
pool.on("error", (erro) => console.error("Erro inesperado numa conexão com o banco:", erro.message));

// Executa um comando SQL com parâmetros ($1, $2, ...). Os valores nunca são
// concatenados no texto do SQL: isso evita SQL injection.
function consulta(texto, parametros) {
  return pool.query(texto, parametros);
}

// Executa várias instruções como uma unidade: ou todas funcionam, ou nenhuma é aplicada.
// A função recebida usa "cliente.query(...)" (a mesma conexão durante toda a transação).
async function transacao(funcao) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await funcao(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (erro) {
    try { await cliente.query("ROLLBACK"); } catch (_) { /* a conexão já pode ter caído */ }
    throw erro;
  } finally {
    cliente.release();
  }
}

// Os ids do banco são inteiros. Converte o que chega pela rota (texto ou número)
// e devolve null se não for um id válido, para a rota responder "não encontrado"
// em vez de deixar o PostgreSQL recusar um texto como "abc".
function paraId(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 && numero <= 2147483647 ? numero : null;
}

// Usada ao iniciar o servidor: confirma que o banco responde e que as tabelas existem.
async function testarConexao() {
  const resposta = await consulta(
    `SELECT current_database() AS banco, current_user AS usuario,
            (SELECT count(*) FROM information_schema.tables
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE')::int AS tabelas`
  );
  return resposta.rows[0];
}

// Traduz os erros mais comuns de conexão em orientações para quem está rodando o sistema.
function explicarErroDeConexao(erro) {
  const { host, port, user, database } = configuracao;
  if (erro.code === "ECONNREFUSED") {
    return `Não foi possível conectar ao PostgreSQL em ${host}:${port}. O serviço está rodando?\n` +
           `  Para ligar (cmd como administrador): net start postgresql-x64-18`;
  }
  if (erro.code === "28P01" || /password|senha/i.test(erro.message)) {
    return `Falha de autenticação do usuário "${user}". Defina a senha na variável de ambiente PGPASSWORD.\n` +
           `  PowerShell: $env:PGPASSWORD = "sua-senha"\n` +
           `  cmd:        set PGPASSWORD=sua-senha`;
  }
  if (erro.code === "3D000") {
    return `O banco "${database}" não existe. Crie-o e rode os scripts de back/sql (veja o README).`;
  }
  return `Erro ao conectar ao PostgreSQL: ${erro.message}`;
}

module.exports = { pool, consulta, transacao, paraId, testarConexao, explicarErroDeConexao, configuracao };
