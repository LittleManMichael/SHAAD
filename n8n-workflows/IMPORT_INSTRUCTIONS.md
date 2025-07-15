# Manual Workflow Import Instructions

Since n8n requires API key authentication which needs to be configured in the n8n UI first, please follow these manual steps:

## Step 1: Access n8n
1. Open http://localhost:5678 in your browser
2. Login with:
   - Username: `admin`
   - Password: `n8nTh3T3chG4m310!!!`

## Step 2: Import Each Workflow

### For each workflow file:

1. **In n8n interface:**
   - Click the "Add workflow" button (+ icon) in the left sidebar
   - This creates a new empty workflow

2. **Import the workflow:**
   - Click the three dots menu (⋮) in the top right corner
   - Select "Import from File"
   - Navigate to `/home/shaad/ai-assistant-dashboard/n8n-workflows/`
   - Select one of these files:
     - `shaad-webhook-example.json`
     - `ai-content-generator.json`
     - `database-automation.json`

3. **Save the workflow:**
   - After import, click "Save" button
   - The workflow is now imported!

4. **Activate the workflow (if needed):**
   - Toggle the "Active" switch in the top bar
   - This enables webhook triggers

## Step 3: Configure Credentials

After importing workflows, you need to set up credentials:

### PostgreSQL Credentials:
1. Go to "Credentials" in the left sidebar
2. Click "Add credential"
3. Search and select "PostgreSQL"
4. Configure:
   - **Host**: `postgres` (or `localhost` if running n8n outside Docker)
   - **Database**: `shaad_db`
   - **User**: `shaad_user`
   - **Password**: `PTh3T3chG4m310!!!`
   - **Port**: `5432`
   - **SSL**: Disable
5. Name it: "SHAAD PostgreSQL"
6. Click "Create"

### HTTP Header Auth (for API calls):
1. Add new credential
2. Search "Header Auth"
3. Configure:
   - **Name**: `Authorization`
   - **Value**: `Bearer <YOUR_JWT_TOKEN>`
4. Name it: "SHAAD API Auth"
5. Click "Create"

## Step 4: Update Workflow Credentials

For workflows that need credentials:
1. Open the workflow
2. Click on nodes that show credential errors (red)
3. Select the appropriate credential from dropdown
4. Save the workflow

## Webhook URLs After Import

Once imported and activated, your webhooks will be available at:

- **SHAAD AI Trigger**: `http://localhost:5678/webhook/shaad-ai-trigger`
- **Content Generation**: `http://localhost:5678/webhook/generate-content`

## Testing Workflows

1. Open a workflow
2. Click "Execute Workflow" button
3. For webhook workflows:
   - Click on the Webhook node
   - Click "Listen for Test Event"
   - Send a test request to the webhook URL
   - Stop listening after test

## Next Steps

1. Create custom workflows for your specific use cases
2. Set up error handling nodes
3. Configure email/notification nodes for alerts
4. Explore n8n's extensive node library