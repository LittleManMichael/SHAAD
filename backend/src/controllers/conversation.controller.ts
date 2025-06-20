import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { pool } from '@/config/database';
import { AuthRequest } from '@/types/auth';
import { v4 as uuidv4 } from 'uuid';

export class ConversationController {
  // Get all conversations for the authenticated user
  static async getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      const result = await pool.query(
        `SELECT id, title, context, is_active, created_at, updated_at
         FROM conversations
         WHERE user_id = $1 AND is_active = true
         ORDER BY updated_at DESC`,
        [userId]
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a specific conversation with messages
  static async getConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Get conversation
      const conversationResult = await pool.query(
        `SELECT id, title, context, is_active, created_at, updated_at
         FROM conversations
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [id, userId]
      );
      
      if (conversationResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }
      
      // Get messages
      const messagesResult = await pool.query(
        `SELECT id, role, content, metadata, tokens_used, ai_provider, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [id]
      );
      
      res.json({
        success: true,
        data: {
          ...conversationResult.rows[0],
          messages: messagesResult.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create a new conversation
  static async createConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
        return;
      }
      
      const { title, context } = req.body;
      const userId = req.user?.id;
      
      const result = await pool.query(
        `INSERT INTO conversations (user_id, title, context)
         VALUES ($1, $2, $3)
         RETURNING id, title, context, is_active, created_at, updated_at`,
        [userId, title || 'New Conversation', context || {}]
      );
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  // Update conversation
  static async updateConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
        return;
      }
      
      const { id } = req.params;
      const { title, context } = req.body;
      const userId = req.user?.id;
      
      const result = await pool.query(
        `UPDATE conversations
         SET title = COALESCE($1, title),
             context = COALESCE($2, context),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4 AND is_active = true
         RETURNING id, title, context, is_active, created_at, updated_at`,
        [title, context, id, userId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete (soft delete) conversation
  static async deleteConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await pool.query(
        `UPDATE conversations
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_active = true
         RETURNING id`,
        [id, userId]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}