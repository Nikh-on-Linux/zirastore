CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE folders (
    folder_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id INTEGER NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    parent_id UUID NOT NULL,

    folder_name VARCHAR(255) NOT NULL,

    is_root BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT fk_parent
        FOREIGN KEY (parent_id)
        REFERENCES folders(folder_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_folder_per_parent
        UNIQUE (user_id, parent_id, folder_name)
);

ALTER TABLE folders
ADD CONSTRAINT root_self_parent_check
CHECK (
    (is_root = true AND parent_id = folder_id)
    OR
    (is_root = false AND parent_id <> folder_id)
);