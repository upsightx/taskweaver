/**
 * TaskWeaver 任务分解示例
 */

import { TaskWeaver, Task } from '../dist/index.js';

const weaver = new TaskWeaver({
  enableDecomposition: true, // 启用任务分解
});

// 复杂任务 - 会被自动分解
const complexTask: Task = {
  id: 'project-maintenance',
  name: '项目维护',
  description: '检查项目状态和备份文件',
  priority: 'high',
  status: 'pending',
  execute: async () => {
    return { success: true };
  },
  createdAt: new Date(),
};

weaver.addTask(complexTask);

// 查看分解结果
const taskManager = weaver.getTaskManager();
const pendingTasks = taskManager.getPendingTasks();

console.log('待处理任务:');
pendingTasks.forEach((task, i) => {
  console.log(`${i + 1}. ${task.name} (${task.priority})`);
  if (task.dependsOn) {
    console.log(`   依赖: ${task.dependsOn.join(', ')}`);
  }
});
