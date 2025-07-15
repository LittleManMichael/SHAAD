# n8n Setup Guide for SHAAD Integration

## Access n8n Interface

1. Open your browser and navigate to: http://n8n.myshaad.com
2. Login with:
   - Username: `admin`
   - Password: `n8nTh3T3chG4m310!!!`

## Initial Setup Steps

### 1. Create PostgreSQL Credentials

1. Go to Credentials (left sidebar)
2. Click "Add credential"
3. Search for "PostgreSQL"
4. Configure with:
   - Host: `postgres`
   - Database: `shaad_db`
   - User: `shaad_user`
   - Password: `PTh3T3chG4m310!!!`
   - Port: `5432`
   - SSL: Disable
5. Name it: "SHAAD PostgreSQL"
6. Save

### 2. Create HTTP Header Auth Credentials

1. Add new credential
2. Search for "Header Auth"
3. Configure with:
   - Name: `Authorization`
   - Value: `Bearer YOUR_JWT_TOKEN` (get from SHAAD login)
4. Name it: "SHAAD API Auth"
5. Save

### 3. Import Example Workflows

1. Go to Workflows
2. Click "Add workflow" → "Import from file"
3. Import these workflows:
   - `shaad-webhook-example.json` - Basic webhook integration
   - `ai-content-generator.json` - AI content generation
   - `database-automation.json` - Scheduled database tasks

## Webhook URLs

After importing workflows, your webhook URLs will be:

- **AI Trigger**: `http://n8n.myshaad.com/webhook/shaad-ai-trigger`
- **Content Generation**: `http://n8n.myshaad.com/webhook/generate-content`

## Integration with SHAAD

### Backend Integration

The SHAAD backend can trigger n8n workflows using:

```typescript
// Example: Trigger n8n workflow from SHAAD
const response = await fetch('http://n8n.myshaad.com/webhook/shaad-ai-trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    workflowId: 'workflow-123',
    conversationId: conversationId,
    message: userMessage,
    userId: userId
  })
});
```

### Available Workflow Types

1. **Webhook Workflows**: Triggered by HTTP requests from SHAAD
2. **Scheduled Workflows**: Run periodically (analytics, cleanup, etc.)
3. **Event-Based Workflows**: Trigger on database changes or AI responses

## Common Use Cases

### 1. AI-Powered Content Generation
- Trigger: User request via SHAAD
- Process: Call AI API → Format response → Store in database
- Output: Return formatted content to user

### 2. Conversation Analytics
- Trigger: Scheduled (every 6 hours)
- Process: Query database → Calculate metrics → Store results
- Output: Analytics dashboard data

### 3. Multi-Step AI Workflows
- Trigger: Complex user request
- Process: Claude analysis → OpenAI enhancement → Quality check
- Output: High-quality AI response

## Testing Workflows

1. Open a workflow in n8n
2. Click "Execute Workflow" to test
3. Use the "Test webhook" option for webhook-triggered flows
4. Check execution history for debugging

## Production Considerations

1. **Authentication**: Always use proper authentication for webhooks
2. **Error Handling**: Add error nodes to handle failures gracefully
3. **Rate Limiting**: Implement rate limiting for public webhooks
4. **Monitoring**: Use n8n's built-in monitoring for workflow health

## Next Steps

1. Create custom workflows for your specific use cases
2. Set up proper authentication between SHAAD and n8n
3. Configure webhook URLs in SHAAD backend
4. Test end-to-end integration