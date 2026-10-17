-- PASO 0 — Borrar esquema public y empezar limpio (Supabase SQL Editor)
-- Ejecutar SOLO este archivo primero, luego 000-rebuild-all.sql

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Limpiar políticas de storage del bucket entity-logos (si existían)
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to logos" ON storage.objects;
