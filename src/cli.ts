#!/usr/bin/env node
/**
 * TaskWeaver CLI
 * 自主任务执行框架命令行接口
 */

import { program } from 'commander';
import chalk from 'chalk';
import TaskWeaver, { Task, TaskPriority } from './index';

const weaver = new TaskWeaver({
  idleDetector: {
    idleThresholdSeconds: 600, // 10 分钟
    cooldownSeconds: 1800, // 30 分钟
  },
  onTrigger: (tasks) => {
    console.log(chalk.cyan(`\n🚀 触发执行，待处理任务: ${tasks.length}`));
    tasks.slice(0, 3).forEach((task, i) => {
      console.log(chalk.white(`  ${i + 1}. [${task.priority}] ${task.name}`));
    });
  },
  onTaskComplete: (task, result) => {
    if (result.success) {
      console.log(chalk.green(`\n✅ 完成: ${task.name}`));
      if (result.output) {
        console.log(chalk.gray(result.output));
      }
    } else {
      console.log(chalk.red(`\n❌ 失败: ${task.name}`));
      if (result.error) {
        console.log(chalk.gray(result.error));
      }
    }
  },
});

program
  .name('taskweaver')
  .description('自主任务执行框架 - AI 在空闲时自动执行有价值的任务')
  .version('0.1.0');

program
  .command('start')
  .description('启动 TaskWeaver，自动检测空闲并执行任务')
  .option('-i, --interval <ms>', '心跳间隔（毫秒）', '60000')
  .action((options) => {
    console.log(chalk.bold.blue('\n🧵 TaskWeaver 启动中...\n'));
    
    // 添加示例任务
    weaver.addTask({
      id: 'health-check',
      name: '系统健康检查',
      description: '检查磁盘、内存、网络状态',
      priority: 'high',
      status: 'pending',
      execute: async () => {
        const { execSync } = require('child_process');
        const disk = execSync('df -h / | tail -1', { encoding: 'utf-8' }).trim();
        const mem = execSync('free -h | grep Mem', { encoding: 'utf-8' }).trim();
        return {
          success: true,
          output: `磁盘: ${disk}\n内存: ${mem}`,
        };
      },
      createdAt: new Date(),
    });

    weaver.start();
    
    // 显示状态
    const status = weaver.getStatus();
    console.log(chalk.gray('空闲阈值: 10 分钟'));
    console.log(chalk.gray('冷却时间: 30 分钟'));
    console.log(chalk.gray(`待处理任务: ${status.taskStats.pending}`));
    console.log(chalk.gray('\n按 Ctrl+C 停止\n'));

    // 保持运行
    process.on('SIGINT', () => {
      weaver.stop();
      process.exit(0);
    });
  });

program
  .command('status')
  .description('查看当前状态')
  .action(() => {
    const status = weaver.getStatus();
    console.log(chalk.bold.blue('\n📊 TaskWeaver 状态\n'));
    console.log(`运行中: ${status.isRunning ? chalk.green('是') : chalk.red('否')}`);
    console.log(`系统空闲: ${Math.floor(status.idleState.systemIdleSeconds / 60)} 分钟`);
    console.log(`\n任务统计:`);
    console.log(`  待处理: ${chalk.yellow(status.taskStats.pending)}`);
    console.log(`  运行中: ${chalk.blue(status.taskStats.running)}`);
    console.log(`  已完成: ${chalk.green(status.taskStats.completed)}`);
    console.log(`  失败: ${chalk.red(status.taskStats.failed)}`);
    console.log();
  });

program
  .command('add <name>')
  .description('添加任务')
  .option('-p, --priority <priority>', '优先级 (critical/high/medium/low/periodic)', 'medium')
  .option('-t, --tags <tags>', '标签（逗号分隔）')
  .action((name, options) => {
    const task: Task = {
      id: `task-${Date.now()}`,
      name,
      priority: options.priority as TaskPriority,
      status: 'pending',
      execute: async () => ({ success: true, output: `执行任务: ${name}` }),
      createdAt: new Date(),
      tags: options.tags?.split(','),
    };
    
    weaver.addTask(task);
    console.log(chalk.green(`\n✅ 任务已添加: ${name}`));
    console.log(chalk.gray(`ID: ${task.id}`));
    console.log(chalk.gray(`优先级: ${task.priority}`));
    console.log();
  });

program
  .command('list')
  .description('列出所有待处理任务')
  .action(() => {
    const tasks = weaver.getTaskManager().getPendingTasks();
    console.log(chalk.bold.blue('\n📋 待处理任务\n'));
    
    if (tasks.length === 0) {
      console.log(chalk.gray('无待处理任务'));
    } else {
      tasks.forEach((task, i) => {
        const priorityColors: Record<TaskPriority, typeof chalk.white> = {
          critical: chalk.red,
          high: chalk.yellow,
          medium: chalk.white,
          low: chalk.gray,
          periodic: chalk.cyan,
        };
        console.log(`${i + 1}. ${priorityColors[task.priority](`[${task.priority}]`)} ${task.name}`);
        if (task.description) {
          console.log(chalk.gray(`   ${task.description}`));
        }
      });
    }
    console.log();
  });

program
  .command('exec [taskId]')
  .description('执行任务（指定 ID 或下一个）')
  .action(async (taskId) => {
    console.log(chalk.cyan('\n⚡ 执行任务...\n'));
    
    const result = taskId
      ? await weaver.executeTask(taskId)
      : await weaver.executeNext();
    
    if (result) {
      if (result.success) {
        console.log(chalk.green('✅ 执行成功'));
        if (result.output) {
          console.log(result.output);
        }
      } else {
        console.log(chalk.red('❌ 执行失败'));
        if (result.error) {
          console.log(chalk.gray(result.error));
        }
      }
    } else {
      console.log(chalk.yellow('无待处理任务'));
    }
    console.log();
  });

program.parse();
