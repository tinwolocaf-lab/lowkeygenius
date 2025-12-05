# Implementation Plan

- [x] 1. Fix backend quota validation logic
  - [x] 1.1 Update quota-validation.ts to fix the blocking condition
    - Change `totalActive > limit` to `inProgressCount > 0` for active_generation blocking
    - Ensure coursesUsed only counts published + enrolled (already correct)
    - Add activeGenerationId to the response when blocking due to active_generation
    - _Requirements: 1.1, 1.2, 1.3, 3.2_
  - [ ]* 1.2 Write property test for quota calculation
    - **Property 1: Quota counts only published and enrolled courses**
    - **Validates: Requirements 1.1, 1.2**
  - [ ]* 1.3 Write property test for active generation blocking
    - **Property 2: Active generation blocks new course creation**
    - **Validates: Requirements 1.3, 3.1**

- [x] 2. Move course creation to backend
  - [x] 2.1 Update generate-outline edge function to create course record
    - Accept course data (topic, level, intensity, materials) in request
    - Create course record AFTER quota validation passes
    - Update course with generated outline
    - Return course ID and outline in response
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 2.2 Update Onboarding.tsx to use new API flow
    - Remove direct Supabase course insert
    - Pass course data to generateCourseOutline API
    - Handle new response format with course ID
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 2.3 Write property test for failed validation no records
    - **Property 3: Failed quota validation creates no records**
    - **Validates: Requirements 2.1, 2.2**
  - [ ]* 2.4 Write property test for successful validation creates course
    - **Property 4: Successful quota validation creates course**
    - **Validates: Requirements 2.3**

- [x] 3. Checkpoint - Ensure backend changes work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update frontend quota display and blocking
  - [x] 4.1 Update useSubscription hook to return activeGenerationId
    - Add activeGenerationId to the return object
    - Ensure blockingReason is correctly set
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 Update Onboarding.tsx blocking behavior
    - When blocked by active_generation, show toast with link to course
    - When blocked by limit_reached, show upgrade modal
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 4.3 Write property test for active generation details
    - **Property 5: Active generation provides course details**
    - **Validates: Requirements 3.2**
  - [ ]* 4.4 Write property test for limit reached display
    - **Property 6: Limit reached shows correct usage**
    - **Validates: Requirements 3.3**

- [x] 5. Checkpoint - Ensure frontend changes work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add PRO_MAX unlimited access
  - [x] 6.1 Verify PRO_MAX bypass in quota-validation.ts
    - Ensure PRO_MAX users skip all quota checks
    - Ensure PRO_MAX users can have multiple in-progress courses
    - _Requirements: 5.1, 5.2_
  - [ ]* 6.2 Write property test for PRO_MAX unlimited access
    - **Property 8: PRO_MAX unlimited access**
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Update API types and error handling
  - [x] 7.1 Update src/lib/api.ts generateCourseOutline function
    - Update request interface to include course creation data
    - Update response interface to include courseId
    - Handle new error response format with reason field
    - _Requirements: 2.1, 3.1_

- [x] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

