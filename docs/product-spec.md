# MediaOps 一人公司系统规格说明书

## 1. 项目背景

MediaOps 是一个面向“一人公司”的媒体营销运营系统。

这个公司暂时由老板和 3 个 Agent 员工组成。Agent 员工分别负责热点收集分析、二创剪辑加工、内容推广分发。老板不需要亲自执行每个细节，而是通过一个管理入口查看工作进展、审核产出、给出反馈、评估质量，并决定任务是否进入下一阶段。

第一阶段目标不是做一个复杂企业系统，而是把一人公司每天的媒体营销工作流变成可管理、可追踪、可反馈、可复盘的系统。

## 2. 系统解决的问题

### 2.1 核心问题

这个系统主要解决两个问题：

1. 让几个 Agent 员工能够按照明确职责持续干活。
2. 让老板能够有效管理这些 Agent 员工，并对他们的产出做反馈和评估。

### 2.2 具体痛点

当前一人公司做媒体营销时，容易出现这些问题：

- 热点很多，但不知道哪些值得追。
- 有人收集热点，但分析结果不可复用。
- 二创内容容易变成简单搬运，缺少自己的观点和商业目标。
- 推广动作分散在不同平台，结果难以回收。
- 老板只能靠聊天记录了解进展，没有统一管理入口。
- 反馈分散、不可追踪，无法知道某个任务修改了几轮。
- 每天做了很多事，但难以复盘哪些动作真正有效。

### 2.3 系统目标

MediaOps 要把这些动作变成一个稳定闭环：

```text
热点发现 -> 热度分析 -> Top3 推荐 -> 二创加工 -> 老板审核 -> 推广分发 -> 数据回收 -> 每日复盘
```

老板主要做三件事：

- 看状态：知道每个 Agent 员工现在在做什么。
- 给反馈：对提交结果做通过、退回、修改建议、下一步指派。
- 做评估：判断热点价值、内容质量、推广效果和员工表现。

## 3. 用户与角色

### 3.1 老板 / Manager

老板是系统的主要使用者。

老板需要：

- 查看今日运营总览。
- 查看 3 个 Agent 员工的任务进度。
- 审核热点分析结果。
- 审核二创脚本、标题、封面、剪辑版本。
- 审核推广计划和推广结果。
- 写反馈。
- 决定任务通过、退回、继续修改或进入下一阶段。
- 查看每日复盘和员工表现。

老板不应该被细节淹没。系统应该优先显示：

- 当前谁卡住了。
- 哪些内容等待审核。
- 哪些热点值得追。
- 哪些推广结果值得继续投入。

### 3.2 Agent 1：热点分析员

职责：

- 收集全网热门视频 Top10。
- 分析每条视频热度原因。
- 判断每条视频的商业价值。
- 从 Top10 中推荐 Top3 进入二创。

输入：

- 平台热榜。
- 视频链接。
- 视频数据。
- 评论区反馈。
- 竞品账号内容。

输出：

- 每日 Top10 热点表。
- Top3 推荐。
- 爆火原因分析。
- 受众情绪分析。
- 二创价值判断。
- 风险提醒。

验收标准：

- Top10 是否覆盖主要平台。
- Top3 推荐是否有明确理由。
- 分析是否能指导二创，而不是只描述表面现象。
- 是否指出风险，比如侵权、争议过强、低转化。

### 3.3 Agent 2：二创剪辑员

职责：

- 基于 Top3 热点做二次加工。
- 产出适合公司定位的内容方案。
- 避免简单搬运，加入观点、结构和商业目标。

输入：

- Top3 热点。
- 热点分析报告。
- 老板反馈。
- 公司定位和服务方向。

输出：

- 二创角度。
- 视频脚本。
- 标题方案。
- 封面方案。
- 剪辑说明。
- 待审核版本。

验收标准：

- 是否保留热点的传播结构。
- 是否换成公司自己的观点和场景。
- 是否有明确钩子。
- 是否能引导咨询、关注、收藏或转化。
- 是否避免低质量搬运。

### 3.4 Agent 3：推广员

职责：

- 负责内容发布和推广分发。
- 根据不同平台改写文案。
- 回收推广数据。
- 整理评论反馈和潜在线索。

输入：

- 已审核通过的内容。
- 发布平台。
- 推广目标。
- 老板指定重点。

输出：

