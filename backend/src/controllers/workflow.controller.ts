import { Request, Response } from 'express';
import { N8NService } from '@/services/n8n.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validationResult } from 'express-validator';

const n8nService = new N8NService();

export class WorkflowController {
  // Execute a workflow
  async executeWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { workflowName, inputData } = req.body;
      const userId = (req as any).user.id;

      const result = await n8nService.executeWorkflow(
        workflowName,
        inputData,
        userId
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Execute workflow error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute workflow'
      });
    }
  }

  // Get available workflows
  async getAvailableWorkflows(req: Request, res: Response): Promise<Response> {
    try {
      const workflows = await n8nService.getAvailableWorkflows();
      
      return res.json({
        success: true,
        data: workflows
      });
    } catch (error) {
      console.error('Get workflows error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflows'
      });
    }
  }

  // Get execution history
  async getExecutionHistory(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await n8nService.getExecutionHistory(userId, limit);
      
      return res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get execution history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve execution history'
      });
    }
  }

  // Webhook endpoint for n8n to callback
  async handleWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const { workflowId, conversationId, message, userId } = req.body;

      // Process webhook data
      console.log('Received n8n webhook:', {
        workflowId,
        conversationId,
        message,
        userId
      });

      // You can add custom logic here to handle the webhook
      // For example, update conversation status, send notifications, etc.

      return res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process webhook'
      });
    }
  }
}