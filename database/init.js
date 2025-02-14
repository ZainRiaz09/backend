const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // Execute the schema
        await db.none(schema);
        console.log('Database schema initialized successfully');

        // Create initial admin user if needed
        const adminExists = await db.oneOrNone('SELECT * FROM users WHERE email = $1', ['admin@example.com']);
        
        if (!adminExists) {
            await db.none(`
                INSERT INTO users (full_name, email, password)
                VALUES ($1, $2, $3)
            `, ['Admin User', 'admin@example.com', '$2a$10$your_hashed_password']);
            console.log('Initial admin user created');
        }

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

initializeDatabase();
