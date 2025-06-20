/**
 * Code Monitor Service
 * 
 * Monitors the SHAAD codebase for changes and triggers Discord notifications
 * Features:
 * - Real-time file watching
 * - Git commit detection
 * - Code diff analysis
 * - File type filtering
 */

import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'chokidar';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface CodeChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  content?: string;
  size?: number;
  timestamp: Date;
}

export interface GitCommitEvent {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  files: string[];
  additions: number;
  deletions: number;
}

export interface CodeMonitorOptions {
  projectPath: string;
  onFileChange?: (change: CodeChangeEvent) => Promise<void>;
  onGitCommit?: (commit: GitCommitEvent) => Promise<void>;
  excludePatterns?: string[];
  includeExtensions?: string[];
  maxFileSize?: number; // in bytes
  gitPollingInterval?: number; // in milliseconds
}

export class CodeMonitor extends EventEmitter {
  private watcher?: FSWatcher;
  private git?: SimpleGit;
  private options?: CodeMonitorOptions;
  private isRunning = false;
  private lastCommitHash?: string;
  private gitPollingTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  /**
   * Start monitoring the codebase
   */
  public async start(options: CodeMonitorOptions): Promise<void> {
    if (this.isRunning) {
      logger.warn('Code monitor is already running');
      return;
    }

    this.options = {
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '**/*.log',
        'logs/**',
        'tmp/**',
        '**/.DS_Store',
        'discord-bot/logs/**',
        'discord-bot/**/*.log'
      ],
      includeExtensions: [
        '.ts', '.js', '.tsx', '.jsx',
        '.json', '.md', '.yml', '.yaml',
        '.sql', '.env', '.sh', '.dockerfile',
        '.txt', '.log', '.py', '.rb', '.go',
        '.php', '.html', '.css', '.scss', '.less',
        '.xml', '.ini', '.conf', '.config'
      ],
      maxFileSize: 1024 * 1024, // 1MB
      gitPollingInterval: 30000, // 30 seconds
      ...options
    };

    try {
      logger.info(`Starting code monitor for: ${this.options.projectPath}`);

      // Initialize Git
      this.git = simpleGit(this.options.projectPath);
      await this.initializeGitMonitoring();

      // Start file watching
      await this.startFileWatching();

      this.isRunning = true;
      logger.info('✅ Code monitor started successfully');

    } catch (error) {
      logger.error('Failed to start code monitor:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping code monitor...');

    // Stop file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }

    // Stop Git polling
    if (this.gitPollingTimer) {
      clearInterval(this.gitPollingTimer);
      this.gitPollingTimer = undefined;
    }

    this.isRunning = false;
    logger.info('Code monitor stopped');
  }

  /**
   * Initialize Git monitoring
   */
  private async initializeGitMonitoring(): Promise<void> {
    if (!this.git || !this.options) return;

    try {
      // Get current commit hash
      const log = await this.git.log({ maxCount: 1 });
      this.lastCommitHash = log.latest?.hash;

      // Start polling for new commits
      this.gitPollingTimer = setInterval(
        () => this.checkForNewCommits(),
        this.options.gitPollingInterval
      );

      logger.info(`Git monitoring initialized, latest commit: ${this.lastCommitHash?.substring(0, 8)}`);
    } catch (error) {
      logger.warn('Git monitoring initialization failed (not a Git repo?):', error);
    }
  }

