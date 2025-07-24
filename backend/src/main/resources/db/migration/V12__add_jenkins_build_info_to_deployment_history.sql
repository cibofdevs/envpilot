-- Add Jenkins build information to deployment_history table
ALTER TABLE deployment_history 
ADD COLUMN jenkins_build_number INTEGER,
ADD COLUMN jenkins_build_url VARCHAR(500); 