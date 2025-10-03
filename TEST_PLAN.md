# OpsWriter Test Plan

## Overview
This document outlines the comprehensive testing strategy for OpsWriter, covering unit, integration, and end-to-end tests for all critical functionality.

## Test Coverage Goals
- **Unit Tests**: 80% coverage for business logic
- **Integration Tests**: All API routes and database operations
- **E2E Tests**: Critical user workflows
- **Performance Tests**: Dashboard load times, PDF generation
- **Security Tests**: Authentication, authorization, RLS policies
- **Accessibility Tests**: WCAG 2.1 AA compliance

## 1. Unit Tests

### Authentication Components
- [ ] Login form validation
- [ ] Password policy enforcement
- [ ] Session timeout handling
- [ ] Domain restriction (@heliairsweden.com)
- [ ] Role-based access control

### Manual Management
- [ ] Manual creation validation
- [ ] Chapter numbering logic
- [ ] Auto-renumbering on structure changes
- [ ] Revision number calculation
- [ ] Draft vs approved status logic

### Editor Components
- [ ] Rich text editor formatting
- [ ] Autosave functionality
- [ ] Content validation
- [ ] Reference linking
- [ ] Table operations

### Revision System
- [ ] Field-level change tracking
- [ ] Diff generation
- [ ] Rollback logic
- [ ] History filtering
- [ ] Audit trail generation

## 2. Integration Tests

### Database Operations
- [ ] Manual CRUD operations
- [ ] Chapter hierarchy management
- [ ] Revision history persistence
- [ ] RLS policy enforcement
- [ ] Transaction rollback scenarios

### API Routes
- [ ] Authentication endpoints
- [ ] Manual management APIs
- [ ] PDF generation endpoint
- [ ] Export job queuing
- [ ] Notification triggers

### Supabase Integration
- [ ] Auth flow with Supabase
- [ ] Storage bucket operations
- [ ] Realtime subscriptions
- [ ] Edge function invocations
- [ ] Database migrations

## 3. End-to-End Tests

### Critical User Flows

#### Manual Creation Flow
1. Login as Manager
2. Create new manual with metadata
3. Add chapters and content
4. Save and verify autosave
5. Verify Chapter 0 requirement

#### Review Workflow
1. Create draft revision
2. Send manual for review
3. Verify edit lock during review
4. Approve/reject with comments
5. Verify revision increment

#### PDF Export Flow
1. Select manual for export
2. Choose export variant (draft/approved)
3. Verify watermark on drafts
4. Check PDF structure (TOC, headers, footers)
5. Verify 30-day retention

#### User Management (SysAdmin)
1. Login as SysAdmin
2. Invite new user with role
3. Deactivate user
4. Verify role permissions
5. Check audit trail

#### Reference Management
1. Add definitions/abbreviations
2. Link to manual
3. Verify in exports
4. Search and filter references
5. Update and track changes

## 4. Performance Tests

### Load Time Requirements
- Dashboard with 500 manuals: < 2 seconds
- Manual editor load: < 1 second
- Autosave operation: < 300ms p95
- PDF generation (50 pages): < 10 seconds
- Search results: < 500ms

### Stress Testing
- [ ] Concurrent user editing (10 users)
- [ ] Large manual handling (500+ chapters)
- [ ] Bulk export generation (20 simultaneous)
- [ ] Search with 10,000+ documents
- [ ] Revision history with 1000+ changes

## 5. Security Tests

### Authentication Security
- [ ] Brute force protection
- [ ] Session hijacking prevention
- [ ] CSRF token validation
- [ ] XSS prevention
- [ ] SQL injection protection

### Authorization Tests
- [ ] Role-based access enforcement
- [ ] RLS policy validation
- [ ] API route protection
- [ ] Storage bucket access control
- [ ] Admin-only function protection

### Data Security
- [ ] Encryption at rest verification
- [ ] HTTPS enforcement
- [ ] Secure cookie handling
- [ ] Sensitive data masking
- [ ] Audit log immutability

## 6. Accessibility Tests (WCAG 2.1 AA)

### Keyboard Navigation
- [ ] All interactive elements accessible
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] Skip links functional
- [ ] Escape key handling

### Screen Reader Support
- [ ] Semantic HTML structure
- [ ] ARIA labels present
- [ ] Form field descriptions
- [ ] Error message announcements
- [ ] Status change notifications

### Visual Accessibility
- [ ] Color contrast ratios (4.5:1 minimum)
- [ ] Text resizing support (200%)
- [ ] No color-only information
- [ ] Focus indicators high contrast
- [ ] Animation pause controls

## 7. Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest 2 versions)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Samsung Internet

## 8. Test Data Requirements

### Sample Manuals
- Small manual (5 chapters)
- Medium manual (50 chapters)
- Large manual (200+ chapters)
- Multi-level hierarchy (4 levels deep)
- Various content types (tables, images, lists)

### User Accounts
- SysAdmin account
- Manager accounts (5)
- Deactivated account
- Domain-restricted accounts

### Revision Scenarios
- Clean manual (no revisions)
- Heavy revision history (100+ changes)
- Rejected revision scenarios
- Concurrent edit scenarios

## 9. Test Automation

### CI/CD Pipeline
```yaml
- Unit tests on every commit
- Integration tests on PR
- E2E tests before deployment
- Performance tests weekly
- Security scans monthly
```

### Test Execution Commands
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage

# Accessibility audit
npm run test:a11y
```

## 10. Test Reporting

### Metrics to Track
- Test coverage percentage
- Test execution time
- Failure rate by category
- Flaky test identification
- Performance regression detection

### Reports
- Daily: Unit test results
- Per PR: Integration test results
- Pre-deploy: E2E test results
- Weekly: Performance metrics
- Monthly: Security audit

## 11. UAT Scenarios

### Scenario 1: Complete Manual Lifecycle
1. Create manual from scratch
2. Build complex structure
3. Add rich content
4. Submit for review
5. Handle rejection
6. Resubmit and approve
7. Export final PDF

### Scenario 2: Collaborative Editing
1. Multiple users edit different chapters
2. Resolve concurrent edits
3. Track all changes
4. Review combined changes
5. Approve as authority

### Scenario 3: Migration from Legacy System
1. Import existing manual structure
2. Verify content preservation
3. Update and modernize
4. Maintain revision history
5. Generate comparison report

## 12. Rollback Procedures

### Failed Deployment Recovery
1. Identify failing component
2. Rollback to previous version
3. Restore database state
4. Verify system integrity
5. Document incident

### Data Corruption Recovery
1. Identify corrupted data
2. Restore from backup
3. Replay audit trail
4. Verify data consistency
5. Notify affected users

## Test Schedule

### Phase 1: Foundation (Week 1-2)
- Setup test infrastructure
- Create test data generators
- Write unit tests for core logic

### Phase 2: Integration (Week 3-4)
- Database operation tests
- API endpoint tests
- Third-party integration tests

### Phase 3: E2E & Performance (Week 5-6)
- Critical flow automation
- Performance benchmarking
- Load testing

### Phase 4: Security & Accessibility (Week 7-8)
- Security vulnerability scanning
- WCAG compliance audit
- Penetration testing

### Phase 5: UAT & Polish (Week 9-10)
- User acceptance testing
- Bug fixes and refinements
- Documentation updates