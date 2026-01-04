# Deployment Guide

This guide explains how to deploy the ServiceNow MCP Agent for production use.

## 🚀 Deployment Options

### Option 1: Docker (Recommended)

Containerizing the agent ensures it runs consistently in any environment.

1.  **Create a `Dockerfile`**:
    ```dockerfile
    FROM node:18-alpine

    WORKDIR /app

    COPY package*.json ./
    RUN npm ci --only=production

    COPY . .
    RUN npm run build

    CMD ["npm", "start"]
    ```

2.  **Build the Image**:
    ```bash
    docker build -t servicenow-agent .
    ```

3.  **Run the Container**:
    ```bash
    docker run -d \
      --name servicenow-agent \
      --restart always \
      -e SERVICENOW_INSTANCE_URL="https://dev12345.service-now.com" \
      -e SERVICENOW_USERNAME="admin" \
      -e SERVICENOW_PASSWORD="your_password" \
      -e OPENAI_API_KEY="sk-..." \
      servicenow-agent
    ```

### Option 2: Windows Service (On-Premise)

If you need to run this on a Windows Server inside your corporate network:

1.  **Install Node.js** on the server.
2.  **Use `node-windows`** to create a service:
    Create a file `install-service.js`:
    ```javascript
    var Service = require('node-windows').Service;

    var svc = new Service({
      name:'ServiceNow AI Agent',
      description: 'Automated AI agent for ServiceNow tickets',
      script: 'C:\\path\\to\\agent\\dist\\index.js',
      env: [
        { name: "SERVICENOW_INSTANCE_URL", value: "..." },
        { name: "OPENAI_API_KEY", value: "..." }
      ]
    });

    svc.on('install',function(){
      svc.start();
    });

    svc.install();
    ```
3.  **Run the script**: `node install-service.js`

### Option 3: Cloud (AWS/Azure)

#### Azure Container Apps
1.  Push your Docker image to Azure Container Registry (ACR).
2.  Create a Container App.
3.  Set the Environment Variables in the "Configuration" tab.
4.  The agent will run continuously as a background worker.

#### AWS ECS (Fargate)
1.  Push image to ECR.
2.  Create a Task Definition with your environment variables.
3.  Launch a Service using the Fargate launch type.

## 🛡️ Production Best Practices

1.  **Security**: Never commit your `.env` file. Use a secrets manager (like AWS Secrets Manager or Azure Key Vault) to inject environment variables at runtime.
2.  **Logging**: Configure the agent to log to a file or a centralized logging service (like CloudWatch or Datadog) instead of just `console.log`.
3.  **Monitoring**: Set up a "heartbeat" check. You can add a simple HTTP server to the agent that returns 200 OK, so your load balancer knows it's alive.
