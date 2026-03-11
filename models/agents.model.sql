CREATE TYPE scope AS ENUM('r','w','rw','rwx');
CREATE TABLE agents(
    agent_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_by INTEGER REFERENCES users(user_id),
    scopes scope,
    target_folder text
);