import axios, { AxiosInstance } from 'axios';
import { pool } from '@/config/database';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'waiting' | 'running' | 'success' | 'failed';
  data?: any;
  error?: string;
}

export class N8NService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = `http://${process.env.N8N_HOST || 'localhost'}:${process.env.N8N_PORT || '5678'}`;
    
    // n8n can use API key or basic auth
    const username = process.env.N8N_BASIC_AUTH_USER;
    const password = process.env.N8N_BASIC_AUTH_PASSWORD;
    this.apiKey = process.env.N8N_API_KEY || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
      },
      ...(username && password && {
        auth: {
          username,
          password
        }
      })
    });
  }

  // Execute a workflow by name or ID
  async executeWorkflow(
    workflowName: string,
    inputData: any,
    userId: string
  ): Promise<WorkflowExecution> {
    const startTime = Date.now();
    
    try {
      // First, get workflow ID by name
      const workflowId = await this.getWorkflowIdByName(workflowName);
      
      if (!workflowId) {
        throw new Error(`Workflow '${workflowName}' not found`);
      }

      // Store execution record
      const executionRecord = await pool.query(
        `INSERT INTO workflow_executions 
         (user_id, workflow_name, n8n_execution_id, status, input_data, started_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, workflowName, null, 'pending', inputData]
      );
      const dbExecutionId = executionRecord.rows[0].id;

      // Execute workflow
      const response = await this.client.post(
        `/api/v1/workflows/${workflowId}/execute`,
        {
          data: inputData
        }
      );

      const executionId = response.data.data.executionId;

      // Update with n8n execution ID
      await pool.query(
        `UPDATE workflow_executions 
         SET n8n_execution_id = $1, status = 'running'
         WHERE id = $2`,
        [executionId, dbExecutionId]
      );

      // Poll for completion
      const result = await this.pollExecutionStatus(executionId);
      
      // Update final status
      const duration = Date.now() - startTime;
      await pool.query(
        `UPDATE workflow_executions 
         SET status = $1, output_data = $2, error_message = $3, 
             completed_at = CURRENT_TIMESTAMP, duration_ms = $4
         WHERE id = $5`,
        [
          result.status,
          result.data || {},
          result.error || null,
          duration,
          dbExecutionId
        ]
      );

      return result;
    } catch (error) {
      // Log error in database
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await pool.query(
        `UPDATE workflow_executions 
         SET status = 'failed', error_message = $1, 
             completed_at = CURRENT_TIMESTAMP, duration_ms = $2
         WHERE user_id = $3 AND workflow_name = $4 AND status IN ('pending', 'running')
         ORDER BY started_at DESC LIMIT 1`,
        [errorMessage, duration, userId, workflowName]
      );

      throw error;
    }
  }

  // Get workflow ID by name
  private async getWorkflowIdByName(name: string): Promise<string | null> {
    try {
      const response = await this.client.get('/api/v1/workflows');
      const workflows = response.data.data;
      
      const workflow = workflows.find((w: any) => 
        w.name === name || w.name.toLowerCase() === name.toLowerCase()
      );
      
      return workflow ? workflow.id : null;
    } catch (error) {
      console.error('Failed to get workflows:', error);
      return null;
    }
  }

  // Poll execution status until completion
  private async pollExecutionStatus(
    executionId: string,
    maxAttempts: number = 60,
    intervalMs: number = 1000
  ): Promise<WorkflowExecution> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.client.get(`/api/v1/executions/${executionId}`);
        const execution = response.data.data;
        
        if (execution.finished) {
          return {
            id: execution.id,
            workflowId: execution.workflowId,
            status: execution.stoppedAt ? 'failed' : 'success',
            data: execution.data,
            error: execution.error
          };
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error('Error polling execution:', error);
      }
    }
    
    throw new Error('Workflow execution timeout');
  }

  // Get available workflows
  async getAvailableWorkflows(): Promise<Array<{
    id: string;
    name: string;
    active: boolean;
    tags: string[];
  }>> {
    try {
      const response = await this.client.get('/api/v1/workflows');
      return response.data.data.map((w: any) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        tags: w.tags || []
      }));
    } catch (error) {
      console.error('Failed to get workflows:', error);
      return [];
    }
  }

  // Create a new workflow
  async createWorkflow(workflowData: any): Promise<string> {
    try {
      const response = await this.client.post('/api/v1/workflows', workflowData);
      return response.data.data.id;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw new Error('Failed to create workflow');
    }
  }

  // Get workflow execution history
  async getExecutionHistory(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT id, workflow_name, status, input_data, output_data, 
              error_message, started_at, completed_at, duration_ms
       FROM workflow_executions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }
}