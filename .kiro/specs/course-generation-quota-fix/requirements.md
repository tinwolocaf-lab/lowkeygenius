# Requirements Document

## Introduction

This feature addresses a critical bug in the course generation flow where the quota check happens AFTER a course is created in the database, leading to orphaned draft courses and incorrect quota calculations. The system needs to validate quotas BEFORE creating any database records and properly handle the course generation lifecycle to ensure users can utilize their full quota.

## Glossary

- **Course_Generation_System**: The system that handles the creation and generation of courses from topic input to published state
- **Quota_Validation**: The process of checking if a user can create a new course based on their plan limits
- **Draft_Course**: A course in 'draft_outline' status that has been created but not yet had its outline generated
- **In_Progress_Course**: A course that is not yet published (status: draft_outline, generating_lessons, or ready)
- **Published_Course**: A course with status 'published' that counts against the user's quota
- **Enrolled_Course**: A course from the marketplace that the user has enrolled in, counting against their quota
- **Active_Generation_Slot**: The single slot a user has to work on one course at a time before publishing

## Requirements

### Requirement 1

**User Story:** As a free user, I want my course limit to only count published and enrolled courses, so that I can freely experiment with course generation without consuming my quota.

#### Acceptance Criteria

1. WHEN calculating a user's course usage THEN the Course_Generation_System SHALL count only courses with status 'published' plus enrolled courses
2. WHEN a user has an in-progress course (draft_outline, generating_lessons, or ready) THEN the Course_Generation_System SHALL allow the user to continue working on that course without counting it against their limit
3. WHEN a user attempts to start a NEW course while having an existing in-progress course THEN the Course_Generation_System SHALL block the action and display a message to continue the existing course

### Requirement 2

**User Story:** As a user, I want the quota check to happen before any database records are created, so that failed generations don't leave orphaned courses.

#### Acceptance Criteria

1. WHEN a user initiates course generation THEN the Course_Generation_System SHALL validate the quota BEFORE creating any course record in the database
2. IF the quota validation fails THEN the Course_Generation_System SHALL return an error without creating any database records
3. WHEN the quota validation succeeds THEN the Course_Generation_System SHALL proceed with course creation and outline generation

### Requirement 3

**User Story:** As a user, I want clear feedback about my course generation status, so that I understand why I cannot start a new course.

#### Acceptance Criteria

1. WHEN a user has an in-progress course and attempts to create a new one THEN the Course_Generation_System SHALL display a message indicating they must complete or delete the existing course first
2. WHEN displaying the blocking message THEN the Course_Generation_System SHALL provide a link to navigate to the in-progress course
3. WHEN a user reaches their published course limit THEN the Course_Generation_System SHALL display the upgrade modal with current usage statistics

### Requirement 4

**User Story:** As a user, I want to be able to delete an in-progress course to free up my generation slot, so that I can start fresh if needed.

#### Acceptance Criteria

1. WHEN a user views an in-progress course THEN the Course_Generation_System SHALL display a delete option
2. WHEN a user deletes an in-progress course THEN the Course_Generation_System SHALL remove the course and all associated data
3. WHEN an in-progress course is deleted THEN the Course_Generation_System SHALL allow the user to start a new course generation

### Requirement 5

**User Story:** As a PRO_MAX subscriber, I want unlimited course generation without any blocking, so that I can work on multiple courses simultaneously.

#### Acceptance Criteria

1. WHEN a PRO_MAX user attempts to create a course THEN the Course_Generation_System SHALL allow the creation without quota checks
2. WHEN a PRO_MAX user has multiple in-progress courses THEN the Course_Generation_System SHALL allow starting additional courses

