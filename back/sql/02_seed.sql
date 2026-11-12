-- ConetaAI - Etapa 4: povoamento do banco (PostgreSQL)
-- Senha de TODOS os usuários de teste: 123456
-- (guardada como hash scrypt, nunca em texto puro; cada hash tem o seu próprio sal.
--  Para gerar outro: node scripts/gerar-hash.js <senha>)


SET client_encoding = 'UTF8';

BEGIN;

-- Listas fechadas
INSERT INTO curso (id, nome) VALUES
    (1,  'Administração'),
    (2,  'Análise e Desenvolvimento de Sistemas'),
    (3,  'Ciência da Computação'),
    (4,  'Ciência de Dados'),
    (5,  'Design Gráfico'),
    (6,  'Engenharia de Computação'),
    (7,  'Engenharia de Software'),
    (8,  'Engenharia Elétrica'),
    (9,  'Estatística'),
    (10, 'Marketing'),
    (11, 'Publicidade e Propaganda'),
    (12, 'Redes de Computadores'),
    (13, 'Sistemas de Informação');

INSERT INTO tecnologia (id, nome) VALUES
    (1,  'aws'),
    (2,  'c#'),
    (3,  'canva'),
    (4,  'css'),
    (5,  'docker'),
    (6,  'excel'),
    (7,  'figma'),
    (8,  'git'),
    (9,  'html'),
    (10, 'java'),
    (11, 'javascript'),
    (12, 'linux'),
    (13, 'node.js'),
    (14, 'php'),
    (15, 'power bi'),
    (16, 'python'),
    (17, 'react'),
    (18, 'sql'),
    (19, 'typescript');

-- Empresas
INSERT INTO empresa (id, nome, email, senha, setor, cidade, descricao, site) VALUES
    (1, 'Nortel Sistemas', 'contato@nortelsistemas.com.br', 'scrypt$16384$8$1$7ofqo-Q6Hp8126b5xTJ_Sw$Y_vdojBNiKEhxeNHJWCUpx9ujg772-8YvncGq5gmJJQ',
        'Tecnologia da Informação', 'Belo Horizonte',
        'Empresa de desenvolvimento de software com foco em soluções web para o setor educacional.',
        'https://nortelsistemas.com.br'),
    (2, 'Vetta Data', 'contato@vettadata.com', 'scrypt$16384$8$1$ZwxJQHK6qV7J4jCNTXrqQQ$zUbfYbr1ZpviCBxgXQIF-b5WyVAnKWNW6DqTvW4_fuE',
        'Dados e Analytics', 'São Paulo',
        'Consultoria de análise de dados para o varejo.',
        'https://vettadata.com');

-- Estudantes (o curso é buscado pelo nome na lista fechada)

INSERT INTO estudante (id, nome, email, senha, cidade, modalidade,
                       disponibilidade_meses, previsao_conclusao, curso_id) VALUES
    (1, 'Luan', 'luan@email.com', 'scrypt$16384$8$1$GyBBIrsiiJojbrFa7wtRTA$CEdNQMVLURjDbyyk_wMH3M63XhzyA5Q_EuxtblCmdGI', 'Belo Horizonte', 'hibrido', 12, '2027-12',
        (SELECT id FROM curso WHERE nome = 'Sistemas de Informação')),
    (2, 'Marina Alves', 'marina@email.com', 'scrypt$16384$8$1$oVLp1B37Kx11xCaG2Qxgpw$2TEQ12vRFKcVPHk_dnL6MP1YX72TnFDmWOtL02RV9PM', 'Belo Horizonte', 'hibrido', 8, '2027-06',
        (SELECT id FROM curso WHERE nome = 'Sistemas de Informação')),
    (3, 'Pedro Souza', 'pedro@email.com', 'scrypt$16384$8$1$T4tswRqYTKrDyQny40BT0A$QC4GQkdFUnJ4Wvil_-s5x9emdaJiOqDQsZvhICyQzps', 'Belo Horizonte', 'presencial', 6, '2026-12',
        (SELECT id FROM curso WHERE nome = 'Ciência da Computação')),
    (4, 'Bianca Ferreira', 'bianca@email.com', 'scrypt$16384$8$1$yrZ1tBrutwTPtOc3yGSlbA$OxrVsnfHVMCA3hwO1nMMfN9JW_vuP9yMcoLXmz5jln0', 'Contagem', 'remoto', 12, '2027-12',
        (SELECT id FROM curso WHERE nome = 'Engenharia de Software'));