- 发布计划。
- 平台文案。
- 发布时间。
- 推广记录。
- 数据回收。
- 评论反馈。
- 潜在线索。

验收标准：

- 是否按平台特性调整内容。
- 是否记录发布时间和标题版本。
- 是否回收关键数据。
- 是否整理有效评论和线索。
- 是否给出下一步推广建议。

## 4. 核心业务流程

### 4.1 每日流程

1. 热点分析员收集 Top10 热门视频。
2. 热点分析员推荐 Top3 二创候选。
3. 老板审核 Top3 推荐。
4. 二创剪辑员根据 Top3 做二创方案。
5. 老板审核二创产出。
6. 推广员制定发布计划。
7. 老板审核推广计划。
8. 推广员发布并回收数据。
9. 老板查看每日复盘。

### 4.2 任务状态

任务状态用于表示某个任务当前处于什么处理状态：

- `todo`：待开始。
- `in_progress`：进行中。
- `waiting_review`：等待老板审核。
- `approved`：已通过。
- `returned`：已退回修改。
- `blocked`：被阻塞。
- `archived`：已归档。

### 4.3 业务阶段

业务阶段用于表示一个内容项目走到了哪一步：

- `discovery`：热点发现。
- `analysis`：热点分析。
- `selection`：Top3 选题确认。
- `creative`：二创加工。
- `manager_review`：老板审核。
- `distribution`：推广分发。
- `performance`：数据回收。
- `retrospective`：复盘沉淀。

任务状态和业务阶段要分开。

例如：一个任务的业务阶段是 `creative`，状态可能是 `in_progress`，也可能是 `waiting_review`。

## 5. 数据结构草案

下面是第一版建议的数据模型。正式开发时可以先按这些对象设计数据库表，也可以先用 JSON、Airtable、Notion 或 Supabase 实现。

### 5.1 Employee / Agent 员工

用于表示系统里的 Agent 员工。

```json
{
  "id": "agent_hotspot_analyst",
  "name": "热点分析员",
  "type": "agent",
  "role": "收集全网热门视频 Top10 并分析价值",
  "responsibilities": [
    "收集热门视频",
    "分析爆火原因",
    "推荐 Top3 二创候选"
  ],
  "status": "active",
  "quality_score": 86,
  "created_at": "2026-06-21T09:00:00+08:00"
}
```

建议字段：

- `id`：员工唯一 ID。
- `name`：员工名称。
- `type`：员工类型，比如 `agent` 或 `human`。
- `role`：岗位说明。
- `responsibilities`：职责列表。
- `status`：是否启用。
- `quality_score`：老板评估分。
- `created_at`：创建时间。

### 5.2 Video 热门视频

用于存储被收集到的热点视频。

```json
{
  "id": "video_20260621_001",
  "title": "职场人下班后突然爆发的 30 秒",
  "platform": "抖音",
  "url": "https://example.com/video/001",
  "author_name": "某职场账号",
  "published_at": "2026-06-20T20:15:00+08:00",
  "collected_at": "2026-06-21T09:30:00+08:00",
  "rank": 1,
  "heat_score": 98,
  "metrics": {
    "views": 2300000,
    "likes": 180000,
    "comments": 23000,
    "shares": 12000,
    "favorites": 45000
  },
  "growth_signal": "评论增速高，转发持续上升",
  "risk_level": "medium"
}
```

建议字段：

- `id`：视频唯一 ID。
- `title`：视频标题。
- `platform`：来源平台。
- `url`：视频链接。
- `author_name`：作者名称。
- `published_at`：发布时间。
- `collected_at`：收集时间。
- `rank`：当日排名。
- `heat_score`：系统或人工评分。
- `metrics`：播放、点赞、评论、收藏、转发等数据。
- `growth_signal`：增长信号。
- `risk_level`：风险等级。

### 5.3 VideoAnalysis 视频分析

用于存储热点分析员对视频的判断。

```json
{
  "id": "analysis_001",
  "video_id": "video_20260621_001",
  "agent_id": "agent_hotspot_analyst",
  "viral_reason": "强情绪共鸣，标题制造冲突，评论区有大量二次表达",
  "audience_emotion": ["共鸣", "委屈", "释放"],
  "marketing_value": "适合切入职场服务、个人 IP、老板视角内容",
  "remix_potential": 92,
  "recommended_angle": "把职场情绪改写成小公司老板的内容营销自救故事",
  "risk_notes": "需要避免直接搬运原视频镜头和原文案",
  "is_top3": true,
  "manager_rating": null,
  "created_at": "2026-06-21T10:10:00+08:00"
}
```

