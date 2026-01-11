# Frontend Migration Guide for Multi-Tenancy

This guide outlines the changes required in the frontend application to support the new Multi-Tenant API.

## 1. Authentication & Context
*   **No Changes to Login**: The login flow remains the same (cookies are used).
*   **New User Properties**: The user object returned by `/api/admin/auth/status` now includes:
    *   `role`: Can be `platform_owner`, `org_admin`, `team_admin`, or `user`.
    *   `organization_id`: UUID string (or null for super admins).
    *   `team_id`: UUID string.
*   **Action**: Store these details in your Auth Context/Provider to control UI visibility.

## 2. Organization Management (New Feature)
**Audience:** Platform Owners only.

*   **Create Page**: Create a new page to list/manage organizations.
    *   Endpoint: `GET /api/admin/organizations`
    *   Create: `POST /api/admin/organizations`
*   **Subscription Plans**: Fetch plans from `GET /api/admin/organizations/plans` to populate dropdowns during org creation.

## 3. User Management
**Audience:** Admin Pages.

*   **Add User Form Updates**:
    *   **Organization Field**:
        *   If logged in as `platform_owner`: Show a dropdown of organizations to assign the new user to.
        *   If `org_admin`: Hidden (defaults to current user's org).
    *   **Team Field**:
        *   Make this a dropdown (fetch teams for the selected organization).
    *   **Payload**: Ensure `organization_id` and `team_id` are sent in the JSON body to `POST /api/admin/users`.

## 4. Settings Page
*   The endpoints `/api/admin/settings` remain the same but now return settings specific to the logged-in user's organization.
*   **Action**: Ensure the Settings UI gracefully handles empty/default values if a new organization hasn't configured them yet.

## 5. Knowledge Base & Tickets
*   These endpoints are now automatically scoped to the user's organization. No frontend API call changes needed, but ensure the UI reflects that the data is specific to the current org.
