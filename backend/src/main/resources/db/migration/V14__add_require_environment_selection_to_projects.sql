-- Add require_environment_selection to projects table
-- Lets a project opt out of requiring an EnvPilot Environment (dev/staging/production)
-- selection on deploy, for Jenkins jobs that have no environment concept at all.
ALTER TABLE projects ADD COLUMN require_environment_selection BOOLEAN DEFAULT TRUE;

-- Existing projects keep today's behavior (Environment selection required)
UPDATE projects SET require_environment_selection = TRUE WHERE require_environment_selection IS NULL;
