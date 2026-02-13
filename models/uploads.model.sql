CREATE TABLE uploads (
    upload_id UUID PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(255),
    pathname VARCHAR(1024) NOT NULL,
    total_size BIGINT,
    status VARCHAR(50) DEFAULT 'initiated',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE upload_parts (
    upload_id UUID REFERENCES uploads(upload_id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL,
    size BIGINT NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY(upload_id, part_number)
);