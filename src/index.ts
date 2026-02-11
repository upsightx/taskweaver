/**
 * TaskWeaver - 自主任务执行框架
 *
 * 核心理念：AI 在空闲时自动执行有价值的任务
 *
 * @example
 * ```typescript
 * import { TaskWeaver, Task, IdleDetector, TaskManager } from 'taskweaver';
 *
 * const weaver = new TaskWeaver({
 *   idleThresholdSeconds: 600,
 *   cooldownSeconds: 1800,
 * });
 *
 * // 添加任务
 * weaver.addTask({
 *   id: 'daily-check',
 *   name: '每日健康检查',
 *   priority: 'high',
 *   execute: async () => ({ success: true, output: 'OK' }),
 * });
 *
 * // 启动
 * weaver.start();
 * ```
 */

export { IdleDetector, IdleDetectorConfig, IdleState } from './core/IdleDetector';
export { TaskManager, TaskManagerConfig, Task, TaskPriority, TaskResult } from './core/TaskManager';
export { TaskDecomposer, DecompositionStrategy } from './core/TaskDecomposer';

import IdleDetector, { IdleDetectorConfig } from './core/IdleDetector';
import TaskManager, { TaskManagerConfig, Task, TaskResult } from './core/TaskManager';
import TaskDecomposer from './core/TaskDecomposer';

export interface TaskWeaverConfig {
  /** 空闲检测配置 */
  idleDetector?: Partial<IdleDetectorConfig>;
  /** 任务管理配置 */
  taskManager?: Partial<TaskManagerConfig>;
  /** 心跳间隔（毫秒） */
  heartbeatIntervalMs?: number;
  /** 是否启用任务分解 */
  enableDecomposition?: boolean;
  /** 触发回调 */
  onTrigger?: (tasks: Task[]) => void;
  /** 任务完成回调 */
  onTaskComplete?: (task: Task, result: TaskResult) => void;
}

/**
 * TaskWeaver 主类
 * 整合空闲检测、任务管理、任务分解
 */
export class TaskWeaver {
  private idleDetector: IdleDetector;
  private taskManager: TaskManager;
  private taskDecomposer: TaskDecomposer;
  private config: Required<Omit<TaskWeaverConfig, 'onTrigger' | 'onTaskComplete'>> & Pick<TaskWeaverConfig, 'onTrigger' | 'onTaskComplete'>;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: TaskWeaverConfig = {}) {
    this.config = {
      idleDetector: config.idleDetector || {},
      taskManager: config.taskManager || {},
      heartbeatIntervalMs: config.heartbeatIntervalMs || 60000, // 1 分钟
      enableDecomposition: config.enableDecomposition ?? true,
      onTrigger: config.onTrigger,
      onTaskComplete: config.onTaskComplete,
    };

    this.idleDetector = new IdleDetector(this.config.idleDetector);
    this.taskManager = new TaskManager(this.config.taskManager);
    this.taskDecomposer = new TaskDecomposer();
  }

  /**
   * 添加任务
   */
  addTask(task: Task): void {
    // 如果启用分解且可以分解，先分解
    if (this.config.enableDecomposition && this.taskDecomposer.canDecompose(task)) {
      const subtasks = this.taskDecomposer.decompose(task);
      for (const subtask of subtasks) {
        this.taskManager.addTask(subtask);
      }
    } else {
      this.taskManager.addTask(task);
    }
  }

  /**
   * 移除任务
   */
  removeTask(taskId: string): boolean {
    return this.taskManager.removeTask(taskId);
  }

  /**
   * 启动 TaskWeaver
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('TaskWeaver 启动');
    
    this.intervalId = setInterval(() => {
      this.heartbeat();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * 停止 TaskWeaver
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('TaskWeaver 停止');
  }

  /**
   * 心跳检测
   */
  private async heartbeat(): Promise<void> {
    const state = this.idleDetector.getCurrentState();
    const shouldTrigger = this.idleDetector.shouldTrigger({
      ...state,
      hasActiveTasks: this.taskManager.getRunningCount() > 0,
    });

    if (shouldTrigger) {
      const pending = this.taskManager.getPendingTasks();
      
      if (pending.length > 0) {
        console.log(`[TaskWeaver] 触发执行，待处理任务: ${pending.length}`);
        
        // 回调
        if (this.config.onTrigger) {
          this.config.onTrigger(pending);
        }
        
        // 标记触发
        this.idleDetector.markTriggered();
        
        // 执行下一个任务
        const result = await this.taskManager.executeNext();
        
        if (result && this.config.onTaskComplete) {
          const task = this.taskManager.getTask(pending[0].id);
          if (task) {
            this.config.onTaskComplete(task, result);
          }
        }
      }
    }
  }

  /**
   * 手动触发执行
   */
  async executeNext(): Promise<TaskResult | null> {
    return this.taskManager.executeNext();
  }

  /**
   * 执行指定任务
   */
  async executeTask(taskId: string): Promise<TaskResult | null> {
    return this.taskManager.executeTask(taskId);
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isRunning: boolean;
    idleState: ReturnType<IdleDetector['getCurrentState']>;
    taskStats: ReturnType<TaskManager['getStats']>
  } {
    return {
      isRunning: this.isRunning,
      idleState: this.idleDetector.getCurrentState(),
      taskStats: this.taskManager.getStats(),
    };
  }

  /**
   * 获取任务管理器
   */
  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  /**
   * 获取空闲检测器
   */
  getIdleDetector(): IdleDetector {
    return this.idleDetector;
  }
}

export default TaskWeaver;
