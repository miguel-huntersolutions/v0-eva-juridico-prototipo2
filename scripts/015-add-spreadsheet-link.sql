-- Add spreadsheet_id and spreadsheet_url fields to processes table
-- This will store the Google Sheets link for each process

ALTER TABLE processes
ADD COLUMN IF NOT EXISTS spreadsheet_id TEXT,
ADD COLUMN IF NOT EXISTS spreadsheet_url TEXT;

-- Add comment
COMMENT ON COLUMN processes.spreadsheet_id IS 'Google Sheets spreadsheet ID for this process';
COMMENT ON COLUMN processes.spreadsheet_url IS 'Google Sheets spreadsheet URL for this process';

