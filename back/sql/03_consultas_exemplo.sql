-- =============================================================================
-- ConetaAI - consultas de exemplo (PostgreSQL)
-- Servem para conferir o banco depois do povoamento e como base para o
-- acesso a dados da API. Execute DEPOIS do 02_seed.sql.
-- =============================================================================

SET client_encoding = 'UTF8';

-- 1) Vagas ativas com a empresa, os cursos aceitos e as tecnologias exigidas
--    (junção de 5 tabelas + agregação de texto)
SELECT v.id,
       v.cargo,
       e.nome AS empresa,
       v.modalidade,
       v.cidade,
       (SELECT string_agg(c.nome, ', ' ORDER BY c.nome)
          FROM vaga_curso vc JOIN curso c ON c.id = vc.curso_id
         WHERE vc.vaga_id = v.id) AS cursos_aceitos,
       (SELECT string_agg(t.nome, ', ' ORDER BY t.nome)
          FROM vaga_tecnologia vt JOIN tecnologia t ON t.id = vt.tecnologia_id
         WHERE vt.vaga_id = v.id) AS tecnologias
  FROM vaga v
  JOIN empresa e ON e.id = v.empresa_id
 WHERE v.status = 'Ativa'
 ORDER BY v.id;

-- 2) Candidatos para a vaga 1: estudantes de um curso aceito pela vaga,
--    com quantas das tecnologias exigidas eles dominam (do maior para o menor)
SELECT es.id,
       es.nome,
       cu.nome AS curso,
       COUNT(et.tecnologia_id)                                 AS tecnologias_em_comum,
       (SELECT COUNT(*) FROM vaga_tecnologia WHERE vaga_id = 1) AS tecnologias_exigidas
  FROM vaga_curso vc
  JOIN estudante es ON es.curso_id = vc.curso_id
  JOIN curso     cu ON cu.id = es.curso_id
  LEFT JOIN vaga_tecnologia vt ON vt.vaga_id = vc.vaga_id
  LEFT JOIN estudante_tecnologia et
         ON et.estudante_id = es.id AND et.tecnologia_id = vt.tecnologia_id
 WHERE vc.vaga_id = 1
 GROUP BY es.id, es.nome, cu.nome
 ORDER BY tecnologias_em_comum DESC, es.nome;

-- 3) Quantidade de vagas por empresa (agregação com GROUP BY)
SELECT e.nome AS empresa,
       COUNT(v.id)                                          AS total_vagas,
       COUNT(v.id) FILTER (WHERE v.status = 'Ativa')        AS vagas_ativas
  FROM empresa e
  LEFT JOIN vaga v ON v.empresa_id = e.id
 GROUP BY e.id, e.nome
 ORDER BY total_vagas DESC, e.nome;

-- 4) Tecnologias mais exigidas pelas vagas, comparadas com quantos estudantes as dominam
SELECT t.nome AS tecnologia,
       (SELECT COUNT(*) FROM vaga_tecnologia vt WHERE vt.tecnologia_id = t.id)       AS vagas_que_exigem,
       (SELECT COUNT(*) FROM estudante_tecnologia et WHERE et.tecnologia_id = t.id)  AS estudantes_que_dominam
  FROM tecnologia t
 WHERE EXISTS (SELECT 1 FROM vaga_tecnologia vt WHERE vt.tecnologia_id = t.id)
    OR EXISTS (SELECT 1 FROM estudante_tecnologia et WHERE et.tecnologia_id = t.id)
 ORDER BY vagas_que_exigem DESC, estudantes_que_dominam DESC, t.nome;

-- 5) Matches com os nomes envolvidos e a quantidade de mensagens da conversa
--    (vazio até que alguém dê match pelo sistema)
SELECT m.id,
       es.nome  AS estudante,
       v.cargo  AS vaga,
       e.nome   AS empresa,
       m.criado_em,
       COUNT(ms.id) AS mensagens
  FROM match m
  JOIN estudante es ON es.id = m.estudante_id
  JOIN vaga      v  ON v.id  = m.vaga_id
  JOIN empresa   e  ON e.id  = v.empresa_id
  LEFT JOIN mensagem ms ON ms.match_id = m.id
 GROUP BY m.id, es.nome, v.cargo, e.nome, m.criado_em
 ORDER BY m.criado_em DESC;
