import { access, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data', 'local-db.json');
const seedPath = path.join(process.cwd(), 'data', 'sample-data.json');

export async function getDb() {
  await ensureDb();
  const text = await readFile(dbPath, 'utf8');
  return normalizeDb(JSON.parse(text));
}

export async function saveDb(db) {
  await writeFile(dbPath, JSON.stringify(normalizeDb(db), null, 2), 'utf8');
}

async function ensureDb() {
  try {
    await access(dbPath);
  } catch {
    await copyFile(seedPath, dbPath);
  }
}

function normalizeDb(db) {
  return {
    agents: db.agents || [],
    videos: db.videos || [],
    workDays: db.workDays || [],
    tasks: (db.tasks || []).map(task => ({
      ...task,
      deliverable: task.deliverable || defaultDeliverable(task)
    })),
    feedback: db.feedback || [],
    campaigns: db.campaigns || [],
    editingProjects: db.editingProjects || defaultEditingProjects()
  };
}

export function createWorkDay(db, date = todayKey()) {
  const normalized = normalizeDb(db);
  const existing = normalized.workDays.find(workDay => workDay.date === date);

  if (existing) {
    return { db: normalized, created: false, workDay: existing };
  }

  const now = new Date().toISOString();
  const topVideos = normalized.videos.filter(video => video.isTop3).slice(0, 3);
  const workDay = {
    id: `workday_${date.replaceAll('-', '')}`,
    date,
    status: 'active',
    goal: '完成热点分析、Top3 二创启动、推广计划准备和老板审核闭环。',
    createdAt: now
  };

  normalized.workDays.unshift(workDay);

  const generatedTasks = [
    {
      id: `task_${date}_collect_top10`,
      title: `${date} 收集全网热门视频 Top10`,
      ownerId: 'agent_hotspot',
      stage: 'discovery',
      status: 'in_progress',
      priority: 'high',
      sourceVideoId: topVideos[0]?.id || normalized.videos[0]?.id,
      dueAt: `${date}T10:30:00+08:00`,
      summary: '热点分析员开始收集今日全网 Top10，并补充平台、数据、评论信号和风险判断。',
      deliverable: '今日目标：提交 Top10 列表、热度原因、风险提示和 Top3 候选。',
      workDayId: workDay.id,
      createdAt: now
    },
    {
      id: `task_${date}_recommend_top3`,
      title: `${date} 推荐 Top3 二创候选`,
      ownerId: 'agent_hotspot',
      stage: 'selection',
      status: 'waiting_review',
      priority: 'high',
      sourceVideoId: topVideos[0]?.id || normalized.videos[0]?.id,
      dueAt: `${date}T12:00:00+08:00`,
      summary: '热点分析员需要从 Top10 中挑出最适合二创的 Top3，等待老板确认方向。',
      deliverable: '待补：每条 Top3 的爆火原因、二创角度、商业价值和风险。',
      workDayId: workDay.id,
      createdAt: now
    },
    {
      id: `task_${date}_distribution_plan`,
      title: `${date} 准备推广分发计划`,
      ownerId: 'agent_promoter',
      stage: 'distribution',
      status: 'todo',
      priority: 'medium',
      sourceVideoId: topVideos[0]?.id || normalized.videos[0]?.id,
      dueAt: `${date}T17:30:00+08:00`,
      summary: '推广员准备小红书、视频号、朋友圈的发布计划，等剪辑内容通过后执行。',
      deliverable: '待补：渠道文案、发布时间、数据回收指标和评论线索记录方式。',
      workDayId: workDay.id,
      createdAt: now
    }
  ];

  const editingTasks = topVideos.map((video, index) => ({
    id: `task_${date}_edit_top${index + 1}`,
    title: `${date} Top${index + 1} 二创剪辑项目`,
    ownerId: 'agent_editor',
    stage: 'creative',
    status: index === 0 ? 'in_progress' : 'todo',
    priority: index === 0 ? 'high' : 'medium',
    sourceVideoId: video.id,
    dueAt: `${date}T16:30:00+08:00`,
    summary: `剪辑员基于「${video.title}」创建二创项目，产出脚本、分镜、素材清单和第一版成片链接。`,
    deliverable: '待补：脚本、分镜、旁白、素材清单、粗剪版本和成片链接。',
    workDayId: workDay.id,
    createdAt: now
  }));

  normalized.tasks.unshift(...generatedTasks, ...editingTasks);

  const existingProjectIds = new Set(normalized.editingProjects.map(project => project.id));
  const generatedProjects = topVideos
    .map((video, index) => ({
      id: `edit_${date}_top${index + 1}`,
      sourceVideoId: video.id,
      taskId: `task_${date}_edit_top${index + 1}`,
      title: `${date} Top${index + 1}：${video.title}`,
      status: index === 0 ? 'in_progress' : 'todo',
      goal: `把「${video.title}」改写成符合公司定位的二创短视频，而不是简单搬运。`,
      version: 'v1',
      nextAction: index === 0 ? '先完成脚本、分镜和素材清单，再上传粗剪链接。' : '等待老板确认 Top3 方向后启动剪辑。',
      workDayId: workDay.id,
      steps: [
        { name: '脚本', done: false },
        { name: '分镜', done: false },
        { name: '素材', done: false },
        { name: '粗剪', done: false },
        { name: '成片', done: false },
        { name: '审核', done: false }
      ]
    }))
    .filter(project => !existingProjectIds.has(project.id));

  normalized.editingProjects.unshift(...generatedProjects);

  return { db: normalized, created: true, workDay };
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultDeliverable(task) {
  if (task.stage === 'creative') {
    return '脚本方向：保留热点传播结构，换成公司服务场景。下一版需要补分镜、素材清单和成片链接。';
  }
  if (task.stage === 'analysis') {
    return '已提交 Top3 爆火原因、受众情绪、营销价值和风险判断。';
  }
  return '等待 Agent 提交可审核交付物。';
}

function defaultEditingProjects() {
  return [
    {
      id: 'edit_001',
      title: 'Top1 职场情绪二创视频',
      status: 'in_progress',
      goal: '把热点情绪改写成“小公司老板如何借热点获得线索”的短视频。',
      version: 'v1',
      nextAction: '补齐分镜和旁白，上传第一版成片链接。',
      steps: [
        { name: '脚本', done: true },
        { name: '分镜', done: true },
        { name: '素材', done: false },
        { name: '粗剪', done: false },
        { name: '成片', done: false },
        { name: '审核', done: false }
      ]
    },
    {
      id: 'edit_002',
      title: 'Top2 AI 工具效率快剪',
      status: 'returned',
      goal: '从工具清单改成“媒体公司内部效率 SOP”的观点型快剪。',
      version: 'v1',
      nextAction: '降低搬运感，加入旁白观点和服务场景。',
      steps: [
        { name: '脚本', done: true },
        { name: '分镜', done: false },
        { name: '素材', done: false },
        { name: '粗剪', done: false },
        { name: '成片', done: false },
        { name: '审核', done: false }
      ]
    }
  ];
}
