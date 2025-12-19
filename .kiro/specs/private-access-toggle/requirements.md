# Requirements Document

## Introduction

This feature implements a "Private Access" toggle in the Admin Dashboard that allows administrators to globally disable public registration/signup functionality. When enabled, the application becomes invite-only, preventing new users from self-registering. This provides security control for organizations that want to restrict access to authorized users only.

## Glossary

- **Private Access Mode**: A system-wide setting that, when enabled, disables public user registration
- **Admin**: A user with administrative privileges who can manage system settings
- **Signup**: The process by which new users create accounts in the system
- **Registration API**: The Supabase authentication endpoint that handles new user account creation
- **App Settings**: A database table storing application-wide configuration values

## Requirements

### Requirement 1

**User Story:** As an admin, I want to toggle private access mode from the settings page, so that I can control whether new users can register.

#### Acceptance Criteria

1. WHEN an admin navigates to the Global Settings page THEN the System SHALL display a "Private Access" toggle switch in a dedicated Access Control section
2. WHEN an admin enables the Private Access toggle THEN the System SHALL persist the setting to the database immediately
3. WHEN an admin disables the Private Access toggle THEN the System SHALL persist the setting to the database immediately
4. WHEN the Private Access setting changes THEN the System SHALL display a toast notification confirming the change

### Requirement 2

**User Story:** As a system, I want to redirect signup page requests when private access is enabled, so that unauthorized users cannot access the registration interface.

#### Acceptance Criteria

1. WHEN Private Access Mode is enabled AND a user navigates to the signup view THEN the System SHALL redirect the user to the login page
2. WHEN Private Access Mode is enabled AND the Auth page loads THEN the System SHALL hide the "Don't have an account? Sign up" link
3. WHEN Private Access Mode is disabled THEN the System SHALL display the signup view and registration links normally
4. WHEN Private Access Mode status is being fetched THEN the System SHALL display a loading state before rendering the Auth page

### Requirement 3

**User Story:** As a system, I want to block registration API calls when private access is enabled, so that the backend enforces the access restriction regardless of frontend state.

#### Acceptance Criteria

1. WHEN Private Access Mode is enabled AND a signup request is made via the API THEN the System SHALL reject the request with an appropriate error message
2. WHEN Private Access Mode is enabled AND the signUp function is called THEN the System SHALL return an error indicating registration is disabled
3. WHEN Private Access Mode is disabled THEN the System SHALL process signup requests normally through Supabase Auth

### Requirement 4

**User Story:** As an admin, I want the private access setting to persist across sessions, so that the configuration remains stable after server restarts or page refreshes.

#### Acceptance Criteria

1. WHEN the application starts THEN the System SHALL fetch the Private Access Mode setting from the database
2. WHEN the Private Access Mode setting is not found in the database THEN the System SHALL default to disabled (public registration allowed)
3. WHEN the database is unavailable THEN the System SHALL default to allowing registration and log the error

### Requirement 5

**User Story:** As a developer, I want the private access setting stored in a dedicated app_settings table, so that the configuration is centralized and extensible.

#### Acceptance Criteria

1. WHEN the app_settings table is created THEN the System SHALL include columns for key, value, and updated_at
2. WHEN storing the Private Access Mode setting THEN the System SHALL use the key "private_access_enabled" with a boolean value
3. WHEN querying app settings THEN the System SHALL enforce Row Level Security allowing only authenticated admin users to modify settings
