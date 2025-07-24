-- Create environment_assignments table
CREATE TABLE environment_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    environment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'DEVELOPER',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    
    -- Foreign key constraints
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE KEY unique_environment_user (environment_id, user_id),
    
    -- Indexes for better performance
    INDEX idx_environment_id (environment_id),
    INDEX idx_user_id (user_id),
    INDEX idx_assigned_by (assigned_by),
    INDEX idx_status (status),
    INDEX idx_role (role)
);

-- Add comment to table
ALTER TABLE environment_assignments COMMENT = 'Stores environment assignments to users with roles and permissions'; 