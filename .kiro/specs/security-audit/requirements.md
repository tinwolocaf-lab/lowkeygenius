# Requirements Document

## Introduction

This document specifies the security requirements for hardening the Lowkeygenius AI-powered course generation platform before public deployment and open-sourcing. The audit covers authentication, authorization, input validation, API security, database security, and protection against common web vulnerabilities. The goal is to ensure the application is secure when the source code is publicly visible and the application is deployed online.

## Glossary

- **Edge_Function**: A Supabase serverless function running on Deno runtime that handles backend API requests
- **RLS**: Row Level Security - PostgreSQL feature that restricts which rows users can access
- **CORS**: Cross-Origin Resource Sharing - HTTP headers controlling cross-origin requests
- **PII**: Personally Identifiable Information - data that can identify an individual
- **Service_Role_Key**: A privileged Supabase key that bypasses RLS policies
- **Anon_Key**: A public Supabase key with limited permissions, subject to RLS
- **JWT**: JSON Web Token - used for authentication
- **XSS**: Cross-Site Scripting - injection of malicious scripts
- **CSRF**: Cross-Site Request Forgery - unauthorized commands from trusted users
- **Rate_Limiting**: Restricting the number of requests a user can make in a time period
- **Input_Validation**: Verifying user input meets expected format and constraints

## Requirements

### Requirement 1: Edge Function Authentication Hardening

**User Story:** As a security engineer, I want all Edge Functions to properly validate authentication tokens, so that unauthorized users cannot access protected endpoints.

#### Acceptance Criteria

1. WHEN an Edge_Function receives a request without an Authorization header THEN the Edge_Function SHALL return a 401 status code with a JSON error response
2. WHEN an Edge_Function receives a request with an invalid JWT token THEN the Edge_Function SHALL return a 401 status code and not process the request
3. WHEN an Edge_Function validates a user token THEN the Edge_Function SHALL use supabase.auth.getUser() to verify the token server-side
4. WHEN an Edge_Function requires resource ownership verification THEN the Edge_Function SHALL query the database to confirm the authenticated user owns the resource before proceeding

### Requirement 2: CORS Configuration Security

**User Story:** As a security engineer, I want CORS headers to be properly configured, so that only authorized origins can make requests to the API.

#### Acceptance Criteria

1. WHEN the application is deployed to production THEN the Edge_Functions SHALL restrict Access-Control-Allow-Origin to specific allowed domains instead of wildcard '*'
2. WHEN an Edge_Function handles a preflight OPTIONS request THEN the Edge_Function SHALL return appropriate CORS headers without processing business logic
3. WHEN configuring CORS headers THEN the Edge_Functions SHALL specify only the HTTP methods actually needed for each endpoint

### Requirement 3: Input Validation and Sanitization

**User Story:** As a security engineer, I want all user inputs to be validated and sanitized, so that malicious data cannot compromise the system.

#### Acceptance Criteria

1. WHEN an Edge_Function receives JSON input THEN the Edge_Function SHALL validate that required fields are present and of the correct type
2. WHEN an Edge_Function receives string input THEN the Edge_Function SHALL enforce maximum length limits to prevent denial of service
3. WHEN an Edge_Function receives input that will be used in database queries THEN the Edge_Function SHALL use parameterized queries to prevent SQL injection
4. WHEN an Edge_Function receives input for AI prompts THEN the Edge_Function SHALL sanitize the input to prevent prompt injection attacks
5. WHEN user input contains potential XSS payloads THEN the system SHALL sanitize or escape the content before storage and display

### Requirement 4: Rate Limiting Implementation

**User Story:** As a security engineer, I want rate limiting on all API endpoints, so that the system is protected from abuse and denial of service attacks.

#### Acceptance Criteria

1. WHEN a user exceeds the rate limit for an endpoint THEN the Edge_Function SHALL return a 429 status code with a Retry-After header
2. WHEN implementing rate limiting THEN the system SHALL track requests per user ID for authenticated endpoints
3. WHEN implementing rate limiting for AI generation endpoints THEN the system SHALL apply stricter limits due to higher resource costs
4. WHEN rate limiting is triggered THEN the system SHALL log the event for security monitoring

