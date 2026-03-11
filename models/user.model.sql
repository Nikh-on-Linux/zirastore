CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(agent_id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    accesstoken VARCHAR(255),
    refreshtoken VARCHAR(255),
    image VARCHAR(255)
);