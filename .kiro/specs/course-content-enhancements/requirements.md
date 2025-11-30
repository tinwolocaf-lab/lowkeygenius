# Requirements Document

## Introduction

This specification defines enhancements to the LearnSelf course viewing and learning experience. The enhancements include Mermaid diagram rendering for visual explanations, consistent markdown rendering across all course pages, inline text editing capabilities for course owners, and a text selection-based note-taking system that captures context (course name, lesson title, and reference location).

## Glossary

- **Course_View_System**: The system responsible for displaying course content to learners, including lesson markdown, navigation, and progress tracking
- **Mermaid_Renderer**: A component that parses and renders Mermaid diagram syntax into visual SVG diagrams within markdown content
- **Markdown_Renderer**: The unified component responsible for converting markdown text into styled HTML with support for code highlighting, tables, and diagrams
- **Selection_Overlay_Menu**: A floating contextual menu that appears when a user selects text within lesson content
- **Inline_Editor**: A component that allows course owners to edit selected text directly within the lesson view without navigating to a separate edit page
- **Note_Snippet**: A saved piece of text from a lesson, stored with contextual metadata including course name, lesson title, and position reference
- **Course_Owner**: The user who created the course and has permission to edit its content

## Requirements

### Requirement 1

**User Story:** As a learner, I want to see Mermaid diagrams rendered as visual charts in lesson content, so that I can better understand complex concepts through visual representations.

#### Acceptance Criteria

1. WHEN the Markdown_Renderer encounters a code block with language identifier "mermaid" THEN the Course_View_System SHALL render the content as an SVG diagram using the Mermaid library
2. WHEN a Mermaid diagram contains syntax errors THEN the Course_View_System SHALL display a user-friendly error message with the original code block visible
3. WHEN a Mermaid diagram is rendered THEN the Course_View_System SHALL apply consistent styling that matches the application theme
4. WHEN the application theme changes THEN the Mermaid_Renderer SHALL update diagram colors to match the new theme

### Requirement 2

**User Story:** As a learner, I want consistent markdown rendering across all course pages, so that I have a uniform reading experience whether viewing, previewing, or generating content.

#### Acceptance Criteria

1. THE Markdown_Renderer SHALL use identical styling and component configuration across CourseView, LessonPreview, and GenerateLessons pages
2. WHEN markdown content is displayed THEN the Markdown_Renderer SHALL render all standard markdown elements including headings, lists, code blocks, tables, blockquotes, and links
3. WHEN code blocks are rendered THEN the Markdown_Renderer SHALL apply syntax highlighting using a consistent color scheme
4. THE Markdown_Renderer SHALL be implemented as a single reusable component to ensure consistency

### Requirement 3

**User Story:** As a course owner viewing my own course, I want to edit lesson content inline by selecting text, so that I can make quick corrections without leaving the learning view.

#### Acceptance Criteria

1. WHEN a Course_Owner selects text in a lesson they own THEN the Course_View_System SHALL display a Selection_Overlay_Menu near the selection
2. WHEN the Selection_Overlay_Menu is displayed THEN the Course_View_System SHALL show an "Edit" option that enables inline editing of the selected text
3. WHEN the Course_Owner confirms an inline edit THEN the Course_View_System SHALL save the modified content to the database and update the display immediately
4. WHEN a user who is not the Course_Owner selects text THEN the Course_View_System SHALL display the Selection_Overlay_Menu without the "Edit" option
5. IF the inline edit save operation fails THEN the Course_View_System SHALL display an error notification and preserve the original content

### Requirement 4

**User Story:** As a learner, I want to save selected text as notes with full context, so that I can review important snippets later with reference to their source.

#### Acceptance Criteria

1. WHEN a user selects text in a lesson THEN the Course_View_System SHALL display a Selection_Overlay_Menu with a "Save as Note" option
2. WHEN the user clicks "Save as Note" THEN the Course_View_System SHALL store the Note_Snippet with the course title, lesson title, and selected text
3. WHEN a Note_Snippet is saved THEN the Course_View_System SHALL display a success notification confirming the save
4. WHEN viewing saved notes THEN the Course_View_System SHALL display each Note_Snippet with its associated course title and lesson title as reference metadata
5. IF the note save operation fails THEN the Course_View_System SHALL display an error notification and allow the user to retry

### Requirement 5

**User Story:** As a learner, I want the selection overlay menu to appear contextually when I select text, so that I can quickly access note-taking and editing features.

#### Acceptance Criteria

1. WHEN a user completes a text selection in lesson content THEN the Selection_Overlay_Menu SHALL appear within 200 milliseconds positioned near the selection
2. WHEN the user clicks outside the Selection_Overlay_Menu or deselects text THEN the Selection_Overlay_Menu SHALL close immediately
3. WHEN the Selection_Overlay_Menu is displayed THEN the Course_View_System SHALL position the menu to avoid overlapping with viewport edges
4. WHEN the user scrolls while the Selection_Overlay_Menu is open THEN the Course_View_System SHALL close the menu to prevent positioning issues
