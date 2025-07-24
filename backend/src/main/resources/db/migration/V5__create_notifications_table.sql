CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    type VARCHAR(50),
    time VARCHAR(50),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE
); 