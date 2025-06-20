/**
 * Webhook Service
 * 
 * HTTP server for receiving webhooks from external services
 * Allows integration with CI/CD, GitHub, etc.
 */

import express, { Request, Response } from 'express';
import { createServer, Server } from 'http';
import { logger } from '../utils/logger';

export interface WebhookEvent {
  source: string;
  event: string;
  data: any;
  timestamp: Date;
  headers: Record<string, string>;
}

export interface WebhookServiceOptions {
  port: number;
  onWebhook?: (webhook: WebhookEvent) => Promise<void>;
  secret?: string;
}

export class WebhookService {
  private app: express.Application;
  private server?: Server;
  private options?: WebhookServiceOptions;
  private isRunning = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));
    
    // Basic logging
    this.app.use((req, res, next) => {
      logger.debug(`Webhook ${req.method} ${req.path} from ${req.ip}`);
      next();
    });
  }

  /**
   * Setup webhook routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'SHAAD Discord Webhook Service',
        timestamp: new Date().toISOString()
      });
    });

    // Generic webhook endpoint
    this.app.post('/webhook/:source', async (req, res) => {
      await this.handleWebhook(req, res, req.params.source);
    });

    // GitHub webhook
    this.app.post('/github', async (req, res) => {
      await this.handleGitHubWebhook(req, res);
    });

    // Docker Hub webhook
    this.app.post('/dockerhub', async (req, res) => {
      await this.handleDockerHubWebhook(req, res);
    });

    // CI/CD webhook
    this.app.post('/ci/:provider', async (req, res) => {
      await this.handleCIWebhook(req, res, req.params.provider);
    });

    // Custom SHAAD webhook
    this.app.post('/shaad/:event', async (req, res) => {
      await this.handleShaadWebhook(req, res, req.params.event);
    });

    // Catch-all for other webhooks
    this.app.all('*', (req, res) => {
      logger.warn(`Unknown webhook endpoint: ${req.method} ${req.path}`);
      res.status(404).json({
        error: 'Webhook endpoint not found',
        path: req.path
      });
    });
  }

  /**
   * Start the webhook service
   */
  public async start(options: WebhookServiceOptions): Promise<void> {
    if (this.isRunning) {
      logger.warn('Webhook service is already running');
      return;
    }

    this.options = options;

    try {
      this.server = createServer(this.app);
      
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(options.port, () => {
          logger.info(`✅ Webhook service started on port ${options.port}`);
          this.isRunning = true;
          resolve();
        });

        this.server!.on('error', reject);
      });

    } catch (error) {
      logger.error('Failed to start webhook service:', error);
      throw error;
    }
  }

  /**
   * Stop the webhook service
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) return;

    return new Promise<void>((resolve) => {
      this.server!.close(() => {
        logger.info('Webhook service stopped');
        this.isRunning = false;
        resolve();
      });
    });
  }

  /**
   * Handle generic webhook
   */
  private async handleWebhook(req: Request, res: Response, source: string): Promise<void> {
    try {
      const webhook: WebhookEvent = {
        source,
        event: req.headers['x-event-type'] as string || 'unknown',
        data: req.body,
        timestamp: new Date(),
        headers: this.sanitizeHeaders(req.headers)
      };

      await this.processWebhook(webhook);

      res.json({
        success: true,
        message: 'Webhook received',
        timestamp: webhook.timestamp
      });

    } catch (error) {
      logger.error(`Error processing webhook from ${source}:`, error);
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }

  /**
   * Handle GitHub webhook
   */
  private async handleGitHubWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.headers['x-github-event'] as string;
      const signature = req.headers['x-hub-signature-256'] as string;

      // Verify signature if secret is configured
      if (this.options?.secret && signature) {
        const isValid = this.verifyGitHubSignature(JSON.stringify(req.body), signature, this.options.secret);
        if (!isValid) {
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      const webhook: WebhookEvent = {
        source: 'github',
        event,
        data: req.body,
        timestamp: new Date(),
        headers: this.sanitizeHeaders(req.headers)
      };

      await this.processWebhook(webhook);

      res.json({ success: true });

    } catch (error) {
      logger.error('Error processing GitHub webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle Docker Hub webhook
   */
  private async handleDockerHubWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhook: WebhookEvent = {
        source: 'dockerhub',
        event: 'push',
        data: req.body,
        timestamp: new Date(),
        headers: this.sanitizeHeaders(req.headers)
      };

      await this.processWebhook(webhook);

      res.json({ success: true });

    } catch (error) {
      logger.error('Error processing Docker Hub webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle CI/CD webhook
   */
  private async handleCIWebhook(req: Request, res: Response, provider: string): Promise<void> {
    try {
      const webhook: WebhookEvent = {
        source: `ci-${provider}`,
        event: req.headers['x-event-type'] as string || 'build',
        data: req.body,
        timestamp: new Date(),
        headers: this.sanitizeHeaders(req.headers)
      };

      await this.processWebhook(webhook);

      res.json({ success: true });

    } catch (error) {
      logger.error(`Error processing ${provider} CI webhook:`, error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle SHAAD-specific webhook
   */
  private async handleShaadWebhook(req: Request, res: Response, event: string): Promise<void> {
    try {
      const webhook: WebhookEvent = {
        source: 'shaad',
        event,
        data: req.body,
        timestamp: new Date(),
        headers: this.sanitizeHeaders(req.headers)
      };

      await this.processWebhook(webhook);

      res.json({ success: true });

    } catch (error) {
      logger.error(`Error processing SHAAD webhook (${event}):`, error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Process webhook event
   */
  private async processWebhook(webhook: WebhookEvent): Promise<void> {
    logger.info(`Processing webhook: ${webhook.source}/${webhook.event}`);

    if (this.options?.onWebhook) {
      try {
        await this.options.onWebhook(webhook);
      } catch (error) {
        logger.error('Error in webhook handler:', error);
        throw error;
      }
    }
  }

  /**
   * Verify GitHub webhook signature
   */
  private verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')}`;
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error verifying GitHub signature:', error);
      return false;
    }
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        // Exclude sensitive headers
        if (!key.toLowerCase().includes('authorization') && 
            !key.toLowerCase().includes('secret') &&
            !key.toLowerCase().includes('token')) {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Get service status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.options?.port,
      hasSecret: !!this.options?.secret
    };
  }
}