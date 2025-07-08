import { Router } from 'express';
import { WorkflowController } from '@/controllers/workflow.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import { body, query } from 'express-validator';

const router = Router();
const workflowController = new WorkflowController();

// Execute a workflow
router.post(
  '/execute',
  authMiddleware,
  [
    body('workflowName').notEmpty().withMessage('Workflow name is required'),
    body('inputData').isObject().withMessage('Input data must be an object')
  ],
  workflowController.executeWorkflow
);

// Get available workflows
router.get(
  '/available',
  authMiddleware,
  workflowController.getAvailableWorkflows
);

// Get execution history
router.get(
  '/history',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  workflowController.getExecutionHistory
);

// Webhook endpoint (no auth required for n8n callbacks)
router.post(
  '/webhook',
  workflowController.handleWebhook
);

export default router;