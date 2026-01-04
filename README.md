# Taigun - A ServiceNow AI Agent

An automated AI-powered solution for handling ServiceNow tickets using Model Context Protocol (MCP) and Mastra AI.

## 🎯 Overview

This AI agent automatically monitors ServiceNow tickets, provides intelligent responses, and manages a knowledge base for efficient ticket resolution.

## ✨ Features

- **Automated Ticket Monitoring**: Continuously checks for new access-related tickets
- **Intelligent Detection**: Uses keywords to identify access/authentication issues
- **Automatic Responses**: Sends SSO instructions to customers
- **MCP Integration**: Exposes ServiceNow operations as MCP tools
- **Configurable**: Customize keywords, check intervals, and auto-resolve behavior

## 🏗️ Architecture

```
┌─────────────────────┐
│   Mastra AI Agent   │
│  (Ticket Processor) │
└──────────┬──────────┘
           │
           │ MCP Protocol
           │
┌──────────▼──────────┐
│   MCP Server        │
│  (ServiceNow Tools) │
└──────────┬──────────┘
           │
           │ REST API
           │
┌──────────▼──────────┐
│   ServiceNow        │
│   Instance          │
└─────────────────────┘
```

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **ServiceNow Instance**: With API access credentials
- **LLM API Key**: OpenAI or Google AI API key
- **Qdrant Cloud Account**: Free tier available at [cloud.qdrant.io](https://cloud.qdrant.io)
- **npm or pnpm**: For package management

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# ServiceNow Configuration
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com
SERVICENOW_USERNAME=your_api_user
SERVICENOW_PASSWORD=your_password

# LLM Provider (choose one)
OPENAI_API_KEY=sk-your-openai-key
# GOOGLE_API_KEY=your-google-api-key

# Qdrant Cloud Configuration
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key

# SSO Configuration
SSO_SIGNIN_URL=https://your-sso-portal.com/login

# Agent Configuration
TICKET_CHECK_INTERVAL=300000
AUTO_RESOLVE_TICKETS=false
ACCESS_KEYWORDS=access,login,sign in,authentication,SSO,password,credentials
```

> [!NOTE]
> See [QDRANT_SETUP.md](QDRANT_SETUP.md) for detailed instructions on setting up Qdrant Cloud.

### 3. Run the Agent

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

**MCP Server only** (for testing):
```bash
npm run mcp-server
```

## 🔧 Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICENOW_INSTANCE_URL` | Your ServiceNow instance URL | Required |
| `SERVICENOW_USERNAME` | API user username | Required |
| `SERVICENOW_PASSWORD` | API user password | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required (or Google) |
| `GOOGLE_API_KEY` | Google AI API key | Required (or OpenAI) |
| `QDRANT_URL` | Qdrant Cloud cluster URL | Required |
| `QDRANT_API_KEY` | Qdrant Cloud API key | Required |
| `SSO_SIGNIN_URL` | Your SSO portal URL | Required |
| `TICKET_CHECK_INTERVAL` | Check interval in ms | 300000 (5 min) |
| `AUTO_RESOLVE_TICKETS` | Auto-resolve after response | false |
| `ACCESS_KEYWORDS` | Keywords to detect (comma-separated) | access,login,... |

## 🛠️ MCP Tools

The ServiceNow MCP server exposes the following tools:

### `get_pending_tickets`
Retrieve pending tickets (New or In Progress state) with optional keyword filtering.

**Parameters:**
- `keywords` (array): Keywords to search in ticket description
- `limit` (number): Maximum tickets to return (default: 10)

### `get_ticket_details`
Get full details of a specific ticket by sys_id.

**Parameters:**
- `sys_id` (string): The ticket's sys_id

### `update_ticket`
Update a ticket with comments, work notes, or state change.

**Parameters:**
- `sys_id` (string): The ticket's sys_id
- `comments` (string): Customer-visible comments
- `work_notes` (string): Internal work notes
- `state` (string): New state (1=New, 2=In Progress, 6=Resolved, 7=Closed)

### `add_work_note`
Add an internal work note to a ticket.

**Parameters:**
- `sys_id` (string): The ticket's sys_id
- `note` (string): The work note content

## 📖 How It Works

1. **Monitoring**: Agent checks ServiceNow every 5 minutes (configurable)
2. **Detection**: Searches for tickets with access-related keywords
3. **Analysis**: Reads full ticket details to confirm it's an access issue
4. **Response**: Adds customer comment with SSO instructions
5. **Documentation**: Adds internal work note with timestamp
6. **Resolution**: Optionally sets ticket to "Resolved" state

## 🧪 Testing

### Test MCP Server Standalone

```bash
npm run mcp-server
```

Then use an MCP client or inspector to test individual tools.

### Test with Mock Data

Create a test ticket in your ServiceNow instance with "access issue" in the description, then run the agent to see it process the ticket.

## 🔒 Security Best Practices

- **Never commit `.env` file** - It contains sensitive credentials
- **Use dedicated API account** - Create a ServiceNow user specifically for API access
- **Limit permissions** - Grant only necessary permissions (read/write incidents)
- **Rotate credentials** - Regularly update API passwords and keys
- **Monitor usage** - Review agent actions in ServiceNow work notes

## 🐛 Troubleshooting

### "Configuration errors"
- Ensure all required environment variables are set in `.env`
- Check that `.env` file is in the project root directory

### "Connection refused" or "401 Unauthorized"
- Verify ServiceNow instance URL is correct
- Check username and password are valid
- Ensure API user has proper permissions

### "No tickets found"
- Verify tickets exist in "New" or "In Progress" state
- Check that keywords match ticket descriptions
- Review ServiceNow query in MCP server logs

### Agent not responding
- Check LLM API key is valid and has credits
- Review console logs for errors
- Verify MCP server is running

## 📝 Customization

### Change Response Template

Edit the `generateSSOResponse()` method in `src/agent/ticket-agent.ts`:

```typescript
private generateSSOResponse(): string {
  return `Your custom message here...`;
}
```

### Add More Keywords

Update the `ACCESS_KEYWORDS` in `.env`:

```env
ACCESS_KEYWORDS=access,login,sign in,authentication,SSO,password,locked out,cannot access
```

### Adjust Check Interval

Modify `TICKET_CHECK_INTERVAL` in `.env` (in milliseconds):

```env
TICKET_CHECK_INTERVAL=60000  # Check every 1 minute
```

## 📄 License

ISC

## 🤝 Support

For issues or questions, please check the troubleshooting section or review the code comments for detailed implementation notes.

---

**Built with:**
- [Mastra AI](https://mastra.ai) - AI agent framework
- [Model Context Protocol](https://modelcontextprotocol.io) - Tool integration standard
- [ServiceNow REST API](https://developer.servicenow.com/dev.do) - Ticket management
- [Qdrant Cloud](https://cloud.qdrant.io) - Vector database for knowledge base
