// tenantAudit.cjs
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'server');
const SERVER_FILES = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

console.log(`🔎 Scanning ${SERVER_FILES.length} server files for outfitterId safety...\n`);

// Also check if there's a routes subdirectory
let routeFiles = [];
const routesSubDir = path.join(ROUTES_DIR, 'routes');
if (fs.existsSync(routesSubDir)) {
  routeFiles = fs.readdirSync(routesSubDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));
  console.log(`🔎 Additionally scanning ${routeFiles.length} route files in routes/ subdirectory...\n`);
}

const allFiles = [
  ...SERVER_FILES.map(f => ({ file: f, dir: ROUTES_DIR })),
  ...routeFiles.map(f => ({ file: f, dir: routesSubDir }))
];

allFiles.forEach(({ file, dir }) => {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Look for database queries using both db. and any other patterns
  const suspicious = content.match(/(db|storage|prisma)\.(\w+)\.(find|update|delete|create|upsert|select|insert)[^(]*/g);

  if (suspicious) {
    console.log(`📁 ${file} — Found ${suspicious.length} potential queries:`);
    suspicious.forEach((q) => {
      if (!q.includes('outfitterId') && !q.includes('outfitter_id')) {
        console.log(`  ⚠️  ${q.trim()} ← POSSIBLY UNPROTECTED`);
      } else {
        console.log(`  ✅ ${q.trim()}`);
      }
    });
    console.log('');
  }

  // Also look for any SQL queries
  const sqlQueries = content.match(/SELECT|INSERT|UPDATE|DELETE[\s\S]*?FROM|INTO|SET|WHERE/gi);
  if (sqlQueries) {
    console.log(`📁 ${file} — Found ${sqlQueries.length} SQL queries:`);
    sqlQueries.forEach((q) => {
      if (!q.includes('outfitterId') && !q.includes('outfitter_id')) {
        console.log(`  ⚠️  ${q.trim().substring(0, 100)}... ← POSSIBLY UNPROTECTED SQL`);
      } else {
        console.log(`  ✅ ${q.trim().substring(0, 100)}...`);
      }
    });
    console.log('');
  }
});

console.log('🎯 AUDIT COMPLETE - Review output above for potential tenant isolation vulnerabilities');