# Testing Guide - ServiceNow MCP Agent

## 🧪 How to Test the Agent

### Prerequisites

1. **ServiceNow Developer Instance** (Free)
   - Sign up at: https://developer.servicenow.com/
   - Get a free Personal Developer Instance (PDI)
   - Note your instance URL (e.g., `https://dev12345.service-now.com`)

2. **OpenAI API Key**
   - Get from: https://platform.openai.com/api-keys
   - Ensure you have credits available

### Step 1: Configure Environment

Create `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# ServiceNow Configuration
SERVICENOW_INSTANCE_URL=https://dev12345.service-now.com
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=your_admin_password

# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-key-here

# SSO Configuration
SSO_SIGNIN_URL=https://sso.yourcompany.com/login

# Agent Settings (start with short interval for testing)
TICKET_CHECK_INTERVAL=30000          # 30 seconds for testing
AUTO_RESOLVE_TICKETS=false           # Keep false for testing
ACCESS_KEYWORDS=access,login,sign in,authentication,SSO,password
```

### Step 2: Create a Test User in ServiceNow

1. Log into your ServiceNow instance as admin
2. Navigate to: **User Administration > Users**
3. Click **New**
4. Fill in:
   - **User ID**: `test.customer`
   - **First Name**: `Test`
   - **Last Name**: `Customer`
   - **Email**: `your-email@example.com` (use your real email to receive notifications)
   - **Active**: ✓ Checked
5. Click **Submit**

### Step 3: Create a Test Incident

1. In ServiceNow, navigate to: **Incident > Create New**
2. Fill in the incident:
   - **Caller**: Select "Test Customer" (the user you created)
   - **Short Description**: `Cannot access the system`
   - **Description**: `I'm having trouble logging in. I keep getting access denied errors.`
   - **State**: `New` (or `In Progress`)
   - **Priority**: `3 - Moderate`
3. Click **Submit**
4. **Note the incident number** (e.g., INC0010001)

### Step 4: Run the Agent

Open a terminal in the project directory:

```bash
# Run in development mode
npm run dev
```

You should see output like:

```
🤖 ServiceNow MCP Agent with Mastra AI
=====================================

✅ Configuration loaded successfully

🔧 Starting ServiceNow MCP Server...
✅ Connected to MCP Server

📦 Available MCP Tools:
   - get_pending_tickets: Retrieve pending ServiceNow tickets...
   - get_ticket_details: Get full details of a specific ticket...
   - update_ticket: Update a ServiceNow ticket...
   - add_work_note: Add an internal work note...

🚀 Starting ServiceNow ticket monitoring...
📊 Check interval: 30000ms
🔑 Access keywords: access, login, sign in, authentication, SSO, password
🔗 SSO URL: https://sso.yourcompany.com/login
⚙️  Auto-resolve: No

🔍 Fetching pending tickets...
📬 Found 1 potential access-related ticket(s)

📋 Processing ticket: INC0010001
   Description: Cannot access the system
   ✅ Responded to INC0010001 with SSO instructions
✅ All tickets processed

✨ Agent is now monitoring tickets...
```

### Step 5: Verify the Response

#### Option A: Check in ServiceNow UI

1. Go back to your ServiceNow instance
2. Navigate to: **Incident > All**
3. Find your test incident (INC0010001)
4. Click to open it
5. Scroll to the **Activities** section
6. You should see:
   - **Customer-visible comment** with SSO instructions
   - **Work Note** (internal) showing automation timestamp

#### Option B: Check Email

1. Check the email inbox for `your-email@example.com`
2. You should receive an email from ServiceNow
3. Subject: `Incident INC0010001 Updated`
4. Body contains the SSO instructions

### Step 6: View the Response

The customer will see this message:

```
Thank you for contacting IT support. To resolve your access issue, 
please sign in using SSO (Single Sign-On) at the following URL:

https://sso.yourcompany.com/login

If you continue to experience issues after signing in with SSO, 
please reply to this ticket and we'll investigate further.

Best regards,
IT Support (Automated Response)
```

