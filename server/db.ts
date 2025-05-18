import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool with improved settings for better persistence
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,               // Maximum number of clients the pool should contain
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection to become available
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Create the drizzle ORM instance
export const db = drizzle(pool, { schema });

// Function to properly close the pool when needed
export const closePool = async () => {
  await pool.end();
};

// Handle app shutdown properly to close connections
process.on('SIGINT', async () => {
  console.log('Closing database pool due to app shutdown');
  await closePool();
  process.exit(0);
});

// Periodically ping the database to keep the connection alive
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection keepalive ping successful');
  } catch (err) {
    console.error('Error pinging database:', err);
  }
}, 60000); // Ping every minute
