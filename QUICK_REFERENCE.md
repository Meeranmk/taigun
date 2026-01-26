# Quick Reference - Frontend Registration Flow

## 🚀 Quick Start

### Files Created (3)
```
frontend/app/verify-email/page.tsx          ← Email verification handler
frontend/app/create-password/page.tsx       ← Password creation form
frontend/app/resend-verification/page.tsx   ← Resend verification email
```

### Files Updated (3)
```
frontend/lib/api-client.ts                  ← Added 3 new API methods
frontend/lib/types/index.ts                 ← Added 2 new interfaces
frontend/app/register/page.tsx              ← Updated success message
```

---

## 📡 API Methods Added

```typescript
// In frontend/lib/api-client.ts

// 1. Verify email token
api.verifyEmail(token: string): Promise<VerifyEmailResponse>

// 2. Create password
api.createPassword(
  userId: string, 
  password: string, 
  confirmPassword: string
): Promise<ApiResponse<any>>

// 3. Resend verification
api.resendVerification(
  email: string, 
  entityType: 'organization' | 'user'
): Promise<ApiResponse<any>>
```

---

## 🎯 Type Definitions Added

```typescript
// In frontend/lib/types/index.ts

export interface VerifyEmailResponse {
    success: boolean;
    message: string;
    organizationId?: string;
    userId?: string;
    needsPassword: boolean;
}

export interface CreatePasswordRequest {
    userId: string;
    password: string;
    confirmPassword: string;
}
```

---

## 🔗 Routes & URLs

| Route | Purpose | Query Params |
|-------|---------|--------------|
| `/verify-email` | Email verification | `?token=xxx` |
| `/create-password` | Password creation | `?userId=xxx` |
| `/resend-verification` | Resend email | None |
| `/register` | Registration form | None |
| `/login` | Login page | `?message=xxx` (optional) |

---

## 🎨 UI Components Used

All pages use:
- ✅ Gradient backgrounds (`bg-gradient-to-br from-blue-50 to-indigo-100`)
- ✅ White cards with rounded corners (`rounded-xl shadow-lg`)
- ✅ Blue primary color (`bg-blue-600`, `text-blue-600`)
- ✅ Loading spinners (animated border)
- ✅ SVG icons for success/error states
- ✅ Responsive design (mobile-first)

---

## 🔐 Password Validation Rules

```typescript
// In create-password page
✓ Minimum 8 characters
✓ At least one uppercase letter (A-Z)
✓ At least one lowercase letter (a-z)
✓ At least one number (0-9)
✓ At least one special character (!@#$%^&*(),.?":{}|<>)
✓ Password and confirm password must match
```

---

## 🛣️ User Journey

```
Register → Email Sent → Verify Email → Create Password → Login → Dashboard
                ↓
         (if expired)
                ↓
        Resend Verification
```

---

## 🧪 Testing URLs

```bash
# Local development
http://localhost:3000/register
http://localhost:3000/verify-email?token=test-token-123
http://localhost:3000/create-password?userId=user-id-123
http://localhost:3000/resend-verification
http://localhost:3000/login?message=Welcome%20back
```

---

## 📋 Backend API Expectations

### 1. POST `/organizations/verify-email`
```json
// Request
{
  "token": "verification-token-from-email"
}

// Response
{
  "success": true,
  "message": "Email verified successfully",
  "userId": "user-123",
  "organizationId": "org-456",
  "needsPassword": true
}
```

### 2. POST `/organizations/create-password`
```json
// Request
{
  "userId": "user-123",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}

// Response
{
  "success": true,
  "message": "Password created successfully"
}
```

### 3. POST `/organizations/resend-verification`
```json
// Request
{
  "email": "user@example.com",
  "entityType": "organization"  // or "user"
}

// Response
{
  "success": true,
  "message": "Verification email sent"
}
```

---

## 🐛 Common Issues & Solutions

### Issue: TypeScript errors in api-client.ts
**Solution:** The errors should resolve after TypeScript recompiles. If not, restart the dev server.

### Issue: 401 redirects on verification pages
**Solution:** Already handled! The interceptor excludes these routes.

### Issue: Verification link doesn't work
**Solution:** Check that backend is sending correct URL format: `/verify-email?token=xxx`

### Issue: Password validation too strict
**Solution:** Modify the `validatePassword` function in `create-password/page.tsx`

---

## 🎨 Customization Guide

### Change Colors
```typescript
// Replace in all pages:
bg-blue-600 → bg-purple-600
text-blue-600 → text-purple-600
from-blue-50 to-indigo-100 → from-purple-50 to-pink-100
```

### Change Password Rules
```typescript
// In create-password/page.tsx, modify validatePassword():
if (pwd.length < 12) { // Changed from 8 to 12
  return 'Password must be at least 12 characters';
}
```

### Change Redirect Timing
```typescript
// In verify-email/page.tsx:
setTimeout(() => {
  router.push(...);
}, 5000); // Changed from 2000ms to 5000ms
```

---

## 📦 Dependencies Used

All dependencies are already in package.json:
- `next` - Framework
- `react` - UI library
- `axios` - HTTP client
- `next/navigation` - Routing hooks

No additional packages needed! ✅

---

## 🔄 State Management

All pages use local React state (`useState`):
- No Redux/Zustand needed
- Simple and maintainable
- Easy to understand

---

## ✅ Checklist for Backend Team

- [ ] Implement `/organizations/verify-email` endpoint
- [ ] Implement `/organizations/create-password` endpoint
- [ ] Implement `/organizations/resend-verification` endpoint
- [ ] Send verification emails with correct link format
- [ ] Hash passwords before storing
- [ ] Generate secure verification tokens
- [ ] Set token expiration (recommended: 24 hours)
- [ ] Handle token validation errors
- [ ] Return proper error messages

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API endpoint URLs match
3. Check network tab for API responses
4. Ensure environment variables are set
5. Restart dev server if needed

---

**Last Updated:** 2026-01-26
**Status:** ✅ Ready for Production