建议字段：

- `video_id`：关联视频。
- `agent_id`：由哪个 Agent 产出。
- `viral_reason`：爆火原因。
- `audience_emotion`：受众情绪。
- `marketing_value`：营销价值。
- `remix_potential`：二创潜力分。
- `recommended_angle`：推荐二创角度。
- `risk_notes`：风险提醒。
- `is_top3`：是否进入 Top3。
- `manager_rating`：老板评分。

### 5.4 Task 任务

用于管理 Agent 员工每天做什么。

```json
{
  "id": "task_001",
  "title": "补充 Top3 热度归因",
  "owner_id": "agent_hotspot_analyst",
  "stage": "analysis",
  "status": "waiting_review",
  "priority": "high",
  "source_video_ids": ["video_20260621_001", "video_20260621_002"],
  "description": "补充 Top3 视频的爆火原因、受众情绪和二创价值",
  "deliverable_type": "analysis_report",
  "due_at": "2026-06-21T12:00:00+08:00",
  "submitted_at": "2026-06-21T11:40:00+08:00",
  "approved_at": null,
  "created_at": "2026-06-21T09:40:00+08:00"
}
```

建议字段：

- `owner_id`：负责人。
- `stage`：业务阶段。
- `status`：任务状态。
- `priority`：优先级。
- `source_video_ids`：关联视频。
- `description`：任务说明。
- `deliverable_type`：交付物类型。
- `due_at`：截止时间。
- `submitted_at`：提交时间。
- `approved_at`：通过时间。

### 5.5 Deliverable 交付物

用于存储员工提交的具体成果。

```json
{
  "id": "deliverable_001",
  "task_id": "task_001",
  "owner_id": "agent_hotspot_analyst",
  "type": "analysis_report",
  "title": "Top3 热点归因报告",
  "content": "Top1 强在标题冲突和评论区共鸣；Top2 强在步骤可复制；Top3 强在身份代入。",
  "attachments": [],
  "version": 1,
  "status": "submitted",
  "created_at": "2026-06-21T11:40:00+08:00"
}
```

建议字段：

- `task_id`：关联任务。
- `owner_id`：提交人。
- `type`：交付物类型。
- `title`：交付物标题。
- `content`：正文内容。
- `attachments`：附件，例如脚本、图片、视频链接。
- `version`：版本号。
- `status`：提交状态。

### 5.6 Feedback 老板反馈

用于记录老板对任务或交付物的反馈。

```json
{
  "id": "feedback_001",
  "task_id": "task_001",
  "deliverable_id": "deliverable_001",
  "from_user_id": "manager",
  "to_agent_id": "agent_hotspot_analyst",
  "action": "return",
  "rating": 72,
  "comment": "分析方向对，但需要补充为什么这个热点适合我们的服务转化，不要只写传播原因。",
  "required_changes": [
    "补充商业转化价值",
    "增加风险判断",
    "给出更具体的二创标题方向"
  ],
  "created_at": "2026-06-21T12:05:00+08:00"
}
```

建议字段：

- `task_id`：关联任务。
- `deliverable_id`：关联交付物。
- `from_user_id`：反馈人，通常是老板。
- `to_agent_id`：反馈对象。
- `action`：动作，比如 `approve`、`return`、`handoff`。
- `rating`：评分。
- `comment`：反馈内容。
- `required_changes`：需要修改的点。
- `created_at`：反馈时间。

这张表非常重要。正式项目里，反馈不应该只覆盖当前备注，而应该形成历史记录。

### 5.7 CreativeAsset 二创资产

用于存储二创剪辑员产出的脚本、标题、封面和剪辑方案。

```json
{
  "id": "asset_001",
  "task_id": "task_002",
  "source_video_id": "video_20260621_001",
  "owner_id": "agent_editor",
  "format": "short_video",
  "hook": "为什么小公司不缺内容，缺的是把热点变成线索的能力？",
  "script": "第一幕：展示热点；第二幕：拆解爆点；第三幕：迁移到小公司案例；第四幕：给出行动建议。",
  "title_options": [
    "小公司如何用一条热点视频拿到第一批线索",
    "别再追热点了，先学会改写热点"
  ],
  "cover_text": "热点不是搬，是改写",
  "edit_notes": "原视频镜头占比不超过 20%，以旁白和图文拆解为主",
  "status": "waiting_review",
  "created_at": "2026-06-21T15:00:00+08:00"
}
```

