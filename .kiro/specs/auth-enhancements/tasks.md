# Implementation Plan

- [x] 1. Enhance AuthContext with Google OAuth support
  - [x] 1.1 Add `signInWithGoogle` method to AuthContext
    - Implement OAuth flow using `supabase.auth.signInWithOAuth` with provider 'google'
    - Use callback URL: `https://jvaeqmmlvfcqtupylibk.supabase.co/auth/v1/callback`
    - Handle auth state changes for OAuth events
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 1.2 Write property test for OAuth flow initiation
    - **Property 2: OAuth flow initiation with correct parameters**
    - **Validates: Requirements 2.1, 2.2**

- [x] 2. Update VerifyEmailSuccess page for registration success
  - [x] 2.1 Update success message to show "Registration successful"
    - Change heading and message text to indicate successful registration
    - Maintain existing auto-redirect to dashboard functionality
    - _Requirements: 1.1, 1.4_
  - [ ]* 2.2 Write property test for session establishment after verification
    - **Property 1: Session establishment after email verification**
    - **Validates: Requirements 1.2**

- [x] 3. Enhance AuthCallback to handle OAuth and show success
  - [x] 3.1 Update AuthCallback to detect OAuth vs email verification
    - Check for OAuth provider in callback parameters
    - Detect if this is a new registration or returning user
    - Detect if account linking occurred (multiple identities)
    - _Requirements: 1.2, 2.4, 3.1_
  - [x] 3.2 Add automatic login after successful email verification
    - Ensure session is established via `exchangeCodeForSession`
    - Redirect to success page which then redirects to dashboard
    - _Requirements: 1.2, 1.3_

- [x] 4. Create GoogleSignInButton component
  - [x] 4.1 Create GoogleSignInButton component with Google branding
    - Add Google logo icon
    - Style button according to Google's branding guidelines
    - Accept `mode` prop for 'signin' or 'signup' text variants
    - Call `signInWithGoogle` from AuthContext on click
    - _Requirements: 2.1, 2.2_
  - [ ]* 4.2 Write unit tests for GoogleSignInButton
    - Test rendering in both modes
    - Test click handler calls signInWithGoogle
    - _Requirements: 2.1, 2.2_

- [x] 5. Add Google sign-in to Login page
  - [x] 5.1 Integrate GoogleSignInButton into Login page
    - Add divider with "or" text between email form and Google button
    - Position Google button below the divider
    - Handle OAuth errors and display error messages
    - _Requirements: 2.1, 2.5_

- [x] 6. Add Google sign-up to Signup page
  - [x] 6.1 Integrate GoogleSignInButton into Signup page
    - Add divider with "or" text between email form and Google button
    - Position Google button below the divider
    - Handle OAuth errors and display error messages
    - _Requirements: 2.2, 2.5_

- [x] 7. Create AccountLinkDialog component
  - [x] 7.1 Create modal dialog for account linking notification
    - Display message explaining existing account found
    - Explain that Google account will be linked to existing email account
    - Add confirm and cancel buttons
    - _Requirements: 3.1, 3.2_
  - [x] 7.2 Implement dialog actions
    - On confirm: proceed with OAuth flow (Supabase handles linking automatically)
    - On cancel: redirect to login page without changes
    - _Requirements: 3.3, 3.4_
  - [ ]* 7.3 Write unit tests for AccountLinkDialog
    - Test dialog renders with correct content
    - Test confirm and cancel button actions
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Handle account linking in AuthCallback
  - [x] 8.1 Detect account linking scenario in OAuth callback
    - Check if user has multiple identities after OAuth completion
    - Detect if this is first time linking (new identity added)
    - _Requirements: 3.1_
  - [x] 8.2 Show informational message for linked accounts
    - Display success message indicating accounts were merged
    - Redirect to dashboard after acknowledgment
    - _Requirements: 3.2, 3.5_
  - [ ]* 8.3 Write property test for session after account linking
    - **Property 3: Session establishment after OAuth completion**
    - **Validates: Requirements 2.4, 3.5**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
