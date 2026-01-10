# Gemini 协作编程规范 (WebIME Project)
## 3. Workflow & Git 规范

### 3.1 修改前置条件与验证
- **Git 状态检查**：在修改任何代码前，必须执行 `git status` 确保当前工作区是干净的。
- **需求确认**：若用户指令涉及模糊状态变更，必须先通过对话确认需求。
- **强制自测**：在向用户提交工作前，**必须**先自行执行测试逻辑（如运行测试脚本或模拟关键路径），确保功能符合预期且无回退。
- **静态扫描 (Static Integrity)**：交付前**必须**运行 `python3 tests/static_scanner.py`。该工具用于校验 DOM ID 的一致性及基础函数引用，确保初始化不会因 Null 或 ReferenceError 崩溃。
- **DOM 完整性检查**：若修改了 HTML 中的 ID 或结构，**必须**全量搜索 JS 代码，确保所有对应的 `getElementById` 或选择器已同步更新，严禁出现 Null 指针异常。
- **Console-First 哲学**：在交付前，必须在脑中模拟浏览器控制台输出，预判可能出现的 ReferenceError 或 TypeError。

### 3.2 提交规范
- **小步快跑**：每次完成一个独立的逻辑修复、UI 调整或功能闭环后，**必须**立即 commit，禁止堆积大量变更。
- **提交信息格式**：
  - `feat`: 新功能 (如练习系统)
  - `fix`: 修复 Bug (如 CSS 样式恢复)
  - `refactor`: 重构 (如拆分 update 函数)
  - `perf`: 性能优化
- **严禁强制推送**：永远不要执行 `git push`，除非用户明确要求。




## 1. 开发哲学 (Unix Style)

- **单一职责**：每个函数或模块只做一件事（如 `trie.js` 只负责检索，`ime.js` 只负责状态分发）。
- **组合胜过膨胀**：通过清晰的接口（如 `update()` 调度流）组合功能，而不是在单个函数中堆砌逻辑。
- **数据驱动**：优先考虑数据结构（如候选词对象数组）的清晰度，UI 仅作为数据的镜像。
- **原型先行**：优先实现核心闭环，再通过迭代完善边缘情况。
**修改准则**：新增功能必须明确其所属状态，不得污染全局键盘事件处理逻辑。


## 4. UI 与样式规范

- **变量优先**：使用 `style.css` 中的 CSS 变量（`--primary`, `--bg` 等）处理主题颜色。
- **无障碍性**：保持文字对比度，候选词必须有清晰的索引提示。
- **响应式**：确保在缩放和窗口调整大小时布局不发生坍塌。

---

## 5. Git 常用命令参考

### 5.1 基础状态检查
```bash
# 查看当前状态
git status

# 查看分支
git branch

# 查看当前分支与远程的同步情况
git log --oneline -5
```

### 5.2 提交工作流程
```bash
# 1. 查看修改（确保只包含预期文件）
git status

# 2. 查看具体改动
git diff
git diff <file>    # 查看单个文件

# 3. 暂存文件
git add <file>          # 添加单个文件
git add .               # 添加所有修改
git add -u             # 添加所有已跟踪的修改

# 4. 提交（遵循 3.2 的消息格式）
git commit -m "feat: 添加练习模式章节切换功能"
git commit -m "fix: 修复候选词翻页边界检查"
git commit -m "refactor: 拆分 update() 函数"

# 5. 查看提交历史
git log --oneline -10
```

### 5.3 分支操作
```bash
# 创建新分支
git checkout -b feature/practice-mode
git checkout -b fix/candidate-pagination

# 切换分支
git checkout main
git checkout develop

# 查看所有分支（包括远程）
git branch -a

# 删除本地分支
git branch -d feature/old-branch
```

### 5.4 撤销操作
```bash
# 撤销暂存区修改（保留文件修改）
git reset HEAD <file>

# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 完全回退到上一次提交（丢弃修改）
git reset --hard HEAD~1

# 撤销文件修改（恢复到上次提交）
git checkout -- <file>

# 创建反向提交（安全回退）
git revert HEAD
```

### 5.5 临时存储（Stash）
```bash
# 暂存当前工作
git stash

# 暂存并添加描述
git stash save "修复候选词排序逻辑"

# 查看暂存列表
git stash list

# 恢复最近暂存
git stash pop

# 恢复指定暂存
git stash apply stash@{2}

# 删除所有暂存
git stash clear
```

### 5.6 查看历史
```bash
# 查看提交历史（图形化）
git log --graph --oneline --all -10

# 查看文件修改历史
git log -p <file>

# 搜索提交
git log --grep="候选词"
git log --author="your-name"

# 查看某次提交的详细信息
git show <commit-hash>
```

---

## 6. 工作流程最佳实践

### 6.1 开发新功能流程
```bash
# 1. 确保主分支最新
git checkout main
git pull

# 2. 创建功能分支
git checkout -b feature/new-feature

# 3. 开发、测试、提交
# ... 编写代码 ...
# ... 运行 python3 tests/static_scanner.py ...
git add .
git commit -m "feat: 添加新功能"

# 4. 返回主分支合并
git checkout main
git merge feature/new-feature

# 5. 清理分支
git branch -d feature/new-feature
```

### 6.2 修复 Bug 流程
```bash
# 1. 创建修复分支
git checkout -b fix/bug-name

# 2. 定位问题、修复、测试
# ... 修复代码 ...
# ... 手动测试 ...
# ... 运行 python3 tests/static_scanner.py ...

# 3. 提交修复
git add <affected-files>
git commit -m "fix: 修复候选词边界检查问题"

# 4. 合并到主分支
git checkout main
git merge fix/bug-name

# 5. 验证并清理
git branch -d fix/bug-name
```

### 6.3 提交前检查清单
- [ ] 运行 `git status` 确认只包含预期修改
- [ ] 运行 `python3 tests/static_scanner.py` 确保 DOM 完整性
- [ ] 在浏览器中手动测试核心功能
- [ ] 检查控制台无 ReferenceError 或 TypeError
- [ ] 遵循提交信息格式：`feat:` / `fix:` / `refactor:` / `perf:`
- [ ] 确认不包含调试日志 (`console.log`) 或注释代码