建议字段：

- `source_video_id`：来源热点。
- `format`：内容形式。
- `hook`：开头钩子。
- `script`：脚本。
- `title_options`：标题候选。
- `cover_text`：封面文案。
- `edit_notes`：剪辑说明。
- `status`：审核状态。

### 5.8 Campaign 推广计划

用于表示一次推广活动。

```json
{
  "id": "campaign_001",
  "creative_asset_id": "asset_001",
  "owner_id": "agent_promoter",
  "goal": "获取媒体营销咨询线索",
  "target_audience": "小公司老板、个人品牌主、自由职业者",
  "channels": ["小红书", "视频号", "朋友圈"],
  "status": "planned",
  "planned_start_at": "2026-06-21T19:30:00+08:00",
  "manager_approved": false,
  "created_at": "2026-06-21T16:00:00+08:00"
}
```

建议字段：

- `creative_asset_id`：关联二创资产。
- `goal`：推广目标。
- `target_audience`：目标受众。
- `channels`：发布渠道。
- `status`：推广状态。
- `planned_start_at`：计划开始时间。
- `manager_approved`：老板是否批准。

### 5.9 PublishRecord 发布记录

用于记录每个平台的发布情况和效果。

```json
{
  "id": "publish_001",
  "campaign_id": "campaign_001",
  "channel": "小红书",
  "post_url": "https://example.com/post/001",
  "copy_text": "小公司追热点，不是为了蹭流量，而是为了找到用户正在关心的问题。",
  "published_at": "2026-06-21T20:00:00+08:00",
  "metrics": {
    "views": 12000,
    "likes": 680,
    "comments": 94,
    "favorites": 240,
    "shares": 31,
    "leads": 6
  },
  "comment_insights": [
    "用户关心能否代做",
    "用户想要案例模板",
    "有人询问报价"
  ],
  "next_action": "明天测试服务型 CTA 标题",
  "created_at": "2026-06-21T21:30:00+08:00"
}
```

建议字段：

- `campaign_id`：关联推广计划。
- `channel`：发布渠道。
- `post_url`：发布链接。
- `copy_text`：发布文案。
- `published_at`：发布时间。
- `metrics`：发布数据。
- `comment_insights`：评论洞察。
- `next_action`：下一步建议。

### 5.10 DailyReview 每日复盘

用于汇总一天的运营结果。

```json
{
  "id": "review_20260621",
  "date": "2026-06-21",
  "summary": "今日完成 Top10 收集、Top3 推荐、1 条二创脚本和 1 个推广计划。",
  "wins": [
    "Top3 推荐方向清晰",
    "推广员识别出服务型 CTA 机会"
  ],
  "problems": [
    "二创初稿观点不足",
    "热点分析还缺少转化价值判断"
  ],
  "manager_decisions": [
    "明天优先做职场情绪方向",
    "所有二创脚本必须写明转化目标"
  ],
  "agent_scores": {
    "agent_hotspot_analyst": 82,
    "agent_editor": 74,
    "agent_promoter": 80
  },
  "next_day_focus": "验证小红书服务型标题是否带来更多咨询"
}
```

建议字段：

- `date`：复盘日期。
- `summary`：整体摘要。
- `wins`：做得好的地方。
- `problems`：问题。
- `manager_decisions`：老板决策。
- `agent_scores`：员工评分。
- `next_day_focus`：明天重点。

## 6. 数据关系建议

第一版核心关系可以这样理解：

```text
Employee 1 -> N Task
Task 1 -> N Deliverable
Task 1 -> N Feedback
Video 1 -> N VideoAnalysis
VideoAnalysis N -> 1 Video
CreativeAsset N -> 1 Video
Campaign N -> 1 CreativeAsset
Campaign 1 -> N PublishRecord
DailyReview 汇总 Employee、Task、Feedback、PublishRecord
```

更直白地说：

