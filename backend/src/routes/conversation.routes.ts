import express from 'express';
import { body, param, query } from 'express-validator';
import { ConversationController } from '@/controllers/conversation.controller';
import { MessageController } from '@/controllers/message.controller';
import { authMiddleware } from '@/middleware/auth.middleware';

const router = express.Router();

// All conversation routes require authentication
router.use(authMiddleware);

// Conversation routes
router.get('/', ConversationController.getConversations);

router.get('/:id', 
  param('id').isUUID().withMessage('Invalid conversation ID'),
  ConversationController.getConversation
);

router.post('/',
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('context').optional().isObject(),
  ConversationController.createConversation
);

router.put('/:id',
  param('id').isUUID().withMessage('Invalid conversation ID'),
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('context').optional().isObject(),
  ConversationController.updateConversation
);

router.delete('/:id',
  param('id').isUUID().withMessage('Invalid conversation ID'),
  ConversationController.deleteConversation
);

// Message routes
router.post('/:conversationId/messages',
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  body('content').isString().trim().notEmpty().withMessage('Message content is required'),
  MessageController.sendMessage
);

router.get('/:conversationId/messages',
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  MessageController.getMessages
);

router.delete('/:conversationId/messages/:messageId',
  param('conversationId').isUUID().withMessage('Invalid conversation ID'),
  param('messageId').isUUID().withMessage('Invalid message ID'),
  MessageController.deleteMessage
);

export default router;