SELECT 'CREATE DATABASE fmaproava_dept'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fmaproava_dept')\gexec
\c fmaproava_dept;
CREATE TABLE IF NOT EXISTS alchemists (
    id SERIAL PRIMARY KEY,
    military_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(50),
    specialization VARCHAR(50),
    rank VARCHAR(30) DEFAULT 'Lieutenant',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    classification VARCHAR(50),
    equivalent_value DECIMAL(10,2) DEFAULT 1.00,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES alchemists(id),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending',
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transmutations (
    id SERIAL PRIMARY KEY,
    alchemist_id INTEGER REFERENCES alchemists(id) NOT NULL,
    objective TEXT NOT NULL,
    circle_diagram TEXT,
    input_material VARCHAR(100),
    output_material VARCHAR(100),
    cost DECIMAL(10,2) DEFAULT 0.00,
    success_rate INTEGER DEFAULT 50,
    result VARCHAR(50),
    result_quantity DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending_review',
    equivalent_verified BOOLEAN DEFAULT FALSE,
    council_approval BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS council_reviews (
    id SERIAL PRIMARY KEY,
    transmutation_id INTEGER REFERENCES transmutations(id) NOT NULL,
    reviewer_id INTEGER REFERENCES alchemists(id) NOT NULL,
    comments TEXT,
    status VARCHAR(20) DEFAULT 'under_review',
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alchemists_military_id') THEN
        CREATE INDEX idx_alchemists_military_id ON alchemists(military_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transmutations_status') THEN
        CREATE INDEX idx_transmutations_status ON transmutations(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transmutations_alchemist') THEN
        CREATE INDEX idx_transmutations_alchemist ON transmutations(alchemist_id);
    END IF;
END $$;
INSERT INTO alchemists (military_id, name, title, specialization, rank) 
SELECT 'A-001', 'Edward Elric', 'Alquimista de Acero', 'Metales', 'Major'
WHERE NOT EXISTS (SELECT 1 FROM alchemists WHERE military_id = 'A-001');
INSERT INTO alchemists (military_id, name, title, specialization, rank) 
SELECT 'A-002', 'Roy Mustang', 'Alquimista de Fuego', 'Química de Gases', 'Colonel'
WHERE NOT EXISTS (SELECT 1 FROM alchemists WHERE military_id = 'A-002');
INSERT INTO alchemists (military_id, name, title, specialization, rank) 
SELECT 'A-003', 'Alex Louis Armstrong', 'Alquimista Fuerte', 'Tierra y Minerales', 'Major'
WHERE NOT EXISTS (SELECT 1 FROM alchemists WHERE military_id = 'A-003');
INSERT INTO materials (name, classification, equivalent_value, stock_quantity) 
SELECT 'Hierro', 'metálico', 1.00, 1000
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name = 'Hierro');
INSERT INTO materials (name, classification, equivalent_value, stock_quantity) 
SELECT 'Acero', 'metálico', 1.50, 800
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name = 'Acero');
INSERT INTO materials (name, classification, equivalent_value, stock_quantity) 
SELECT 'Carbón', 'orgánico', 0.50, 500
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name = 'Carbón');
INSERT INTO materials (name, classification, equivalent_value, stock_quantity) 
SELECT 'Agua', 'líquido', 0.10, 2000
WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name = 'Agua');