-- Add Jenkins configuration columns to projects table
ALTER TABLE projects ADD COLUMN jenkins_job_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN jenkins_url VARCHAR(500);
ALTER TABLE projects ADD COLUMN jenkins_username VARCHAR(255);
ALTER TABLE projects ADD COLUMN jenkins_token VARCHAR(500);

-- Add indexes for better performance
CREATE INDEX idx_projects_jenkins_job_name ON projects(jenkins_job_name);
CREATE INDEX idx_projects_jenkins_url ON projects(jenkins_url);
