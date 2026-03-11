CREATE TABLE keys(
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(agent_id),
    key_id VARCHAR(24) NOT NULL UNIQUE,
    secret_hash VARCHAR(64) NOT NULL
);