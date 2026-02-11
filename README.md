# TaskWeaver

**自主任务执行框架** - AI 在空闲时自动执行有价值的任务

[![npm version](https://badge.fury.io/js/taskweaver.svg)](https://badge.fury.io/js/taskweaver)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 核心理念

TaskWeaver 的设计灵感来自 AI Agent 的自主性：

1. **空闲检测** - 检测系统空闲时间和用户静默时间
2. **任务优先级** - 自动选择最有价值的任务执行
3. **任务分解** - 将复杂任务分解为可并行执行的子任务
4. **自动执行** - 无需人工干预，自动完成后台任务

## 安装

```bash
npm install taskweaver
```

## 快速开始

### 编程接口

```typescript
import { TaskWeaver, Task } from 'taskweaver';

// 创建 TaskWeaver 实例
const weaver = new TaskWeaver({
  idleThresholdSeconds: 600,  // 10 分钟空闲后触发
  cooldownSeconds: 1800,       // 两次触发间隔 30 分钟
});

// 添加任务
weaver.addTask({
  id: 'daily-check',
  name: '每日健康检查',
  description: '检查磁盘、内存、网络状态',
  priority: 'high',
  status: 'pending',
  execute: async () => {
    // 执行检查逻辑
    return { success: true, output: '系统正常' };
  },
  createdAt: new Date(),
});

// 启动自动执行
weaver.start();

// 获取状态
const status = weaver.getStatus();
console.log(`待处理任务: ${status.taskStats.pending}`);
```

### 命令行接口

```bash
# 启动自动执行
taskweaver start

# 查看状态
taskweaver status

# 添加任务
taskweaver add "备份文件" --priority high

# 列出待处理任务
taskweaver list

# 手动执行下一个任务
taskweaver exec
```

## 核心功能

### 1. 智能空闲检测

支持多种检测方式：
- **X11 桌面环境**：使用 `xprintidle` 检测键盘/鼠标空闲
- **服务器环境**：使用 `w` 命令检测终端空闲时间
- **后备方案**：基于系统负载判断

```typescript
import { IdleDetector } from 'taskweaver';

const detector = new IdleDetector({
  idleThresholdSeconds: 600,    // 空闲阈值
  cooldownSeconds: 1800,         // 冷却时间
});

const idleSeconds = detector.getSystemIdleSeconds();
console.log(`系统空闲: ${idleSeconds} 秒`);
```

### 2. 任务优先级管理

支持 5 个优先级级别：
- `critical` - 关键任务，立即执行
- `high` - 高优先级
- `medium` - 中优先级（默认）
- `low` - 低优先级
- `periodic` - 周期性任务

```typescript
import { TaskManager } from 'taskweaver';

const manager = new TaskManager({
  maxConcurrent: 4,  // 最大并发数
  timeoutSeconds: 300, // 超时时间
});

manager.addTask({
  id: 'critical-backup',
  name: '紧急备份',
  priority: 'critical',
  execute: async () => { /* ... */ },
});

// 自动按优先级执行
const pending = manager.getPendingTasks();
```

### 3. 任务分解

自动将复杂任务分解为可并行执行的子任务：

```typescript
import { TaskDecomposer } from 'taskweaver';

const decomposer = new TaskDecomposer();

// 复杂任务会被自动分解
const complexTask = {
  id: 'health-check',
  description: '系统健康检查',
  // ...
};

const subtasks = decomposer.decompose(complexTask);
// 输出: [检查磁盘, 检查内存, 检查网络, 生成报告]
```

### 4. 自定义分解策略

```typescript
weaver.registerStrategy({
  name: 'my-strategy',
  matches: (desc) => desc.includes('批量'),
  decompose: (task) => {
    // 自定义分解逻辑
    return [subtask1, subtask2, subtask3];
  },
});
```

## 使用场景

### 1. AI Agent 后台任务

```typescript
// OpenClaw 集成示例
const weaver = new TaskWeaver();

weaver.addTask({
  id: 'ai-news',
  name: '搜索最新 AI 信息',
  priority: 'periodic',
  intervalSeconds: 3600, // 每小时
  execute: async () => {
    // 搜索 AI 新闻
    // 更新知识库
    return { success: true };
  },
});
```

### 2. 服务器维护

```typescript
weaver.addTask({
  id: 'server-health',
  name: '服务器健康检查',
  description: '检查磁盘、内存、网络',
  priority: 'high',
  execute: async () => {
    const disk = checkDisk();
    const mem = checkMemory();
    const net = checkNetwork();
    return { success: true, output: { disk, mem, net } };
  },
});
```

### 3. 定期清理

```typescript
weaver.addTask({
  id: 'cleanup',
  name: '清理临时文件',
  priority: 'periodic',
  intervalSeconds: 86400, // 每天
  execute: async () => {
    // 清理逻辑
    return { success: true };
  },
});
```

## API 参考

### TaskWeaver

| 方法 | 说明 |
|------|------|
| `start()` | 启动自动执行 |
| `stop()` | 停止自动执行 |
| `addTask(task)` | 添加任务 |
| `removeTask(id)` | 移除任务 |
| `executeNext()` | 手动执行下一个任务 |
| `executeTask(id)` | 执行指定任务 |
| `getStatus()` | 获取当前状态 |

### Task

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |
| `name` | string | 任务名称 |
| `description` | string | 任务描述 |
| `priority` | TaskPriority | 优先级 |
| `status` | TaskStatus | 状态 |
| `execute` | () => Promise<TaskResult> | 执行函数 |
| `intervalSeconds` | number | 执行间隔（周期任务） |
| `dependsOn` | string[] | 依赖的任务 ID |

## 设计原则

1. **DO > THINK > RECORD** - 执行优先，不只是思考
2. **安全第一** - 只执行安全、可逆的操作
3. **尊重用户** - 用户说停止就停止
4. **保持安静** - 不要过度打扰

## 灵感来源

- **Claude Opus 4.6** - "Agent Teams" 任务分解能力
- **LangGraph / CrewAI** - AI Agent 框架设计
- **Google Gemini** - "Personal Intelligence" 主动响应

## License

MIT © OpenClaw AI
