ALTER TABLE IF EXISTS agents
ADD COLUMN created_by INTEGER NOT NULL REFERENCES users(user_id);

ALTER TABLE IF EXISTS agents
ADD COLUMN target_folder UUID REFERENCES folders(folder_id);