-- Habilidades dos estudantes (relacionamento possui)
INSERT INTO estudante_tecnologia (estudante_id, tecnologia_id)
SELECT 1, id FROM tecnologia WHERE nome IN ('javascript', 'sql', 'git', 'react');
INSERT INTO estudante_tecnologia (estudante_id, tecnologia_id)
SELECT 2, id FROM tecnologia WHERE nome IN ('javascript', 'sql', 'react', 'css');
INSERT INTO estudante_tecnologia (estudante_id, tecnologia_id)
SELECT 3, id FROM tecnologia WHERE nome IN ('python', 'sql');
INSERT INTO estudante_tecnologia (estudante_id, tecnologia_id)
SELECT 4, id FROM tecnologia WHERE nome IN ('javascript', 'react', 'typescript');

-- Áreas de interesse (atributo multivalorado)
INSERT INTO estudante_area_interesse (estudante_id, area) VALUES
    (1, 'Desenvolvimento web'),
    (1, 'Dados'),
    (2, 'Desenvolvimento web'),
    (3, 'Dados'),
    (4, 'Desenvolvimento web');

-- Vagas

INSERT INTO vaga (id, cargo, modalidade, cidade, faixa_salarial,
                  periodo_minimo_meses, status, empresa_id) VALUES
    (1, 'Estágio em Engenharia de Software', 'hibrido',    'Belo Horizonte',
        'R$ 1.800 – R$ 2.200', 6,  'Ativa', 1),
    (2, 'Estágio em Análise de Dados',        'remoto',     'São Paulo',
        'R$ 1.600 – R$ 2.000', 12, 'Ativa', 2),
    (3, 'Estágio em Infraestrutura',          'presencial', 'Belo Horizonte',
        'R$ 1.700 – R$ 2.100', 6,  'Ativa', 1);

-- Cursos aceitos por cada vaga (relacionamento aceita)
INSERT INTO vaga_curso (vaga_id, curso_id)
SELECT 1, id FROM curso
WHERE nome IN ('Sistemas de Informação', 'Engenharia de Software', 'Ciência da Computação');
INSERT INTO vaga_curso (vaga_id, curso_id)
SELECT 2, id FROM curso
WHERE nome IN ('Ciência de Dados', 'Estatística', 'Engenharia de Computação');
INSERT INTO vaga_curso (vaga_id, curso_id)
SELECT 3, id FROM curso
WHERE nome IN ('Sistemas de Informação', 'Redes de Computadores');

-- Tecnologias exigidas por cada vaga (relacionamento requer)
INSERT INTO vaga_tecnologia (vaga_id, tecnologia_id)
SELECT 1, id FROM tecnologia WHERE nome IN ('javascript', 'sql', 'react');
INSERT INTO vaga_tecnologia (vaga_id, tecnologia_id)
SELECT 2, id FROM tecnologia WHERE nome IN ('python', 'sql', 'power bi');
INSERT INTO vaga_tecnologia (vaga_id, tecnologia_id)
SELECT 3, id FROM tecnologia WHERE nome IN ('linux', 'docker', 'aws');

-- Curtidas, matches e mensagens começam vazios: são criados pelo uso do sistema.

-- Como os ids acima foram informados à mão, avança as sequências para que os
-- próximos registros criados pelo sistema não colidam com eles.
SELECT setval(pg_get_serial_sequence('curso',      'id'), (SELECT MAX(id) FROM curso));
SELECT setval(pg_get_serial_sequence('tecnologia', 'id'), (SELECT MAX(id) FROM tecnologia));
SELECT setval(pg_get_serial_sequence('empresa',    'id'), (SELECT MAX(id) FROM empresa));
SELECT setval(pg_get_serial_sequence('estudante',  'id'), (SELECT MAX(id) FROM estudante));
SELECT setval(pg_get_serial_sequence('vaga',       'id'), (SELECT MAX(id) FROM vaga));

COMMIT;