## 📊 What Happens Behind the Scenes

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Customer creates ticket: "Cannot access system"         │
│    State: New                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Agent checks ServiceNow every 30 seconds                │
│    Calls: get_pending_tickets(keywords=['access',...])     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent finds ticket INC0010001                           │
│    Calls: get_ticket_details(sys_id='...')                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Agent analyzes: "access" keyword found ✓                │
│    Generates SSO response message                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Agent updates ticket                                     │
│    Calls: update_ticket(                                    │
│      sys_id='...',                                          │
│      comments='Thank you for contacting IT support...',     │
│      work_notes='[Automated Response] SSO instructions...'  │
│    )                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ServiceNow processes the update                         │
│    - Adds comment to ticket (visible to customer)          │
│    - Adds work note (internal only)                        │
│    - Triggers email notification                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Customer receives email notification                    │
│    Subject: "Incident INC0010001 Updated"                  │
│    Body: SSO instructions                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Troubleshooting

### Agent doesn't find the ticket

**Check:**
- Ticket state is "New" or "In Progress"
- Description contains one of the keywords (access, login, etc.)
- Run with shorter interval: `TICKET_CHECK_INTERVAL=10000` (10 seconds)

**Debug:**
```bash
# Check what the agent sees
# Look for this in console output:
📬 Found 0 potential access-related ticket(s)
```

### Agent finds ticket but doesn't respond

**Check:**
- ServiceNow credentials are correct
- User has permission to update incidents
- Check console for error messages

### No email received

**Check:**
- Test user has valid email address
- ServiceNow email notifications are enabled
- Check spam folder
- Verify in ServiceNow UI that comment was added

## 🎯 Test Scenarios

### Scenario 1: Access Issue (Should Respond)
```
Short Description: "Cannot login to application"
Description: "I'm getting access denied when trying to sign in"
Expected: ✅ Agent responds with SSO instructions
```

### Scenario 2: Password Issue (Should Respond)
```
Short Description: "Password not working"
Description: "My password seems to be incorrect"
Expected: ✅ Agent responds with SSO instructions
```

### Scenario 3: Different Issue (Should Skip)
```
Short Description: "Printer not working"
Description: "The office printer is jammed"
Expected: ⏭️ Agent skips (not access-related)
```

### Scenario 4: SSO Keyword (Should Respond)
```
Short Description: "SSO login problem"
Description: "Single sign-on is not working for me"
Expected: ✅ Agent responds with SSO instructions
```

## 📸 Expected Results

### In ServiceNow Ticket View

You'll see two entries in the Activities section:

**1. Additional Comments (Customer-visible)**
```
Thank you for contacting IT support. To resolve your access issue, 
please sign in using SSO (Single Sign-On) at the following URL:

https://sso.yourcompany.com/login

If you continue to experience issues after signing in with SSO, 
please reply to this ticket and we'll investigate further.

Best regards,
IT Support (Automated Response)
```

**2. Work Notes (Internal only)**
```
[Automated Response] SSO instructions provided by AI agent at 2025-12-03T14:21:40.123Z
```

### In Email Notification

```
From: ServiceNow <no-reply@servicenow.com>
To: your-email@example.com
Subject: Incident INC0010001 Updated

Incident INC0010001 has been updated.

Number: INC0010001
Short Description: Cannot access the system
State: In Progress

Latest Comment:
Thank you for contacting IT support. To resolve your access issue, 
please sign in using SSO (Single Sign-On) at the following URL:

https://sso.yourcompany.com/login
...
```

## 🚀 Next Steps After Testing

1. **Adjust Check Interval**: Change to 5 minutes for production
   ```env
   TICKET_CHECK_INTERVAL=300000
   ```

2. **Enable Auto-Resolve** (optional): If you want tickets auto-resolved
   ```env
   AUTO_RESOLVE_TICKETS=true
   ```

3. **Customize Keywords**: Add more keywords specific to your use case
   ```env
   ACCESS_KEYWORDS=access,login,sign in,authentication,SSO,password,locked out,cannot access,credentials
   ```

4. **Deploy**: Run in production mode
   ```bash
   npm run build
   npm start
   ```

---

**Questions?** Check the main [README.md](file:///c:/Users/Meeran/New%20folder%20%284%29/servicenow-mcp-agent/README.md) for more details!
