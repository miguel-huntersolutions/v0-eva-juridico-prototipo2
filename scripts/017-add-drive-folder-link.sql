-- Add drive_folder_id and drive_folder_url to processes table
ALTER TABLE processes
ADD COLUMN drive_folder_id TEXT,
ADD COLUMN drive_folder_url TEXT;

