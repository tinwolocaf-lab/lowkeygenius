# Requirements Document

## Introduction

This feature addresses the inconsistent enforcement of course generation quotas across the Lowkeygenius platform. Currently, users can bypass their plan limits by accessing course creation through various UI paths that don't properly check quota limits. The system needs consistent quota enforcement on both frontend (UI prevention) and backend (server-side validation) to ensure users cannot exceed their plan limits.

## Glossary

- **Course_Quota_System**: The system that tracks and enforces the number of courses a user can create or enroll in based on their subscription plan
- **Plan_Limit**: The maximum number of courses allowed per plan (FREE: 1 lifetime, PLUS: 5/cycle, PRO: 20/cycle, PRO_MAX: unlimited)
- **Courses_Used**: The sum of courses created by the user plus courses enrolled from the marketplace
- **Billing_Cycle**: The subscription period for paid plans during which course limits reset
- **Frontend_Enforcement**: UI-level prevention that disables or hides course creation buttons when quota is reached
- **Backend_Enforcement**: Server-side validation that rejects course creation requests when quota is exceeded

## Requirements

### Requirement 1

**User Story:** As a platform administrator, I want the course creation quota to be enforced consistently across all UI entry points, so that users cannot bypass their plan limits.

#### Acceptance Criteria

1. WHEN a user with reached quota clicks the "New Course" button on the Courses page THEN the Course_Quota_System SHALL display an upgrade modal instead of navigating to onboarding
2. WHEN a user with reached quota views the Dashboard page THEN the Course_Quota_System SHALL disable the "Create Your First Course" button in the empty state section
3. WHEN a user with reached quota accesses the Onboarding page directly via URL THEN the Course_Quota_System SHALL redirect the user to the Dashboard with a quota exceeded notification
4. WHEN a user's quota status changes during a session THEN the Course_Quota_System SHALL update all visible course creation buttons within 5 seconds

### Requirement 2

**User Story:** As a platform administrator, I want server-side validation of course quotas, so that malicious users cannot bypass frontend restrictions.

#### Acceptance Criteria

1. WHEN the generate-outline edge function receives a request THEN the Course_Quota_System SHALL verify the user's current course count against their plan limit before processing
2. IF a user exceeds their plan limit THEN the generate-outline function SHALL return a 403 status with error message "Course limit reached. Please upgrade your plan."
3. WHEN calculating course count for billing cycle plans THEN the Course_Quota_System SHALL only count courses created since the subscription_period_start date
4. WHEN calculating course count for FREE plan users THEN the Course_Quota_System SHALL count all courses created regardless of date

### Requirement 3

**User Story:** As a user, I want clear feedback when I've reached my course limit, so that I understand why I cannot create more courses.

#### Acceptance Criteria

1. WHEN a user reaches their course limit THEN the Course_Quota_System SHALL display a visual indicator on the Dashboard showing "Limit reached"
2. WHEN a user attempts to create a course after reaching their limit THEN the Course_Quota_System SHALL display a modal explaining the limit and offering an upgrade path
3. WHEN displaying the upgrade modal THEN the Course_Quota_System SHALL show the current usage (e.g., "1/1 courses used") and plan type

### Requirement 4

**User Story:** As a PRO_MAX subscriber, I want unlimited course creation, so that I can create as many courses as I need without restrictions.

#### Acceptance Criteria

1. WHEN a PRO_MAX user attempts to create a course THEN the Course_Quota_System SHALL allow the creation without quota checks
2. WHEN a PRO_MAX user views the Dashboard THEN the Course_Quota_System SHALL display "∞" as the course limit

### Requirement 5

**User Story:** As a user, I want the enrollment quota to be properly enforced, so that marketplace enrollments correctly count against my course limit.

#### Acceptance Criteria

1. WHEN a user enrolls in a marketplace course THEN the Course_Quota_System SHALL increment their courses_used count
2. WHEN checking if a user can create a new course THEN the Course_Quota_System SHALL include enrolled courses in the total count
3. WHEN a user with reached quota attempts to enroll in a marketplace course THEN the Course_Quota_System SHALL display the limit reached modal with upgrade option
