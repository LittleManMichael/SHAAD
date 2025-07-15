import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { pool } from '@/config/database';
import { AuthRequest } from '@/types/auth';
import { AIOrchestrator } from '@/services/ai/orchestrator.service';

export class MessageController {
  // Send a message to the AI assistant
  static async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
        return;
      }
      
      const { conversationId } = req.params;
      const { content, model } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
        return;
      }
      
      // Verify conversation ownership
      const conversationResult = await pool.query(
        `SELECT id FROM conversations
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [conversationId, userId]
      );
      
      if (conversationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }
      
      // Save user message
      const userMessageResult = await pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)
         RETURNING id, role, content, created_at`,
        [conversationId, content]
      );
      
      // Get conversation history
      const historyResult = await pool.query(
        `SELECT role, content, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT 50`,
        [conversationId]
      );
      
      // Process with AI orchestrator
      const orchestrator = new AIOrchestrator();
      const aiResponse = await orchestrator.processMessage(
        content,
        historyResult.rows,
        userId,
        model || 'claude' // Default to Claude if not specified
      );
      
      // Save AI response
      const aiMessageResult = await pool.query(
        `INSERT INTO messages (conversation_id, role, content, metadata, tokens_used, ai_provider)
         VALUES ($1, 'assistant', $2, $3, $4, $5)
         RETURNING id, role, content, metadata, tokens_used, ai_provider, created_at`,
        [
          conversationId,
          aiResponse.content,
          aiResponse.metadata || {},
          aiResponse.tokensUsed || 0,
          aiResponse.provider || 'claude'
        ]
      );
      
      // Update conversation
      await pool.query(
        `UPDATE conversations
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [conversationId]
      );
      
      res.json({
        success: true,
        data: {
          userMessage: userMessageResult.rows[0],
          assistantMessage: aiMessageResult.rows[0]
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get messages for a conversation
  static async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.id;
      const { limit = 50, offset = 0 } = req.query;
      
      // Verify conversation ownership
      const conversationResult = await pool.query(
        `SELECT id FROM conversations
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [conversationId, userId]
      );
      
      if (conversationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }
      
      // Get messages with pagination
      const messagesResult = await pool.query(
        `SELECT id, role, content, metadata, tokens_used, ai_provider, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset]
      );
      
      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM messages
         WHERE conversation_id = $1`,
        [conversationId]
      );
      
      res.json({
        success: true,
        data: {
          messages: messagesResult.rows.reverse(), // Reverse to get chronological order
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a message
  static async deleteMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId, messageId } = req.params;
      const userId = req.user?.id;
      
      // Verify conversation ownership
      const conversationResult = await pool.query(
        `SELECT id FROM conversations
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [conversationId, userId]
      );
      
      if (conversationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }
      
      // Delete message
      const result = await pool.query(
        `DELETE FROM messages
         WHERE id = $1 AND conversation_id = $2
         RETURNING id`,
        [messageId, conversationId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}