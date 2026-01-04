# How the Agent Responds to Customers

## 📧 Customer Response Mechanism

### Visual Flow

![ServiceNow Response Flow](C:/Users/Meeran/.gemini/antigravity/brain/1563fd5b-255d-4002-bc84-f4ea8d964841/servicenow_response_flow_1764752140823.png)

## 🔄 Step-by-Step Process

### 1. **Customer Creates Ticket**
- Customer submits incident: "Cannot access the system"
- Ticket enters ServiceNow with state "New"

### 2. **Agent Detects the Ticket**
```typescript
// Agent calls MCP tool to get pending tickets
const tickets = await mcpTools.get_pending_tickets({
    keywords: ['access', 'login', 'SSO', 'password'],
    limit: 20
});
```

### 3. **Agent Analyzes the Ticket**
```typescript
// Checks if description contains access-related keywords
const isAccessIssue = ticket.description.includes('access');
// Result: TRUE ✓
```

### 4. **Agent Updates Ticket with Response**
```typescript
// Calls ServiceNow API to add comment
await mcpTools.update_ticket({
    sys_id: 'abc123...',
    comments: 'Thank you for contacting IT support. To resolve your access issue, please sign in using SSO...',
    work_notes: '[Automated Response] SSO instructions provided by AI agent'
});
```

### 5. **ServiceNow Processes the Update**

The `update_ticket` call makes a REST API request to ServiceNow:

```http
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "comments": "Thank you for contacting IT support...",
  "work_notes": "[Automated Response] SSO instructions..."
}
```

### 6. **ServiceNow Sends Email to Customer**

ServiceNow's built-in notification system automatically:
- ✅ Detects the new comment
- ✅ Finds the ticket's caller (customer)
- ✅ Sends email notification
- ✅ Includes the comment in the email body

### 7. **Customer Receives the Response**

The customer gets an email like this:

```
From: ServiceNow <no-reply@servicenow.com>
To: customer@company.com
Subject: Incident INC0010001 Updated

Your incident has been updated.

Incident: INC0010001
Short Description: Cannot access the system

Latest Comment:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for contacting IT support. To resolve 
your access issue, please sign in using SSO 
(Single Sign-On) at the following URL:

https://sso.yourcompany.com/login

If you continue to experience issues after 
signing in with SSO, please reply to this ticket 
and we'll investigate further.

Best regards,
IT Support (Automated Response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View this incident in ServiceNow:
https://dev12345.service-now.com/incident.do?sys_id=...
```

## 🎯 Key Points

### Comments vs Work Notes

| Field | Visibility | Purpose |
|-------|-----------|---------|
| **comments** | ✅ Customer can see | Response to customer |
| **work_notes** | ❌ Internal only | Agent tracking/audit |

### Why This Works

1. **ServiceNow's Built-in Email System**
   - ServiceNow automatically sends emails when tickets are updated
   - No need to manually send emails
   - Customers are already subscribed to their tickets

2. **The Agent Just Adds a Comment**
   - Agent doesn't send emails directly
   - Agent updates the ticket via API
   - ServiceNow handles the rest

3. **Customer Can Respond**
   - Customer can reply to the email
   - Reply creates a new comment on the ticket
   - Agent can see the response in next check

## 🧪 Quick Test

Want to see it in action? Run this test:

```bash
# 1. Start the agent
npm run dev

# 2. In ServiceNow, create a ticket:
#    - Caller: Test User (with your email)
#    - Description: "Cannot access the application"
#    - State: New

# 3. Wait 30 seconds (or your check interval)

# 4. Check your email inbox
#    You'll receive: "Incident INC0010001 Updated"
#    With SSO instructions in the body

# 5. Check ServiceNow ticket
#    You'll see the comment in the Activities section
```

## 📊 Behind the Scenes: The API Call

When the agent calls `update_ticket`, here's what happens:

```typescript
// 1. MCP Client (in main app)
const result = await mcpTools.update_ticket({
    sys_id: 'abc123',
    comments: 'SSO instructions...'
});

// 2. MCP Server receives the call
async updateTicket(args) {
    // Makes HTTP request to ServiceNow
    const response = await axios.patch(
        `${serviceNowUrl}/api/now/table/incident/${args.sys_id}`,
        { comments: args.comments }
    );
    return response.data;
}

// 3. ServiceNow receives the PATCH request
// 4. ServiceNow updates the incident record
// 5. ServiceNow triggers email notification
// 6. Customer receives email
```

## 🔍 Verification

After the agent runs, you can verify the response in 3 places:

### 1. Console Output
```
✅ Responded to INC0010001 with SSO instructions
```

### 2. ServiceNow UI
- Open the incident
- Scroll to "Activities" section
- See the comment with SSO instructions

### 3. Customer Email
- Check the customer's email inbox
- Find "Incident Updated" notification
- Read the SSO instructions

---

**Need more help?** Check [TESTING.md](file:///c:/Users/Meeran/New%20folder%20%284%29/servicenow-mcp-agent/TESTING.md) for detailed testing instructions!
