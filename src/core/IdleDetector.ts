/**
 * TaskWeaver - 自主任务执行框架
 *
 * 核心理念：AI 在空闲时自动执行有价值的任务
 */

import { execSync } from 'child_process';

export interface IdleState {
  /** 系统空闲时间（秒） */
  systemIdleSeconds: number;
  /** 用户静默时间（秒） */
  userSilentSeconds: number;
  /** 是否有空闲任务在执行 */
  hasActiveTasks: boolean;
  /** 最后活动时间 */
  lastActivityTime: Date;
}

export interface IdleDetectorConfig {
  /** 触发空闲的最小秒数 */
  idleThresholdSeconds: number;
  /** 用户静默的最小秒数 */
  userSilentThresholdSeconds: number;
  /** 冷却时间（秒）- 两次触发之间的最小间隔 */
  cooldownSeconds: number;
}

/**
 * 空闲检测器
 * 检测系统空闲时间和用户静默时间
 */
export class IdleDetector {
  private config: IdleDetectorConfig;
  private lastTriggerTime: Date | null = null;

  constructor(config: Partial<IdleDetectorConfig> = {}) {
    this.config = {
      idleThresholdSeconds: config.idleThresholdSeconds || 600, // 10 分钟
      userSilentThresholdSeconds: config.userSilentThresholdSeconds || 600,
      cooldownSeconds: config.cooldownSeconds || 1800, // 30 分钟
    };
  }

  /**
   * 获取系统空闲时间（秒）
   * 支持多种检测方式：
   * 1. X11 桌面环境：使用 xprintidle
   * 2. 服务器环境：使用 w 命令检测终端空闲
   * 3. 后备方案：检查系统负载
   */
  getSystemIdleSeconds(): number {
    // 尝试 X11 环境
    if (process.env.DISPLAY) {
      try {
        const idleMs = execSync('xprintidle', { encoding: 'utf-8' }).trim();
        return parseInt(idleMs, 10) / 1000;
      } catch {
        // xprintidle 不可用，继续尝试其他方式
      }
    }

    // 服务器环境：使用 w 命令
    try {
      const wOutput = execSync('w -h', { encoding: 'utf-8' });
      const lines = wOutput.trim().split('\n');
      
      let maxIdle = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const idle = parts[3]; // IDLE 列
          const idleSeconds = this.parseIdleTime(idle);
          if (idleSeconds > maxIdle) {
            maxIdle = idleSeconds;
          }
        }
      }
      
      return maxIdle;
    } catch {
      // 后备方案：检查系统负载
      return this.getSystemLoadBasedIdle();
    }
  }

  /**
   * 解析 w 命令的 IDLE 时间格式
   * 支持：X.XXs, X:XX, X:XXm 等
   */
  private parseIdleTime(idle: string): number {
    if (idle === '-' || idle === 'idle') return 0;

    // 格式：X:XX (小时:分钟)
    if (idle.includes(':')) {
      const parts = idle.split(':');
      if (parts.length === 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 3600 + minutes * 60;
      }
    }

    // 格式：X.XXs
    if (idle.endsWith('s')) {
      return parseFloat(idle.slice(0, -1)) || 0;
    }

    // 格式：Xm
    if (idle.endsWith('m')) {
      return (parseInt(idle.slice(0, -1), 10) || 0) * 60;
    }

    // 格式：数字（默认为分钟）
    const num = parseInt(idle, 10);
    return isNaN(num) ? 0 : num * 60;
  }

  /**
   * 基于系统负载的空闲检测（后备方案）
   */
  private getSystemLoadBasedIdle(): number {
    try {
      const loadOutput = execSync('cat /proc/loadavg', { encoding: 'utf-8' });
      const load = parseFloat(loadOutput.split(' ')[0]);
      
      // 负载 < 0.5 认为空闲
      if (load < 0.5) {
        return 3600; // 返回一个大值表示空闲
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * 检查是否应该触发空闲任务
   */
  shouldTrigger(state: Partial<IdleState>): boolean {
    const now = new Date();
    
    // 检查冷却时间
    if (this.lastTriggerTime) {
      const elapsed = (now.getTime() - this.lastTriggerTime.getTime()) / 1000;
      if (elapsed < this.config.cooldownSeconds) {
        return false;
      }
    }

    // 检查系统空闲
    const systemIdle = state.systemIdleSeconds ?? this.getSystemIdleSeconds();
    if (systemIdle < this.config.idleThresholdSeconds) {
      return false;
    }

    // 检查用户静默
    if (state.userSilentSeconds !== undefined &&
        state.userSilentSeconds < this.config.userSilentThresholdSeconds) {
      return false;
    }

    // 检查是否有活动任务
    if (state.hasActiveTasks) {
      return false;
    }

    return true;
  }

  /**
   * 标记触发时间
   */
  markTriggered(): void {
    this.lastTriggerTime = new Date();
  }

  /**
   * 获取当前空闲状态
   */
  getCurrentState(userSilentSeconds?: number, hasActiveTasks?: boolean): IdleState {
    return {
      systemIdleSeconds: this.getSystemIdleSeconds(),
      userSilentSeconds: userSilentSeconds ?? 0,
      hasActiveTasks: hasActiveTasks ?? false,
      lastActivityTime: new Date(),
    };
  }
}

export default IdleDetector;
