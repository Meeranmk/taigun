# Registration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REGISTRATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   User visits    │
│   /register      │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 1: Organization Info                                   │
│  - Name, Email, Website, Industry, Size, Country, Timezone   │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 2: Team Admin Info                                     │
│  - First/Last Name, Email, Phone, Initial Team Name          │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 3: Initial Settings                                    │
│  - ServiceNow Config, AI Keys, Language, Data Retention      │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /organizations/register                                │
│  Backend creates organization & sends verification email     │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Success Toast: "Check your email to verify account"         │
│  Redirect to /login after 3 seconds                          │
└──────────────────────────────────────────────────────────────┘

         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  📧 User receives verification email                         │
│  Email contains link: /verify-email?token=xxx                │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  User clicks email link                                      │
│  → /verify-email?token=xxx                                   │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /organizations/verify-email                            │
│  Backend validates token                                     │
└────────┬─────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────────────────────────────┐
         │                                                      │
         ▼ (Success)                                    ▼ (Error)
┌──────────────────────────────┐              ┌────────────────────────┐
│  Email verified successfully │              │  Error: Invalid/Expired│
│  needsPassword = true        │              │  Show error message    │
└────────┬─────────────────────┘              └────────┬───────────────┘
         │                                              │
         ▼                                              ▼
┌──────────────────────────────┐              ┌────────────────────────┐
│  Auto-redirect after 2s      │              │  "Resend Verification" │
│  → /create-password?userId=xx│              │  button shown          │
└────────┬─────────────────────┘              └────────┬───────────────┘
         │                                              │
         │                                              ▼
         │                                     ┌────────────────────────┐
         │                                     │  /resend-verification  │
         │                                     │  Enter email & type    │
         │                                     └────────┬───────────────┘
         │                                              │
         │                                              ▼
         │                                     ┌────────────────────────┐
         │                                     │  POST /organizations/  │
         │                                     │  resend-verification   │
         │                                     └────────┬───────────────┘
         │                                              │
         │                                              ▼
         │                                     ┌────────────────────────┐
         │                                     │  New email sent        │
         │                                     │  Back to email step    │
         │                                     └────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  /create-password?userId=xxx                                 │
│  Password creation form with validation                      │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  User enters password (with real-time validation):           │
│  ✓ Min 8 characters                                          │
│  ✓ Uppercase letter                                          │
│  ✓ Lowercase letter                                          │
│  ✓ Number                                                    │
│  ✓ Special character                                         │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  POST /organizations/create-password                         │
│  Backend hashes & stores password                            │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Success! Redirect to /login                                 │
│  Message: "Password created successfully. Please log in."    │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  /login                                                       │
│  User logs in with email + password                          │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  🎉 Access Granted - Redirect to Dashboard                   │
└──────────────────────────────────────────────────────────────┘
```

## Key Pages Created

1. **`/verify-email`** - Validates email verification token
2. **`/create-password`** - Secure password creation with validation
3. **`/resend-verification`** - Resend verification email if needed

## API Endpoints Required

1. **POST** `/organizations/verify-email` - Verify email token
2. **POST** `/organizations/create-password` - Set user password
3. **POST** `/organizations/resend-verification` - Resend verification email

## Error Handling

- Invalid/expired tokens → Show error + resend option
- Network errors → User-friendly error messages
- Validation errors → Real-time feedback
- All errors have recovery paths
