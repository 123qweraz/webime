# Gemini 协作编程与开发哲学总规范

> 本文档用于**指导 Gemini 在协作编程 / 修改代码时的行为与思维方式**。
>
> * **Part A：Development Philosophy（思维与设计原则）** —— 约束“怎么想”
> * **Part B：Workflow & Git Rules（操作规范）** —— 约束“怎么做”
>
> 若两者发生冲突：**以 Workflow & Git Rules 为最高优先级**。

---

## Part A. Gemini Development Philosophy（Unix 风格）

> 本部分描述的是**设计取向与思维约束**，不是逐条执行命令，主要用于防止 AI 过度设计、过度重构或引入不必要复杂性。

### 1. Do One Thing and Do It Well

* 每个程序、函数、模块只解决**一个明确问题**
* 优先拆分小而清晰的函数，而不是不断膨胀单个函数
* 避免“顺手一起重构其他模块”

---

### 2. Write Programs that Work Together

* 模块之间通过**清晰接口**协作，而不是隐式耦合
* Web 项目中应明确区分：

  * UI 渲染
  * 状态管理
  * 业务逻辑
* Gemini 生成的代码应具备**可组合性、可替换性**

---

### 3. Use Simple and Predictable Data Formats

* 优先使用 JSON、纯对象、数组等简单结构
* 数据结构应：

  * 易读
  * 易 diff
  * 易调试
* 避免引入复杂、隐式、魔法化的数据格式

---

### 4. Build a Prototype as Soon as Possible

* 优先得到**可运行版本**，而非完美设计
* 允许初期代码不优雅，但必须可理解
* 后续通过小步迭代改进

---

### 5. Prefer Portability Over Efficiency

* 优先选择：

  * 标准 HTML / CSS / JavaScript
  * 跨浏览器方案
* 可读性、可维护性 > 极限性能

---

### 6. Store Data in Flat Text Files

* 数据优先使用：

  * `.json`
  * `.md`
  * `.txt`
* 避免二进制或不透明格式

---

### 7. Use Scripts to Increase Leverage

* 使用脚本（如 Python）自动化：

  * 数据处理
  * 合并
  * 校验
* 脚本应是：一次性也能复用的工具

---

### 8. Avoid Captive User Interfaces

* UI 应服务用户，而不是限制用户
* 避免强制流程、不可退出模式
* 尊重用户反馈优先级高于“设计初衷”

---

### 9. Make Every Program a Filter

* 函数应遵循：

  ```
  input -> process -> output
  ```
* 最小化副作用，便于测试与推理

---

## Part B. Workflow & Git Rules（严格执行）

### 一、需求确认规则

* 当用户输入内容**很少（一两行）**、需求存在歧义时：

  * **必须先确认需求**
  * 不得擅自改代码、不做假设性实现
* 只有在需求明确后，才能进入设计或修改阶段

---

### 二、Git 使用规范（非常重要）

#### 1️⃣ 禁止 Gemini 代替用户提交代码

* ❌ 不允许：`git commit`
* ✅ 允许：

  * 提醒用户当前应进行 Git 操作
  * 给出提交信息示例
  * 提示最佳提交时机

---

#### 2️⃣ 修改前必须确认 Git 状态为 clean

* 在任何代码修改前，默认要求用户确认：

  ```bash
  git status
  ```
* 若状态 **不是 clean**：

  * 必须提醒用户先处理未提交修改
  * **不得继续修改代码**

---

### 三、工作留痕要求（history_dialog.md）

#### 1️⃣ 文件要求

* 文件名固定为：

  ```
  history_dialog.md
  ```
* 位于项目根目录

---

#### 2️⃣ 必须记录的情况

* 关键需求确认
* 重要设计决策
* 大规模重构
* 行为不兼容变更

---

#### 3️⃣ 记录规范

* 最新内容写在最前面（倒序）
* 偏向变更日志 / 决策记录
* 不记录闲聊

---

## 最终原则

* **Workflow & Git Rules > Development Philosophy**
* 清晰 > 聪明
* 可回溯 > 自动化

你是一个测试人员，采用标准化测试流程。对如下站点进行测试，构思并实现测试用例，尽可能覆盖各种极端情况，并记录
  测试结果编写测试报告。
  dang ni gei wan bug, yao jinxing ceshi, mei wenti zai gaosu wo
