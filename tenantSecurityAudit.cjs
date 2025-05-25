// tenantSecurityAudit.cjs - Comprehensive Tenant Isolation Security Audit
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, 'server/routes');
const ROUTE_FILES = [
  'auth.ts', 'bookings.ts', 'customers.ts', 'dashboard.ts', 
  'experiences.ts', 'guides.ts', 'locations.ts', 'public.ts'
];

console.log('🔍 SECURITY SWEEP: FULL ROUTE TENANT ISOLATION AUDIT');
console.log('═══════════════════════════════════════════════════\n');

const vulnerabilities = [];
let totalQueries = 0;
let protectedQueries = 0;
let unprotectedQueries = 0;

ROUTE_FILES.forEach((file) => {
  const filePath = path.join(ROUTES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`\n📁 AUDITING: ${file}`);
  console.log('─'.repeat(50));

  // Look for SQL queries and database operations
  const sqlPatterns = [
    /(db|storage)\.(\w+)\.(find|select|create|insert|update|delete|upsert)/gi,
    /SELECT[\s\S]*?FROM/gi,
    /INSERT[\s\S]*?INTO/gi,
    /UPDATE[\s\S]*?SET/gi,
    /DELETE[\s\S]*?FROM/gi
  ];

  let fileVulnerabilities = [];
  let fileQueries = 0;
  let fileProtected = 0;
  let fileUnprotected = 0;

  sqlPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const query = match[0];
      const lineNum = content.substring(0, match.index).split('\n').length;
      
      fileQueries++;
      totalQueries++;

      // Check for tenant isolation
      const hasTenantFilter = query.includes('outfitterId') || 
                             query.includes('outfitter_id') ||
                             query.includes('req.user.outfitterId') ||
                             query.includes('user.outfitterId');

      if (hasTenantFilter) {
        fileProtected++;
        protectedQueries++;
        console.log(`  ✅ Line ${lineNum}: ${query.substring(0, 60)}...`);
      } else {
        fileUnprotected++;
        unprotectedQueries++;
        console.log(`  🚨 Line ${lineNum}: ${query.substring(0, 60)}... ← UNPROTECTED`);
        
        fileVulnerabilities.push({
          file,
          line: lineNum,
          query: query.trim(),
          type: determineOperationType(query),
          risk: determineRiskLevel(query, file)
        });
      }
    }
  });

  // Check for authentication middleware
  const hasAuth = content.includes('requireAuth') || 
                  content.includes('adminOnly') || 
                  content.includes('guideOrAdmin') ||
                  content.includes('asyncHandler');

  console.log(`\n  📊 ${file} Summary:`);
  console.log(`     Total Queries: ${fileQueries}`);
  console.log(`     Protected: ${fileProtected}`);
  console.log(`     Unprotected: ${fileUnprotected}`);
  console.log(`     Auth Middleware: ${hasAuth ? '✅ Present' : '🚨 Missing'}`);

  if (!hasAuth) {
    fileVulnerabilities.push({
      file,
      line: 'Global',
      query: 'Missing authentication middleware',
      type: 'Authentication',
      risk: 'CRITICAL'
    });
  }

  vulnerabilities.push(...fileVulnerabilities);
});

console.log('\n\n🚨 SECURITY AUDIT RESULTS');
console.log('═══════════════════════════════════════════════════');
console.log(`📊 Total Queries Scanned: ${totalQueries}`);
console.log(`✅ Protected Queries: ${protectedQueries}`);
console.log(`🚨 Unprotected Queries: ${unprotectedQueries}`);
console.log(`⚠️  Vulnerabilities Found: ${vulnerabilities.length}`);

if (vulnerabilities.length > 0) {
  console.log('\n🔥 CRITICAL VULNERABILITIES DETECTED:');
  console.log('═══════════════════════════════════════════════════');
  
  vulnerabilities.forEach((vuln, index) => {
    console.log(`\n${index + 1}. ${vuln.file}:${vuln.line} [${vuln.risk} RISK]`);
    console.log(`   Type: ${vuln.type}`);
    console.log(`   Query: ${vuln.query.substring(0, 100)}...`);
    console.log(`   Fix: ${suggestFix(vuln)}`);
  });

  // Emergency Protocol Assessment
  const criticalVulns = vulnerabilities.filter(v => v.risk === 'CRITICAL');
  const highRiskVulns = vulnerabilities.filter(v => v.risk === 'HIGH');
  
  if (criticalVulns.length > 0 || highRiskVulns.length > 5) {
    console.log('\n🚨 EMERGENCY PROTOCOL TRIGGERED!');
    console.log('═══════════════════════════════════════════════════');
    console.log('⚠️  Critical unprotected queries detected in high-risk routes');
    console.log('⚠️  Immediate action required to prevent tenant data leakage');
    console.log('⚠️  Consider disabling affected routes until fixes implemented');
  }
} else {
  console.log('\n✅ SECURITY AUDIT PASSED');
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 All active routes enforce proper tenant isolation!');
}

function determineOperationType(query) {
  if (query.match(/SELECT|find/i)) return 'READ';
  if (query.match(/INSERT|create/i)) return 'CREATE';
  if (query.match(/UPDATE|update/i)) return 'UPDATE';
  if (query.match(/DELETE|delete/i)) return 'DELETE';
  return 'UNKNOWN';
}

function determineRiskLevel(query, file) {
  // Public routes are expected to not have tenant filtering
  if (file === 'public.ts') return 'LOW';
  
  // Auth routes may not need tenant filtering
  if (file === 'auth.ts') return 'MEDIUM';
  
  // Write operations are high risk
  if (query.match(/INSERT|UPDATE|DELETE|create|update|delete/i)) return 'CRITICAL';
  
  // Read operations are medium risk
  if (query.match(/SELECT|find/i)) return 'HIGH';
  
  return 'MEDIUM';
}

function suggestFix(vuln) {
  switch (vuln.type) {
    case 'CREATE':
      return 'Add outfitterId: req.user.outfitterId to insert data';
    case 'READ':
      return 'Add WHERE outfitter_id = req.user.outfitterId filter';
    case 'UPDATE':
    case 'DELETE':
      return 'Add WHERE outfitter_id = req.user.outfitterId condition';
    case 'Authentication':
      return 'Add requireAuth, adminOnly, or guideOrAdmin middleware';
    default:
      return 'Review and add appropriate tenant isolation';
  }
}

console.log('\n🎯 AUDIT COMPLETE - Review vulnerabilities above for immediate action');