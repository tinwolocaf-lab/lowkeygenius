# Implementation Plan

- [x] 1. Add quota enforcement to Courses page
  - [x] 1.1 Update Courses.tsx to check quota before navigating to onboarding
    - Import useSubscription hook
    - Add state for showing upgrade modal
    - Modify "New Course" button onClick to check canCreateCourse
    - Show upgrade modal when quota exceeded instead of navigating
    - _Requirements: 1.1, 3.2, 3.3_
  - [ ]* 1.2 Write property test for Courses page quota enforcement
    - **Property 1: Quota-limited users see blocking UI**
    - **Validates: Requirements 1.1**

- [x] 2. Add quota enforcement to Dashboard empty state
  - [x] 2.1 Update Dashboard.tsx empty state button
    - The "Create Your First Course" button in the empty courses section should check canCreateCourse
    - Disable button or show modal when quota exceeded
    - _Requirements: 1.2, 3.2_
  - [ ]* 2.2 Write property test for Dashboard quota enforcement
    - **Property 1: Quota-limited users see blocking UI**
    - **Validates: Requirements 1.2**

- [x] 3. Add quota enforcement to Onboarding page
  - [x] 3.1 Update Onboarding.tsx to check quota on mount
    - Import useSubscription hook
    - Add useEffect to check canCreateCourse on component mount
    - Redirect to /dashboard if quota exceeded
    - Show toast notification explaining the redirect
    - _Requirements: 1.3, 3.2_
  - [ ]* 3.2 Write property test for Onboarding redirect
    - **Property 1: Quota-limited users see blocking UI**
    - **Validates: Requirements 1.3**

- [x] 4. Checkpoint - Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Add backend quota validation to generate-outline edge function
  - [x] 5.1 Create quota validation utility function
    - Create helper function to calculate user's current course count
    - Handle billing cycle plans (count from subscription_period_start)
    - Handle FREE plan (count all courses)
    - Handle PRO_MAX (always allow)
    - Return validation result with allowed status, counts, and error message
    - _Requirements: 2.1, 2.3, 2.4, 4.1_
  - [x] 5.2 Integrate quota validation into generate-outline function
    - Call quota validation before processing outline generation
    - Return 403 with appropriate error message if quota exceeded
    - Skip validation for PRO_MAX users
    - _Requirements: 2.1, 2.2, 4.1_
  - [ ]* 5.3 Write property test for backend quota validation
    - **Property 2: Backend rejects over-quota requests**
    - **Validates: Requirements 2.1, 2.2**
  - [ ]* 5.4 Write property test for billing cycle counting
    - **Property 3: Billing cycle course counting**
    - **Validates: Requirements 2.3**
  - [ ]* 5.5 Write property test for FREE plan counting
    - **Property 4: FREE plan lifetime counting**
    - **Validates: Requirements 2.4**
  - [ ]* 5.6 Write property test for PRO_MAX bypass
    - **Property 5: PRO_MAX unlimited access**
    - **Validates: Requirements 4.1**

- [x] 6. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Verify enrollment quota enforcement
  - [x] 7.1 Review and verify useEnrollment hook quota logic
    - Verify enrollments are counted in total quota
    - Verify canEnroll properly checks combined count
    - Verify EnrollmentModal shows limit reached state
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 7.2 Write property test for enrollment quota
    - **Property 6: Enrollment affects quota**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