  /**
   * Check for new Git commits
   */
  private async checkForNewCommits(): Promise<void> {
    if (!this.git || !this.options) return;

    try {
      const log = await this.git.log({ maxCount: 10 });
      const commits = log.all;

      // Find new commits since last check
      const newCommits: GitCommitEvent[] = [];
      
      for (const commit of commits) {
        if (commit.hash === this.lastCommitHash) break;
        
        // Get commit details
        const commitDetails = await this.git.show([
          '--name-only',
          '--pretty=format:%H|%s|%an|%ae|%ai',
          commit.hash
        ]);

        const lines = commitDetails.split('\n');
        const [hash, message, author, email, date] = lines[0].split('|');
        const files = lines.slice(1).filter(line => line.trim());

        // Get stats
        const stats = await this.git.diffSummary([`${commit.hash}^`, commit.hash]);

        newCommits.push({
          hash,
          message,
          author,
          email,
          date: new Date(date),
          files,
          additions: stats.insertions || 0,
          deletions: stats.deletions || 0
        });
      }

      // Process new commits (newest first)
      for (const commit of newCommits.reverse()) {
        await this.handleGitCommit(commit);
      }

      // Update last commit hash
      if (newCommits.length > 0) {
        this.lastCommitHash = commits[0].hash;
      }

    } catch (error) {
      logger.error('Error checking for new commits:', error);
    }
  }

  /**
   * Start file watching
   */
  private async startFileWatching(): Promise<void> {
    if (!this.options) return;

    this.watcher = watch(this.options.projectPath, {
      ignored: this.options.excludePatterns,
      ignoreInitial: true,
      persistent: true,
      followSymlinks: false,
      atomic: true, // Wait for file write to complete
      awaitWriteFinish: {
        stabilityThreshold: 1000, // Wait 1 second for file to stabilize
        pollInterval: 100
      }
    });

    // Handle file events
    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => logger.error('File watcher error:', error));

    logger.info('File watching started');
  }

  /**
   * Handle file system events
   */
  private async handleFileEvent(type: 'add' | 'change' | 'unlink', filePath: string): Promise<void> {
    if (!this.options) return;

    try {
      // Convert to relative path
      const relativePath = path.relative(this.options.projectPath, filePath);

      // Check if file extension is included
      if (this.options.includeExtensions) {
        const ext = path.extname(relativePath).toLowerCase();
        if (!this.options.includeExtensions.includes(ext)) {
          return; // Skip files with non-included extensions
        }
      }

      // Create change event
      const changeEvent: CodeChangeEvent = {
        type,
        path: relativePath,
        timestamp: new Date()
      };

      // Add file content for small files (for preview)
      if (type !== 'unlink') {
        try {
          const stats = await fs.stat(filePath);
          changeEvent.size = stats.size;

          // Only include content for small files
          if (stats.size <= (this.options.maxFileSize || 1024 * 1024)) {
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Only include if it's text content (basic check)
            if (this.isTextFile(content)) {
              changeEvent.content = content;
            }
          }
        } catch (error) {
          // File might have been deleted between events
          logger.debug(`Could not read file ${filePath}:`, error);
        }
      }

      await this.handleFileChange(changeEvent);

    } catch (error) {
      logger.error(`Error handling file event for ${filePath}:`, error);
    }
  }

  /**
   * Handle file change event
   */
  private async handleFileChange(change: CodeChangeEvent): Promise<void> {
    this.emit('fileChange', change);

    if (this.options?.onFileChange) {
      try {
        await this.options.onFileChange(change);
      } catch (error) {
        logger.error('Error in file change handler:', error);
      }
    }
  }

  /**
   * Handle Git commit event
   */
  private async handleGitCommit(commit: GitCommitEvent): Promise<void> {
    this.emit('gitCommit', commit);

    if (this.options?.onGitCommit) {
      try {
        await this.options.onGitCommit(commit);
      } catch (error) {
        logger.error('Error in Git commit handler:', error);
      }
    }

    logger.info(`New commit detected: ${commit.hash.substring(0, 8)} - ${commit.message}`);
  }

  /**
   * Check if content appears to be text
   */
  private isTextFile(content: string): boolean {
    // Basic check for binary content
    const nonTextChars = /[\x00-\x08\x0E-\x1F\x7F]/;
    return !nonTextChars.test(content.substring(0, 1000));
  }

  /**
   * Get monitoring status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      projectPath: this.options?.projectPath,
      lastCommitHash: this.lastCommitHash?.substring(0, 8),
      watchedExtensions: this.options?.includeExtensions,
      excludePatterns: this.options?.excludePatterns
    };
  }
}