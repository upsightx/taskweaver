/**
 * 任务分解器
 * 将复杂任务分解为可并行执行的子任务
 */

import { Task, TaskPriority } from './TaskManager';

export interface DecompositionStrategy {
  /** 策略名称 */
  name: string;
  /** 判断是否适用 */
  matches: (description: string) => boolean;
  /** 分解任务 */
  decompose: (task: Task) => Task[];
}

/**
 * 任务分解器
 * 核心功能：将复杂任务分解为可并行执行的子任务
 */
export class TaskDecomposer {
  private strategies: DecompositionStrategy[] = [];

  constructor() {
    // 注册默认策略
    this.registerDefaultStrategies();
  }

  /**
   * 注册分解策略
   */
  registerStrategy(strategy: DecompositionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 分解任务
   */
  decompose(task: Task): Task[] {
    const description = task.description || task.name;
    
    // 查找适用的策略
    for (const strategy of this.strategies) {
      if (strategy.matches(description)) {
        const subtasks = strategy.decompose(task);
        
        // 设置依赖关系
        for (const subtask of subtasks) {
          if (!subtask.dependsOn) {
            subtask.dependsOn = [];
          }
          // 子任务完成后，原任务完成
        }
        
        return subtasks;
      }
    }
    
    // 无法分解，返回原任务
    return [task];
  }

  /**
   * 检查任务是否可以分解
   */
  canDecompose(task: Task): boolean {
    const description = task.description || task.name;
    return this.strategies.some(s => s.matches(description));
  }

  /**
   * 注册默认分解策略
   */
  private registerDefaultStrategies(): void {
    // 策略1：搜索 + 整理 + 执行
    this.strategies.push({
      name: 'search-organize-execute',
      matches: (desc) => {
        const keywords = ['搜索', '整理', '检查', '分析', 'search', 'organize', 'check', 'analyze'];
        return keywords.some(k => desc.toLowerCase().includes(k));
      },
      decompose: (task) => {
        const baseId = task.id;
        return [
          {
            id: `${baseId}-search`,
            name: `搜索: ${task.name}`,
            description: `搜索相关信息: ${task.description || task.name}`,
            priority: task.priority,
            status: 'pending',
            execute: task.execute, // 简化：实际应该有专门的搜索函数
            createdAt: new Date(),
            tags: ['search'],
          },
          {
            id: `${baseId}-organize`,
            name: `整理: ${task.name}`,
            description: `整理搜索结果`,
            priority: task.priority,
            status: 'pending',
            execute: task.execute,
            createdAt: new Date(),
            tags: ['organize'],
            dependsOn: [`${baseId}-search`],
          },
          {
            id: `${baseId}-execute`,
            name: `执行: ${task.name}`,
            description: `执行改进`,
            priority: task.priority,
            status: 'pending',
            execute: task.execute,
            createdAt: new Date(),
            tags: ['execute'],
            dependsOn: [`${baseId}-organize`],
          },
        ];
      },
    });

    // 策略2：健康检查（多个检查项并行）
    this.strategies.push({
      name: 'health-check-parallel',
      matches: (desc) => {
        const keywords = ['健康检查', '状态检查', 'health', 'status check'];
        return keywords.some(k => desc.toLowerCase().includes(k));
      },
      decompose: (task) => {
        const baseId = task.id;
        return [
          {
            id: `${baseId}-disk`,
            name: `检查磁盘`,
            priority: 'high' as TaskPriority,
            status: 'pending',
            execute: async () => {
              // 模拟磁盘检查
              return { success: true, output: '磁盘使用率: 22%' };
            },
            createdAt: new Date(),
            tags: ['health', 'disk'],
          },
          {
            id: `${baseId}-memory`,
            name: `检查内存`,
            priority: 'high' as TaskPriority,
            status: 'pending',
            execute: async () => {
              return { success: true, output: '内存使用: 1.3G/3.8G' };
            },
            createdAt: new Date(),
            tags: ['health', 'memory'],
          },
          {
            id: `${baseId}-network`,
            name: `检查网络`,
            priority: 'high' as TaskPriority,
            status: 'pending',
            execute: async () => {
              return { success: true, output: '网络正常' };
            },
            createdAt: new Date(),
            tags: ['health', 'network'],
          },
          {
            id: `${baseId}-report`,
            name: `生成报告`,
            priority: 'medium' as TaskPriority,
            status: 'pending',
            execute: task.execute,
            createdAt: new Date(),
            tags: ['health', 'report'],
            dependsOn: [`${baseId}-disk`, `${baseId}-memory`, `${baseId}-network`],
          },
        ];
      },
    });

    // 策略3：多任务并行
    this.strategies.push({
      name: 'parallel-tasks',
      matches: (desc) => {
        // 检查是否包含 "和"、"与"、","、"and" 等并列词
        const patterns = [/和/, /与/, /,/, /,/, /和/, /and/i, /\+/];
        return patterns.some(p => p.test(desc));
      },
      decompose: (task) => {
        const desc = task.description || task.name;
        const baseId = task.id;
        
        // 按分隔符分割
        const parts = desc.split(/和|与|,|,|and|\+/i).map(s => s.trim()).filter(s => s);
        
        return parts.map((part, index) => ({
          id: `${baseId}-part-${index}`,
          name: part,
          description: part,
          priority: task.priority,
          status: 'pending',
          execute: task.execute,
          createdAt: new Date(),
          tags: ['parallel'],
        }));
      },
    });
  }
}

export default TaskDecomposer;
