# Qdrant Cloud Setup Guide

This application uses **Qdrant Cloud** as its vector database for storing and searching knowledge base entries, ServiceNow tickets, and user data.

## Quick Start

### 1. Create a Qdrant Cloud Account

1. Visit [cloud.qdrant.io](https://cloud.qdrant.io)
2. Sign up for a free account
3. Create a new cluster (Free tier available)

### 2. Get Your API Credentials

1. In the Qdrant Cloud dashboard, navigate to your cluster
2. Click on **"API Keys"** or **"Data Access"**
3. Copy your:
   - **Cluster URL** (e.g., `https://xyz-abc123.cloud.qdrant.io`)
   - **API Key** (keep this secure!)

### 3. Configure the Application

Add your Qdrant credentials to your `.env` file:

```env
# Qdrant Cloud Configuration
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-api-key-here
```

Optional: Add a collection prefix for multi-tenant setups:
```env
QDRANT_COLLECTION_PREFIX=myapp
```

### 4. Start the Application

```bash
npm run dev
```

The application will automatically:
- Connect to Qdrant Cloud
- Create necessary collections
- Initialize the vector database

## Collections Created

The application creates the following collections in Qdrant:

| Collection Name | Purpose | Vector Size |
|----------------|---------|-------------|
| `knowledge_base` | Knowledge base entries with embeddings | 1536 |
| `servicenow_tickets` | Historical ServiceNow tickets | 1536 |
| `processed_tickets` | Tracking processed tickets | 1 (metadata only) |
| `users` | User accounts | 1 (metadata only) |
| `teams` | Team configurations | 1 (metadata only) |
| `app_settings` | Application settings | 1 (metadata only) |

## Vector Configuration

- **Distance Metric**: Cosine similarity
- **Embedding Model**: 
  - OpenAI: `text-embedding-3-small` (1536 dimensions)
  - Google: `text-embedding-004` (768 dimensions)

> [!NOTE]
> If using Google embeddings, the vector size will be automatically adjusted to 768 dimensions.

## Advantages of Qdrant Cloud

✅ **No Local Server Required** - Unlike ChromaDB, no need to run a local server  
✅ **Managed Service** - Automatic backups, scaling, and maintenance  
✅ **High Performance** - Optimized for fast similarity search  
✅ **Free Tier Available** - Great for development and small projects  
✅ **Production Ready** - Enterprise-grade reliability and security  

## Troubleshooting

### Connection Issues

If you see connection errors:

1. Verify your `QDRANT_URL` is correct (should start with `https://`)
2. Check your `QDRANT_API_KEY` is valid
3. Ensure your cluster is running in the Qdrant Cloud dashboard
4. Check firewall/network settings

### Collection Not Found

If collections are missing:

```bash
# Restart the application to recreate collections
npm run dev
```

### Performance Optimization

For large datasets:
- Use batch operations when adding multiple entries
- Consider using collection prefixes for multi-tenant setups
- Monitor your cluster usage in the Qdrant dashboard

## Migration from ChromaDB

If you're migrating from ChromaDB:

1. **Export your data** from ChromaDB (if needed)
2. Update your `.env` file with Qdrant credentials
3. Restart the application
4. Re-add your knowledge base entries via the admin portal

> [!WARNING]
> Existing ChromaDB data will NOT be automatically migrated. You'll need to re-import your knowledge base entries.

## Additional Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant Cloud Console](https://cloud.qdrant.io)
- [Qdrant API Reference](https://qdrant.tech/documentation/interfaces/)
