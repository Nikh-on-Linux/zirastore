DO $$ BEGIN
    CREATE TYPE scope AS ENUM('r','w','rw','rwx');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE agents(
    agent_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    scopes scope,
    path TEXT NOT NULL
);