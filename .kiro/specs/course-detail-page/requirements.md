# Requirements Document

## Introduction

This feature introduces a dedicated Course Detail Page that serves as an intermediate view between the Marketplace listing and the actual lesson content. Currently, users can enroll directly from the Marketplace course cards and are taken straight to the lesson view. This feature adds a proper course landing page that displays comprehensive course information, curriculum overview, and enrollment functionality. The page will show one lesson as a free preview for authenticated users, while other lessons require enrollment to access.

## Glossary

- **Course Detail Page**: A dedicated page displaying comprehensive information about a single course, including description, curriculum, and enrollment options
- **Curriculum**: The complete list of modules and lessons that make up a course
- **Free Preview Lesson**: The first lesson of a course that is accessible to authenticated users without enrollment
- **Enrolled User**: An authenticated user who has completed the enrollment process for a specific course
- **Course Owner**: The user who created and owns the course
- **Marketplace**: The public listing of all published courses available for enrollment

## Requirements

### Requirement 1

**User Story:** As a learner, I want to view detailed information about a course before enrolling, so that I can make an informed decision about whether the course is right for me.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to a course detail page THEN the System SHALL display the course title, description, level, topic, estimated duration, and creator information
2. WHEN the course detail page loads THEN the System SHALL display the complete curriculum showing all modules and their lessons with titles
3. WHEN the course has a thumbnail image THEN the System SHALL display the thumbnail prominently on the course detail page
4. WHEN the course detail page loads THEN the System SHALL display the enrollment count for the course

### Requirement 2

**User Story:** As a learner, I want to preview one lesson before enrolling, so that I can evaluate the course quality and teaching style.

#### Acceptance Criteria

1. WHEN an authenticated user views the curriculum on the course detail page THEN the System SHALL mark the first lesson as "Free Preview"
2. WHEN an authenticated user clicks on the free preview lesson THEN the System SHALL navigate to the lesson detail page and display the lesson content
3. WHEN an authenticated user clicks on a non-preview lesson without being enrolled THEN the System SHALL display a message indicating enrollment is required
4. WHEN an enrolled user or course owner clicks on any lesson THEN the System SHALL navigate to the lesson detail page

### Requirement 3

**User Story:** As a learner, I want to enroll in a course from the course detail page, so that I can gain access to all course content.

#### Acceptance Criteria

1. WHEN an authenticated user who is not enrolled views the course detail page THEN the System SHALL display an "Enroll" button
2. WHEN an enrolled user views the course detail page THEN the System SHALL display a "Continue Learning" button instead of "Enroll"
3. WHEN the course owner views the course detail page THEN the System SHALL display a "View Course" button
4. WHEN a user clicks the "Enroll" button THEN the System SHALL open the enrollment modal with course limit checking
5. WHEN enrollment completes successfully THEN the System SHALL update the page to show "Continue Learning" button

### Requirement 4

**User Story:** As a learner, I want to access course details from the marketplace by clicking anywhere on the course card, so that I can easily explore courses.

#### Acceptance Criteria

1. WHEN an authenticated user clicks on any part of a course card in the marketplace THEN the System SHALL navigate to the course detail page
2. WHEN navigating to the course detail page THEN the System SHALL remove the direct "Enroll" button from the marketplace course cards
3. WHEN the course detail page URL is accessed directly THEN the System SHALL load and display the course information

### Requirement 5

**User Story:** As a learner, I want to navigate from a lesson back to the course detail page, so that I can view other lessons or course information.

#### Acceptance Criteria

1. WHEN viewing a lesson from a marketplace course THEN the System SHALL provide a "Back to Course" navigation option
2. WHEN a user clicks "Back to Course" THEN the System SHALL navigate to the course detail page
3. WHEN viewing lessons THEN the System SHALL maintain the context of whether the user came from the marketplace or their own courses

### Requirement 6

**User Story:** As a learner, I want the lesson detail page to show lesson-specific content, so that I can focus on learning the material.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to a lesson detail page THEN the System SHALL display the lesson title, objectives, and markdown content
2. WHEN the lesson has audio THEN the System SHALL provide an option to listen to the audio version
3. WHEN viewing a lesson THEN the System SHALL display navigation to move between lessons within the course
4. WHEN a user completes a lesson THEN the System SHALL allow marking the lesson as complete
