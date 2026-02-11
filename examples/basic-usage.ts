/**
 * TaskWeaver 基础使用示例
 */

import { TaskWeaver, Task, TaskPriority } from '../dist/index.js';

// 创建 TaskWeaver 实例
const weaver = new TaskWeaver({
  idleDetector: {
    idleThresholdSeconds: 600,   // 10 分钟空闲
    cooldownSeconds: 1800,         // 30 分钟冷却
  },
  taskManager: {
    maxConcurrent: 3,
    timeoutSeconds: 300,
  },
  onTrigger: (tasks) => {
    console.log(`触发执行，待处理: ${tasks.length} 个任务`);
  },
  onTaskComplete: (task, result) => {
    console.log(`任务完成: ${task.name}`, result);
  },
});

// 添加任务
weaver.addTask({
  id: 'health-check',
  name: '系统健康检查',
  description: '检查磁盘、内存、网络状态',
  priority: 'high',
  status: 'pending',
  execute: async () => {
    // 模拟检查
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      output: '系统正常 - 磁盘 22%, 内存 1.3G/3.8G',
    };
  },
  createdAt: new Date(),
});

// 添加周期性任务
weaver.addTask({
  id: 'ai-news',
  name: 'AI 信息搜索',
  priority: 'periodic',
  status: 'pending',
  intervalSeconds: 3600, // 每小时
  execute: async () => {
    console.log('搜索最新 AI 信息...');
    return { success: true };
  },
  createdAt: new Date(),
});

// 手动执行
(async () => {
  console.log('手动执行下一个任务');
  const result = await weaver.executeNext();
  console.log('结果:', result);

  // 启动自动执行
  console.log('启动自动执行');
  weaver.start();
})();
