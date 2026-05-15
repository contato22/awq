-- Migration 002: add ENRD business unit
-- Agência de Marketing para empresas do setor solar
-- Triggered: 2026-05-15

INSERT INTO business_units (bu_code, bu_name, economic_type)
VALUES ('ENRD', 'ENRD', 'operating')
ON CONFLICT (bu_code) DO NOTHING;
