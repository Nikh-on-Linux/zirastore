CREATE TABLE uploads (
    upload_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(255),
    folder_id UUID REFERENCES folders(folder_id),
    total_size BIGINT,
    total_chunks INTEGER NOT NULL,
    chunk_size INTEGER NOT NULL,
    recieved_chunks INTEGER,
    status VARCHAR(50) DEFAULT 'initiated',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uploads_filename_folder_id_unique UNIQUE (filename, folder_id, user_id)
);

CREATE TABLE upload_parts (
    upload_id UUID REFERENCES uploads(upload_id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL,
    size BIGINT NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY(upload_id, part_number)
);