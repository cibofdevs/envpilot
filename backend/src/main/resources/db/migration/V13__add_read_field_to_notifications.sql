-- Add read field to notifications table
ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;

-- Update existing notifications to be marked as read
UPDATE notifications SET read = TRUE WHERE read IS NULL; 