// scripts/gerar-hash.js
// Gera o hash de uma senha, no formato guardado na coluna "senha" do banco.
// Serve para criar usuários direto em SQL (por exemplo, no 02_seed.sql).
//
// Uso (dentro da pasta back):   node scripts/gerar-hash.js 123456
const { gerarHash } = require("../src/autenticacao");

const senha = process.argv[2];
if (!senha) {
  console.error("Informe a senha. Exemplo: node scripts/gerar-hash.js 123456");
  process.exit(1);
}

gerarHash(senha).then((hash) => console.log(hash));
