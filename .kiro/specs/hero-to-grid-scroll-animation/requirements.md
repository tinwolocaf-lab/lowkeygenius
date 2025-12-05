# Requirements Document

## Introduction

This feature implements a "Hero-to-Grid" scroll-linked animation on the Homepage, positioned below the existing hero section. The animation showcases public courses from the marketplace by displaying one randomly selected course as a large "hero" card that smoothly scales down and joins a grid of other courses as the user scrolls. This creates an engaging visual experience that highlights community-created courses and encourages user sign-up.

## Glossary

- **Hero Card**: A large, prominently displayed course card that serves as the focal point of the animation before scaling down
- **Course Grid**: A responsive grid layout displaying multiple course cards (3x3 on desktop, 2x5 on mobile)
- **Scroll Progress**: A value from 0 to 1 representing how far the user has scrolled through the animation section
- **Sticky Container**: A container that remains fixed in the viewport while the user scrolls through a taller parent element
- **Public Course**: A course with `is_public` set to true in the database, visible to all users
- **Scroll Spacer**: A tall container element that creates scroll distance for the animation without moving visible content
- **Featured Course**: The randomly selected course that starts as the Hero Card and animates into the grid

## Requirements

### Requirement 1

**User Story:** As a visitor, I want to see an engaging scroll animation showcasing public courses below the hero section, so that I can discover what courses are available on the platform.

#### Acceptance Criteria

1. WHEN a visitor scrolls to the animation section THEN the Homepage SHALL display a sticky container with a large Hero Card centered in the viewport
2. WHEN the visitor scrolls through the animation section THEN the Hero Card SHALL smoothly scale down from full size to grid-item size
3. WHEN the Hero Card finishes scaling THEN the Hero Card SHALL settle into a designated slot within the course grid
4. WHEN the animation completes THEN the Homepage SHALL display a complete grid of course cards (3x3 on desktop, 2x5 on mobile)
5. WHEN the animation section renders THEN the Homepage SHALL use a scroll spacer of sufficient height (approximately 300vh) to create smooth animation distance

### Requirement 2

**User Story:** As a visitor, I want to see real course data in the animation, so that I can understand what types of courses are available.

#### Acceptance Criteria

1. WHEN the animation section loads THEN the System SHALL fetch public courses from the database without requiring authentication
2. WHEN courses are fetched THEN the System SHALL retrieve course thumbnail URL, title, and description for each course
3. WHEN a Featured Course is selected THEN the System SHALL randomly choose one course from the fetched public courses
4. WHEN fewer than 9 public courses exist THEN the System SHALL repeat courses to fill the required grid slots
5. WHEN course data is loading THEN the System SHALL display loading skeleton placeholders

### Requirement 3

**User Story:** As a database administrator, I want a public API endpoint for fetching course preview data, so that unauthenticated visitors can view course information on the homepage.

#### Acceptance Criteria

1. WHEN the public courses API is called THEN the Database SHALL return only courses where is_public equals true
2. WHEN returning course data THEN the API SHALL expose only thumbnail_url, title, description, topic, and level fields
3. WHEN the API is accessed without authentication THEN the Database SHALL allow the query to execute successfully
4. WHEN courses are returned THEN the API SHALL order results by published_at in descending order

### Requirement 4

**User Story:** As a visitor, I want to click on a course card to learn more, so that I can explore courses that interest me.

#### Acceptance Criteria

1. WHEN an unauthenticated visitor clicks a course card THEN the System SHALL navigate to the authentication page
2. WHEN navigating to authentication THEN the System SHALL display a toast notification explaining that sign-in is required to view courses
3. WHEN the course card is hovered THEN the Card SHALL display a visual hover state indicating interactivity

### Requirement 5

**User Story:** As a visitor on a mobile device, I want the animation to work smoothly and display an appropriate grid layout, so that I have a good experience regardless of device.

#### Acceptance Criteria

1. WHEN viewing on desktop (screen width >= 1024px) THEN the Grid SHALL display in a 3x3 layout (9 courses)
2. WHEN viewing on mobile (screen width < 1024px) THEN the Grid SHALL display in a 2x5 layout (10 courses)
3. WHEN the animation plays THEN the System SHALL maintain smooth 60fps performance on modern devices
4. WHEN the viewport is resized THEN the Grid SHALL responsively adjust its layout

### Requirement 6

**User Story:** As a developer, I want the animation to use Framer Motion, so that the implementation follows modern React animation best practices.

#### Acceptance Criteria

1. WHEN implementing scroll tracking THEN the Component SHALL use Framer Motion's useScroll hook
2. WHEN interpolating animation values THEN the Component SHALL use Framer Motion's useTransform hook
3. WHEN animating the Hero Card THEN the Component SHALL animate scale and position properties based on scroll progress
4. WHEN the grid items appear THEN the Component SHALL animate their opacity from hidden to visible as the Hero Card shrinks

### Requirement 7

**User Story:** As a visitor, I want to see course information clearly on each card, so that I can understand what each course offers.

#### Acceptance Criteria

1. WHEN displaying a course card THEN the Card SHALL show the course thumbnail image prominently
2. WHEN displaying a course card THEN the Card SHALL show the course title with appropriate text truncation
3. WHEN displaying a course card THEN the Card SHALL show the course description with line clamping
4. WHEN a course lacks a thumbnail THEN the Card SHALL display a gradient placeholder with an icon
