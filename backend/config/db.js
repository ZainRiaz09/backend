const pgPromise = require('pg-promise');
const dotenv = require('dotenv');

dotenv.config();

// Enhanced error handling
const initOptions = {
    error: (error, e) => {
        if (e.cn) {
            console.error('❌ Connection Error:', error.message);
        }
        if (e.query) {
            console.error('⚠️ Query Error:', error.message);
            console.error('Query:', e.query);
            console.error('Parameters:', e.params);
        }
    },
    connect: (client, dc, useCount) => {
        const cp = client.connectionParameters || {};
        console.log('✅ Connected to database:', cp.database || 'Unknown Database');
    }
};

const pgp = pgPromise(initOptions);

// Default connection configuration (with SSL enabled)
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Ensure SSL is properly handled
    max: 30, // Maximum connections in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
};

// Create a persistent database connection (do not close it manually)
const db = pgp(connectionConfig);

// Test database connection
async function testConnection() {
    try {
        const result = await db.one('SELECT NOW()');
        console.log('✅ Database connection successful:', result.now);
    } catch (error) {
        console.error('❌ Initial Database connection failed:', error.message);

        // If SSL is the issue, retry without SSL
        if (error.message.includes("The server does not support SSL connections")) {
            console.log('🔄 Retrying connection without SSL...');
            connectionConfig.ssl = false; // Disable SSL
            const dbRetry = pgp(connectionConfig);

            try {
                const retryResult = await dbRetry.one('SELECT NOW()');
                console.log('✅ Database connection successful (Without SSL):', retryResult.now);
                module.exports = dbRetry; // Use the new connection
                return;
            } catch (retryError) {
                console.error('❌ Database connection failed again:', retryError.message);
                process.exit(1);
            }
        }

        process.exit(1);
    }
}

// Run connection test (remove process.exit to keep it running)
testConnection();

module.exports = db;
