/**
 * 任务管理器
 * 管理任务队列、优先级、执行状态
 */

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low' | 'periodic';

export interface Task {
  /** 任务 ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 优先级 */
  priority: TaskPriority;
  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** 执行函数 */
  execute: () => Promise<TaskResult>;
  /** 创建时间 */
  createdAt: Date;
  /** 最后执行时间 */
  lastRunAt?: Date;
  /** 执行间隔（秒，仅用于 periodic 任务） */
  intervalSeconds?: number;
  /** 标签 */
  tags?: string[];
  /** 依赖的任务 ID */
  dependsOn?: string[];
}

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  metrics?: Record<string, number | string>;
}

export interface TaskManagerConfig {
  /** 最大并发任务数 */
  maxConcurrent: number;
  /** 任务超时时间（秒） */
  timeoutSeconds: number;
  /** 重试次数 */
  maxRetries: number;
}

/**
 * 任务管理器
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private config: TaskManagerConfig;
  private runningTasks: Set<string> = new Set();

  constructor(config: Partial<TaskManagerConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 4,
      timeoutSeconds: config.timeoutSeconds || 300,
      maxRetries: config.maxRetries || 2,
    };
  }

  /**
   * 添加任务
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, {
      ...task,
      createdAt: task.createdAt || new Date(),
      status: task.status || 'pending',
    });
  }

  /**
   * 移除任务
   */
  removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有待执行任务（按优先级排序）
   */
  getPendingTasks(): Task[] {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      periodic: 4,
    };

    return Array.from(this.tasks.values())
      .filter(task => {
        // 只返回待执行的任务
        if (task.status !== 'pending') return false;
        
        // 检查依赖
        if (task.dependsOn) {
          for (const depId of task.dependsOn) {
            const dep = this.tasks.get(depId);
            if (!dep || dep.status !== 'completed') {
              return false;
            }
          }
        }
        
        // 检查周期任务是否到时间
        if (task.priority === 'periodic' && task.intervalSeconds && task.lastRunAt) {
          const elapsed = (Date.now() - task.lastRunAt.getTime()) / 1000;
          if (elapsed < task.intervalSeconds) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * 执行下一个任务
   */
  async executeNext(): Promise<TaskResult | null> {
    // 检查并发限制
    if (this.runningTasks.size >= this.config.maxConcurrent) {
      return null;
    }

    const pending = this.getPendingTasks();
    if (pending.length === 0) {
      return null;
    }

    const task = pending[0];
    return this.executeTask(task.id);
  }

  /**
   * 执行指定任务
   */
  async executeTask(taskId: string): Promise<TaskResult | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    // 更新状态
    task.status = 'running';
    this.runningTasks.add(taskId);

    let retries = 0;
    let lastError: string | undefined;

    while (retries <= this.config.maxRetries) {
      try {
        const result = await this.executeWithTimeout(task);
        
        task.status = result.success ? 'completed' : 'failed';
        task.lastRunAt = new Date();
        
        if (result.success) {
          // 成功后重置为 pending（用于周期任务）
          if (task.priority === 'periodic') {
            task.status = 'pending';
          }
        }
        
        this.runningTasks.delete(taskId);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retries++;
      }
    }

    // 重试失败
    task.status = 'failed';
    this.runningTasks.delete(taskId);
    
    return {
      success: false,
      error: lastError,
    };
  }

  /**
   * 带超时执行任务
   */
  private async executeWithTimeout(task: Task): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout after ${this.config.timeoutSeconds}s`));
      }, this.config.timeoutSeconds * 1000);

      task.execute()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * 获取运行中的任务数
   */
  getRunningCount(): number {
    return this.runningTasks.size;
  }

  /**
   * 获取任务统计
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'pending': pending++; break;
        case 'running': running++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
      }
    }

    return { total: this.tasks.size, pending, running, completed, failed };
  }

  /**
   * 清除已完成的任务
   */
  clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' && task.priority !== 'periodic') {
        this.tasks.delete(id);
        count++;
      }
    }
    return count;
  }
}

export default TaskManager;
