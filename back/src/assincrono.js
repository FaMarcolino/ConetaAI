// src/assincrono.js
// Express 4 não captura erros de funções async sozinho.
// Este wrapper repassa qualquer erro para o middleware de erro do server.js.
module.exports = (funcao) => (req, res, next) => Promise.resolve(funcao(req, res, next)).catch(next);
