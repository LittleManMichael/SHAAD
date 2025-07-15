import express from 'express';
import authRoutes from './auth';
import conversationRoutes from './conversation.routes';
import workflowRoutes from './workflow.routes';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/conversations', conversationRoutes);
router.use('/workflows', workflowRoutes);

export default router;