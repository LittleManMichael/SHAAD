#!/bin/bash

# n8n credentials
N8N_URL="http://n8n.myshaad.com"
N8N_USER="admin"
N8N_PASS="n8nTh3T3chG4m310!!!"

echo "Importing workflows to n8n..."

# Function to import a workflow
import_workflow() {
    local file=$1
    local name=$(basename "$file" .json)
    
    echo "Importing $name..."
    
    # Read the workflow JSON
    workflow_json=$(cat "$file")
    
    # Create the workflow via API
    curl -X POST "$N8N_URL/api/v1/workflows" \
        -u "$N8N_USER:$N8N_PASS" \
        -H "Content-Type: application/json" \
        -d "$workflow_json" \
        --silent \
        --show-error
    
    if [ $? -eq 0 ]; then
        echo "✓ Successfully imported $name"
    else
        echo "✗ Failed to import $name"
    fi
    echo ""
}

# Import each workflow
for workflow in /home/shaad/ai-assistant-dashboard/n8n-workflows/*.json; do
    if [ -f "$workflow" ]; then
        import_workflow "$workflow"
    fi
done

echo "Import complete!"