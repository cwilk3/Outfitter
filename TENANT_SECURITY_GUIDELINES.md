# Tenant Security Guidelines

## Overview
This document outlines security patterns and development guidelines for maintaining bulletproof multi-tenant isolation in the Outfitter platform.

## Security Architecture

### 4-Layer Security Model
1. **Tenant-Scoped Storage** - All data operations include outfitterId validation
2. **Middleware Validation** - Automatic tenant context enforcement
3. **Advanced Security Patterns** - Rate limiting, query sanitization, response filtering
4. **Comprehensive Validation** - Final security validation and breach detection

## Development Patterns

### ✅ SECURE PATTERNS

#### Storage Methods
```typescript
// CORRECT: Always include outfitterId parameter
async getCustomer(customerId: number, outfitterId: number): Promise<Customer | undefined> {
  const [customer] = await this.db.select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.outfitterId, outfitterId)));
  return customer;
}
```

#### Route Handlers
```typescript
// CORRECT: Use complete security middleware stack
router.use(
  requireAuth, 
  addOutfitterContext, 
  withTenantValidation(), 
  enforceTenantIsolation('customers'), 
  ...enableTenantSecurity(), 
  ...enableComprehensiveTenantSecurity()
);
```

#### Database Queries
```typescript
// CORRECT: Always filter by outfitterId
const bookings = await db.select()
  .from(bookings)
  .where(eq(bookings.outfitterId, tenantContext.outfitterId));
```

### ❌ ANTI-PATTERNS

#### Direct ID Lookups
```typescript
// WRONG: Missing tenant validation
async getCustomer(customerId: number): Promise<Customer | undefined> {
  return await this.db.select().from(customers).where(eq(customers.id, customerId));
}
```

#### Manual Authentication
```typescript
// WRONG: Manual auth checks bypass security layers
if (!req.user) {
  return res.status(401).json({ message: 'Unauthorized' });
}
```

#### Cross-Tenant Queries
```typescript
// WRONG: No outfitterId filtering
const allBookings = await db.select().from(bookings);
```

## Security Validation Checklist

### Pre-Deployment Checklist
- [ ] All storage methods include outfitterId parameter
- [ ] All routes use complete security middleware stack
- [ ] No direct database queries without tenant filtering
- [ ] All new endpoints tested for cross-tenant access
- [ ] Security logs reviewed for breach attempts

### Code Review Requirements
- [ ] Tenant context validation in all data operations
- [ ] Proper error handling for unauthorized access
- [ ] No hardcoded outfitter IDs or assumptions
- [ ] Rate limiting considerations for new endpoints
- [ ] Documentation updated for new security patterns

## Monitoring & Alerts

### Security Event Types
- `🚨 [SECURITY-BREACH]` - Attempted cross-tenant data access
- `✅ [TENANT-VALIDATION]` - Successful tenant context establishment
- `✅ [TENANT-ENFORCE]` - Tenant isolation enforcement
- `🔍 [QUERY-INTERCEPT]` - Database query monitoring

### Response Procedures
1. **Security Breach Detection**: Immediate investigation required
2. **Failed Tenant Validation**: Review request source and authentication
3. **Unusual Query Patterns**: Analyze for potential security bypass attempts

## Development Workflow

### Adding New Features
1. Design with tenant isolation from start
2. Implement storage methods with outfitterId parameters
3. Add complete security middleware stack to routes
4. Test for cross-tenant access prevention
5. Update documentation and security guidelines

### Modifying Existing Features
1. Review existing tenant isolation implementation
2. Ensure changes maintain security boundaries
3. Test edge cases for security bypass potential
4. Validate logs show proper tenant enforcement

## Emergency Protocols

### Security Incident Response
1. Immediately disable affected endpoints if breach confirmed
2. Review security logs for scope of potential data exposure
3. Implement additional validation layers
4. Notify stakeholders of incident and remediation steps

### Development Emergencies
1. Never bypass security middleware for "temporary" fixes
2. Always implement proper tenant validation, even under time pressure
3. Escalate to security team if unable to maintain isolation requirements
4. Document any emergency changes for post-incident review

This document serves as the authoritative guide for maintaining enterprise-grade multi-tenant security in all development activities.