- 一个 Agent 员工可以有很多任务。
- 一个任务可以提交多个版本的交付物。
- 一个任务可以收到多条老板反馈。
- 一个热点视频可以有一条或多条分析。
- 一个二创资产通常来自一个热点视频。
- 一个推广计划可以发布到多个平台。
- 每日复盘汇总当天所有运营结果。

## 7. 第一版产品范围

### 7.1 必须有

- 今日总览。
- 3 个 Agent 员工工作台。
- 任务状态管理。
- Top10 热点列表。
- Top3 推荐标记。
- Manager 审核面板。
- 老板反馈记录。
- 每日复盘。

### 7.2 暂时不做

- 真实登录系统。
- 自动抓取平台热榜。
- 自动下载视频。
- 自动剪辑视频。
- 自动发布到平台。
- 多老板或团队权限。
- 财务和客户管理。

这些可以在后续正式化阶段加入。

## 8. 第二版原型计划

### 8.1 原型目标

第二版原型不追求完整后端，而是验证正式产品的信息结构是否成立。

重点验证：

- 老板是否能快速看懂今天谁在做什么。
- 老板是否能快速处理待审核任务。
- 反馈是否能形成历史记录。
- Top10 到 Top3 到二创到推广的链路是否清晰。
- 手机端是否适合随时查看和反馈。

### 8.2 建议新增页面或模块

1. **待我审核**

老板打开系统后，第一眼看到所有待审核任务。

字段：

- 任务标题。
- 员工。
- 阶段。
- 提交时间。
- 交付摘要。
- 快速操作。

2. **任务详情**

展示单个任务完整历史。

内容：

- 任务说明。
- 关联视频。
- 交付物版本。
- 老板反馈历史。
- 当前状态。
- 下一步动作。

3. **反馈历史**

每次反馈都记录下来。

内容：

- 反馈时间。
- 反馈动作。
- 评分。
- 反馈内容。
- 要求修改点。

4. **视频详情**

用于查看某个热点视频为什么值得追。

内容：

- 原视频信息。
- 数据指标。
- 爆火原因。
- 受众情绪。
- 二创价值。
- 风险提醒。

5. **推广记录**

用于查看发布后的结果。

内容：

- 发布渠道。
- 发布链接。
- 发布文案。
- 数据指标。
- 评论洞察。
- 线索数量。
- 下一步建议。

### 8.3 第二版交互

建议加入这些交互：

- 点击任务进入详情。
- 写反馈后生成一条反馈历史。
- 通过后自动进入下一业务阶段。
- 退回后任务状态变为 `returned`。
- 给 Agent 打分。
- 在 Top10 中手动选择或取消 Top3。
- 在推广记录里录入数据。
- 每日复盘自动汇总当天任务状态。

## 9. 正式项目技术路线建议

### 9.1 低成本路线

适合练习和快速验证：

- 前端：HTML / CSS / JavaScript 或 React。
- 数据：本地 JSON、Google Sheets、Airtable 或 Notion。
- 自动化：手动录入 + AI 辅助分析。

优点：

- 快。
- 成本低。
- 方便调整业务模型。

缺点：

- 权限和数据一致性有限。
- 不适合长期复杂使用。

### 9.2 正式轻量产品路线

适合做成可长期使用的产品：

- 前端：Next.js 或 React。
- 数据库：Supabase。
- 登录：Supabase Auth。
- 文件存储：Supabase Storage。
- 后台任务：定时任务或 serverless functions。
- AI：用于热点分析、二创建议、反馈总结。

优点：

- 可扩展。
- 有真实数据库。
- 适合逐步接入自动化。

缺点：

- 初期复杂度更高。

### 9.3 Agent 化路线

当业务流程稳定后，可以把三个员工逐步变成可执行 Agent：

- 热点分析 Agent：定时收集和分析热点。
- 二创 Agent：根据 Top3 生成脚本、标题和剪辑说明。
- 推广 Agent：生成渠道文案，回收数据并总结。

老板仍然保留最终审核权。

## 10. 下一步建议

下一步建议先做第二版原型，而不是立刻接后端。

第二版重点：

1. 把当前单页控制台升级成更像正式系统的结构。
2. 增加“待我审核”作为老板第一入口。
3. 增加反馈历史，而不是只有一个反馈输入框。
4. 增加任务详情视图。
5. 增加视频详情和推广记录。

等这些流程跑顺之后，再决定是否接 Supabase 或 Airtable。
