/**
 * System Monitor Service
 * 
 * Monitors system health and performance metrics
 * Sends alerts for critical issues
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface SystemAlert {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      percentage: number;
      loadAverage: number[];
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  timestamp: Date;
}

export interface SystemMonitorOptions {
  onSystemAlert?: (alert: SystemAlert) => Promise<void>;
  onHealthCheck?: (health: HealthCheckResult) => Promise<void>;
  checkInterval?: number;
  alertThresholds?: {
    memory: number;
    cpu: number;
    disk: number;
  };
}

export class SystemMonitor extends EventEmitter {
  private options?: SystemMonitorOptions;
  private isRunning = false;
  private checkTimer?: NodeJS.Timeout;
  private lastHealthStatus?: 'healthy' | 'degraded' | 'unhealthy';
  private alertHistory: Map<string, Date> = new Map();

  constructor() {
    super();
  }

  /**
   * Start system monitoring
   */
  public async start(options: SystemMonitorOptions): Promise<void> {
    if (this.isRunning) {
      logger.warn('System monitor is already running');
      return;
    }

    this.options = {
      checkInterval: 60000, // 1 minute
      alertThresholds: {
        memory: 85, // 85%
        cpu: 80,    // 80%
        disk: 90    // 90%
      },
      ...options
    };

    try {
      logger.info('Starting system monitor...');

      // Perform initial health check
      await this.performHealthCheck();

      // Start periodic monitoring
      this.checkTimer = setInterval(
        () => this.performHealthCheck(),
        this.options.checkInterval
      );

      this.isRunning = true;
      logger.info('✅ System monitor started successfully');

    } catch (error) {
      logger.error('Failed to start system monitor:', error);
      throw error;
    }
  }

  /**
   * Stop system monitoring
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping system monitor...');

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }

    this.isRunning = false;
    logger.info('System monitor stopped');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.gatherHealthMetrics();
      
      // Check for alerts
      await this.checkAlertConditions(health);
      
      // Send health update if status changed
      if (health.status !== this.lastHealthStatus) {
        await this.sendHealthUpdate(health);
        this.lastHealthStatus = health.status;
      }

      this.emit('healthCheck', health);

      if (this.options?.onHealthCheck) {
        await this.options.onHealthCheck(health);
      }

    } catch (error) {
      logger.error('Health check failed:', error);
      
      await this.sendAlert({
        level: 'error',
        title: 'Health Check Failed',
        message: 'System health monitoring encountered an error',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date()
      });
    }
  }

  /**
   * Gather system health metrics
   */
  private async gatherHealthMetrics(): Promise<HealthCheckResult> {
    const startTime = process.hrtime();

    // Memory metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // CPU metrics
    const loadAverage = os.loadavg();
    const cpuPercentage = await this.getCpuUsage();

    // Disk metrics
    const diskUsage = await this.getDiskUsage();

    // Service checks
    const services = await this.checkServices();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (memoryPercentage > 95 || cpuPercentage > 95 || diskUsage.percentage > 95) {
      status = 'unhealthy';
    } else if (
      memoryPercentage > (this.options?.alertThresholds?.memory || 85) ||
      cpuPercentage > (this.options?.alertThresholds?.cpu || 80) ||
      diskUsage.percentage > (this.options?.alertThresholds?.disk || 90)
    ) {
      status = 'degraded';
    }

    // Check if any critical services are down
    const criticalServicesDown = Object.values(services).some(status => !status);
    if (criticalServicesDown) {
      status = status === 'healthy' ? 'degraded' : 'unhealthy';
    }

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    return {
      status,
      services,
      metrics: {
        uptime: os.uptime(),
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage
        },
        cpu: {
          percentage: cpuPercentage,
          loadAverage
        },
        disk: diskUsage
      },
      timestamp: new Date()
    };
  }

  /**
   * Get CPU usage percentage
   */
  private async getCpuUsage(): Promise<number> {
    try {
      // Use top command to get CPU usage
      const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
      const cpuUsage = parseFloat(stdout.trim());
      return isNaN(cpuUsage) ? 0 : cpuUsage;
    } catch (error) {
      // Fallback method using /proc/stat on Linux
      try {
        const stat1 = await this.readCpuStat();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const stat2 = await this.readCpuStat();
        
        const idle1 = stat1.idle + stat1.iowait;
        const idle2 = stat2.idle + stat2.iowait;
        
        const total1 = Object.values(stat1).reduce((a, b) => a + b, 0);
        const total2 = Object.values(stat2).reduce((a, b) => a + b, 0);
        
        const totalDiff = total2 - total1;
        const idleDiff = idle2 - idle1;
        
        return totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
      } catch {
        return 0;
      }
    }
  }

  /**
   * Read CPU statistics from /proc/stat
   */
  private async readCpuStat(): Promise<Record<string, number>> {
    try {
      const content = await fs.readFile('/proc/stat', 'utf-8');
      const line = content.split('\n')[0];
      const values = line.split(/\s+/).slice(1).map(Number);
      
      return {
        user: values[0] || 0,
        nice: values[1] || 0,
        system: values[2] || 0,
        idle: values[3] || 0,
        iowait: values[4] || 0,
        irq: values[5] || 0,
        softirq: values[6] || 0,
        steal: values[7] || 0
      };
    } catch {
      return { user: 0, nice: 0, system: 0, idle: 0, iowait: 0, irq: 0, softirq: 0, steal: 0 };
    }
  }

  /**
   * Get disk usage
   */
  private async getDiskUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $3 \", \" $2 \", \" $5}'");
      const [used, total, percentage] = stdout.trim().split(', ');
      
      return {
        used: this.parseSize(used),
        total: this.parseSize(total),
        percentage: parseInt(percentage.replace('%', ''))
      };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Parse disk size string (e.g., "1.5G" -> bytes)
   */
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^([\d.]+)([KMGT])?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return value * (units[unit] || 1);
  }

  /**
   * Check status of critical services
   */
  private async checkServices(): Promise<Record<string, boolean>> {
    const services: Record<string, boolean> = {};

    // Check SHAAD backend
    try {
      const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health');
      services.shaad_backend = stdout.trim() === '200';
    } catch {
      services.shaad_backend = false;
    }

    // Check PostgreSQL (via backend health endpoint which includes DB check)
    // Since pg_isready is not available, we rely on the backend health check
    // which already verifies PostgreSQL connectivity
    services.postgresql = services.shaad_backend; // If backend is up, PostgreSQL is working

    // Check Redis
    try {
      const { stdout } = await execAsync('redis-cli -h localhost -p 6379 ping');
      services.redis = stdout.trim() === 'PONG';
    } catch {
      services.redis = false;
    }

    // Check Nginx
    try {
      const { stdout } = await execAsync('systemctl is-active nginx');
      services.nginx = stdout.trim() === 'active';
    } catch {
      services.nginx = false;
    }

    return services;
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(health: HealthCheckResult): Promise<void> {
    const thresholds = this.options?.alertThresholds || { memory: 85, cpu: 80, disk: 90 };

    // Memory alert
    if (health.metrics.memory.percentage > thresholds.memory) {
      await this.sendAlert({
        level: health.metrics.memory.percentage > 95 ? 'critical' : 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is at ${health.metrics.memory.percentage.toFixed(1)}%`,
        details: health.metrics.memory,
        timestamp: new Date()
      });
    }

    // CPU alert
    if (health.metrics.cpu.percentage > thresholds.cpu) {
      await this.sendAlert({
        level: health.metrics.cpu.percentage > 95 ? 'critical' : 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is at ${health.metrics.cpu.percentage.toFixed(1)}%`,
        details: health.metrics.cpu,
        timestamp: new Date()
      });
    }

    // Disk alert
    if (health.metrics.disk.percentage > thresholds.disk) {
      await this.sendAlert({
        level: health.metrics.disk.percentage > 98 ? 'critical' : 'warning',
        title: 'Low Disk Space',
        message: `Disk usage is at ${health.metrics.disk.percentage}%`,
        details: health.metrics.disk,
        timestamp: new Date()
      });
    }

    // Service alerts
    for (const [service, isUp] of Object.entries(health.services)) {
      if (!isUp) {
        await this.sendAlert({
          level: 'error',
          title: 'Service Down',
          message: `Service ${service} is not responding`,
          details: { service, status: 'down' },
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Send system alert (with rate limiting)
   */
  private async sendAlert(alert: SystemAlert): Promise<void> {
    // Rate limiting: don't send same alert more than once per hour
    const alertKey = `${alert.title}-${alert.level}`;
    const lastSent = this.alertHistory.get(alertKey);
    const now = new Date();
    
    if (lastSent && (now.getTime() - lastSent.getTime()) < 3600000) { // 1 hour
      return; // Skip duplicate alert
    }
    
    this.alertHistory.set(alertKey, now);

    this.emit('systemAlert', alert);

    if (this.options?.onSystemAlert) {
      try {
        await this.options.onSystemAlert(alert);
      } catch (error) {
        logger.error('Error in system alert handler:', error);
      }
    }

    logger.warn(`System alert [${alert.level.toUpperCase()}]: ${alert.title} - ${alert.message}`);
  }

  /**
   * Send health status update
   */
  private async sendHealthUpdate(health: HealthCheckResult): Promise<void> {
    await this.sendAlert({
      level: health.status === 'healthy' ? 'info' : health.status === 'degraded' ? 'warning' : 'error',
      title: 'System Status Changed',
      message: `System status changed to: ${health.status}`,
      details: health,
      timestamp: new Date()
    });
  }

  /**
   * Get current monitoring status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastHealthStatus: this.lastHealthStatus,
      checkInterval: this.options?.checkInterval,
      alertThresholds: this.options?.alertThresholds
    };
  }
}