DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vendedor') THEN
        CREATE ROLE vendedor;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'desenhista') THEN
        CREATE ROLE desenhista;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supervisor') THEN
        CREATE ROLE supervisor;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cliente') THEN
        CREATE ROLE cliente;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO vendedor;
GRANT INSERT ON pessoa TO vendedor;
GRANT SELECT ON pessoa TO vendedor;
GRANT INSERT ON solicitacoes TO vendedor;
GRANT UPDATE ON solicitacoes TO vendedor;
GRANT SELECT ON historico_chamados TO vendedor;
GRANT SELECT ON status TO vendedor;
GRANT SELECT ON historico_status TO vendedor;

GRANT USAGE ON SCHEMA public TO desenhista;
GRANT UPDATE ON solicitacoes TO desenhista;
GRANT SELECT ON solicitacoes TO desenhista;
GRANT INSERT ON orcamentos TO desenhista;
GRANT SELECT ON orcamentos TO desenhista;
GRANT SELECT ON status TO desenhista;
GRANT SELECT ON historico_status TO desenhista;

GRANT USAGE ON SCHEMA public TO supervisor;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supervisor;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supervisor;

GRANT USAGE ON SCHEMA public TO cliente;
GRANT SELECT ON solicitacoes TO cliente;
GRANT SELECT ON status TO cliente;
GRANT SELECT ON orcamentos TO cliente;
