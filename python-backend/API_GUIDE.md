# Taigun API Guide

This guide documents the API endpoints regarding the Taigun backend.

## Authentication
The API uses JWT (JSON Web Tokens) for authentication. Tokens are returned in `HTTPOnly` cookies (`access_token`) and can also be passed via `Authorization: Bearer <token>` header.

### 1. Login
*   **Endpoint:** `POST /api/admin/auth`
*   **Content-Type:** `application/x-www-form-urlencoded`
*   **Body:** `username`, `password`
*   **Response:** `access_token`, `token_type`
*   **Note:** Sets `access_token` cookie.

### 2. Check Auth Status
*   **Endpoint:** `GET /api/admin/auth/status`
*   **Response:** User details if authenticated.

### 3. Logout
*   **Endpoint:** `POST /api/admin/auth/logout`
*   **Note:** Clears `access_token` cookie.

---

## Organizations (Multi-Tenancy)
Manage organizations and subscription plans.

### 1. List Plans
*   **Endpoint:** `GET /api/admin/organizations/plans`
*   **Access:** Authenticated Users
*   **Response:** List of available subscription plans.

### 2. Create Organization
*   **Endpoint:** `POST /api/admin/organizations`
*   **Access:** Platform Owner
*   **Body:**
    ```json
    {
      "name": "Acme Corp",
      "contact_email": "admin@acme.com",
      "plan_code": "basic"
    }
    ```

### 3. List Organizations
*   **Endpoint:** `GET /api/admin/organizations`
*   **Access:** Platform Owner

### 4. Get Organization Details
*   **Endpoint:** `GET /api/admin/organizations/{id}`
*   **Access:** Platform Owner OR Organization Admin (for their own org).

---

## User Management
Manage users within the context of the logged-in admin's permissions.

### 1. List Users
*   **Endpoint:** `GET /api/admin/users`
*   **Query Params:** `skip`, `limit`
*   **Response:** List of users.

### 2. Create User
*   **Endpoint:** `POST /api/admin/users`
*   **Body:**
    ```json
    {
      "username": "john.doe",
      "email": "john@example.com",
      "password": "secretpassword",
      "role": "user",
      "organization_id": "uuid-optional",
      "team_id": "uuid-optional"
    }
    ```
*   **Note:** `organization_id` is required for Platform Owners creating users for specific orgs. `team_id` assigns the user to a team.

---

## Knowledge Base
Manage solution steps and knowledge entries.

*   `GET /api/admin/knowledge-base` (List)
*   `POST /api/admin/knowledge-base` (Create)
*   `GET /api/admin/knowledge-base/{id}` (Get)
*   `PUT /api/admin/knowledge-base/{id}` (Update)
*   `DELETE /api/admin/knowledge-base/{id}` (Delete)
*   `POST /api/admin/knowledge-base/generate` (Generate AI Solution)

---

## Chat & AI
*   `POST /api/chat`: Send a question to RAG agent.
*   `GET /api/chat/history`: Get chat history.

## Settings & Analytics
*   `GET /api/admin/settings`: Get organization settings.
*   `PUT /api/admin/settings`: Update settings.
*   `GET /api/admin/analytics`: Get dashboard metrics.
