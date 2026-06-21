# 媒体营销公司

这是一个从练习原型升级出来的正式项目起点，用来管理一家由老板和 3 个 Agent 员工组成的媒体营销一人公司。

## 项目目标

系统解决两个核心问题：

1. 让 Agent 员工按照清晰职责持续执行热点分析、二创加工和推广分发。
2. 让老板能够统一查看进度、审核产出、给反馈、做评估，并沉淀复盘。

## 当前版本

当前已从静态原型升级为 Next.js 本地后端版本，重点验证正式产品的信息结构和最小数据闭环：

- 待我审核
- 任务详情
- 反馈历史
- Agent 员工状态
- 视频详情
- 推广记录
- 每日复盘
- 本地 API 读写
- 本地持久化数据
- 剪辑项目工作流
- 素材采集 Agent

## 目录结构

```text
媒体营销公司/
├─ app/                    # Next.js 页面和 API
├─ lib/                    # 本地后端数据访问
├─ supabase/
│  └─ schema.sql           # 未来接 Supabase 的表结构
├─ index.html              # 旧版静态原型备份
├─ data/
│  ├─ sample-data.json     # 种子数据
│  └─ local-db.json        # 本地运行时数据，不提交
├─ docs/
│  └─ product-spec.md      # 产品规格说明书
├─ package.json
└─ README.md
```

## 本地运行

安装依赖：

```bash
pnpm install
```

启动应用：

```bash
pnpm dev
```

然后访问：

```text
http://localhost:3000
```

当前后端是 Next.js API 路由，数据写入 `data/local-db.json`。第一次运行时会从 `data/sample-data.json` 自动生成本地数据库文件。

## 下一步

建议下一步继续把“每天持续工作”的流程做实：

- 增加“创建今日工作日”按钮
- 自动生成热点分析、剪辑、推广任务
- 增加剪辑项目详情页
- 增加成片链接、素材清单、分镜、旁白字段
- 增加视频数据录入表单
- 让素材采集 Agent 自动巡检下载目录、素材目录和三平台素材队列
- 把本地 JSON 后端替换为 Supabase

## 素材采集 Agent

当前 Agent 先做安全的工作流自动化，不绕过平台限制：

- 检查三平台素材队列
- 识别 Chrome 下载目录里的临时下载文件
- 识别 `assets/source-videos/` 里的已入库视频
- 自动更新二号员工任务交付物
- 下载完成后把素材状态推进到可剪辑

运行入口在页面的“素材 Agent”模块，也可以调用：

```bash
curl -X POST http://localhost:3000/api/material-agent
```
