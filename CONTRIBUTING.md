# Contributing

欢迎贡献 TaskWeaver！

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test
```

## 项目结构

```
taskweaver/
├── src/
│   ├── core/
│   │   ├── IdleDetector.ts     # 空闲检测
│   │   ├── TaskManager.ts      # 任务管理
│   │   └── TaskDecomposer.ts  # 任务分解
│   ├── index.ts               # 主入口
│   └── cli.ts                # 命令行
├── examples/                 # 示例代码
├── tests/                   # 测试
└── dist/                    # 构建输出
```

## 提交规范

- feat: 新功能
- fix: 修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

## 开源协议

MIT License