### Requirement 5: Database Security Policies

**User Story:** As a security engineer, I want comprehensive RLS policies on all database tables, so that users can only access data they are authorized to see.

#### Acceptance Criteria

1. WHEN a user queries the database THEN the RLS policies SHALL ensure users can only read their own data unless explicitly shared
2. WHEN a user attempts to modify data THEN the RLS policies SHALL verify ownership before allowing the operation
3. WHEN public courses are accessed THEN the RLS policies SHALL allow read access only to published courses with is_public=true
4. WHEN admin operations are performed THEN the RLS policies SHALL verify the user has is_admin=true in their profile
5. WHEN service role operations are performed THEN the Edge_Functions SHALL use service role key only for operations that require bypassing RLS

### Requirement 6: Webhook Security

**User Story:** As a security engineer, I want webhook endpoints to validate incoming requests, so that only legitimate webhook providers can trigger actions.

#### Acceptance Criteria

1. WHEN the polar-webhook endpoint receives a request THEN the Edge_Function SHALL validate the webhook signature before processing
2. WHEN webhook signature validation fails THEN the Edge_Function SHALL return a 401 status code and log the attempt
3. WHEN processing webhook events THEN the Edge_Function SHALL implement idempotency to prevent duplicate processing
4. WHEN webhook secrets are not configured THEN the Edge_Function SHALL log a warning and operate in a degraded security mode

### Requirement 7: Sensitive Data Protection

**User Story:** As a security engineer, I want sensitive data to be properly protected, so that user privacy is maintained and data breaches are prevented.

#### Acceptance Criteria

1. WHEN storing user profile data THEN the system SHALL anonymize PII before storage using the established anonymization patterns
2. WHEN returning error responses THEN the Edge_Functions SHALL not expose internal error details or stack traces to clients
3. WHEN logging errors THEN the system SHALL sanitize logs to remove sensitive user data
4. WHEN API keys are used THEN the Edge_Functions SHALL access them only through environment variables, never hardcoded

### Requirement 8: Authorization Enforcement

**User Story:** As a security engineer, I want proper authorization checks on all operations, so that users cannot perform actions beyond their permissions.

#### Acceptance Criteria

1. WHEN a user attempts to access a course THEN the system SHALL verify the user is either the owner or enrolled in the course
2. WHEN a user attempts to modify a lesson THEN the system SHALL verify the user owns the parent course
3. WHEN a user attempts to generate content THEN the system SHALL verify the user has not exceeded their plan quota
4. WHEN a user attempts admin operations THEN the system SHALL verify the user has admin privileges
5. WHEN a user attempts to access premium features THEN the system SHALL verify the user has the required subscription tier

### Requirement 9: Security Headers

**User Story:** As a security engineer, I want proper security headers on all responses, so that common web vulnerabilities are mitigated.

#### Acceptance Criteria

1. WHEN the frontend application is served THEN the server SHALL include Content-Security-Policy headers to prevent XSS
2. WHEN the frontend application is served THEN the server SHALL include X-Content-Type-Options: nosniff header
3. WHEN the frontend application is served THEN the server SHALL include X-Frame-Options header to prevent clickjacking
4. WHEN API responses are returned THEN the Edge_Functions SHALL include appropriate Content-Type headers

### Requirement 10: Audit Logging

**User Story:** As a security engineer, I want security-relevant events to be logged, so that security incidents can be detected and investigated.

#### Acceptance Criteria

1. WHEN authentication fails THEN the system SHALL log the attempt with timestamp and relevant context
2. WHEN authorization is denied THEN the system SHALL log the attempt with user ID and requested resource
3. WHEN rate limiting is triggered THEN the system SHALL log the event with user ID and endpoint
4. WHEN webhook validation fails THEN the system SHALL log the attempt with source IP and payload hash
