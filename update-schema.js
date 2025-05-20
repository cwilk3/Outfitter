// Update schema script - ES Module version
import { execSync } from 'child_process';

console.log('Running Drizzle DB push to update the database schema...');

try {
  // Run the drizzle-kit push command to update the database
  execSync('npm run db:push', { stdio: 'inherit' });
  
  console.log('Schema update completed successfully!');
} catch (error) {
  console.error('Error updating schema:', error);
  process.exit(1);
}