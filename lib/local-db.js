import { access, copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data', 'local-db.json');
const seedPath = path.join(process.cwd(), 'data', 'sample-data.json');
const sourceVideoDir = path.join(process.cwd(), 'assets', 'source-videos');
const downloadsDir = path.join(process.env.HOME || '', 'Downloads');
const videoExtensions = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);

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
    materialSources: db.materialSources || defaultMaterialSources(),
    materialQueue: db.materialQueue || defaultMaterialQueue(),
    materialAgentRuns: db.materialAgentRuns || [],
    editorReviews: db.editorReviews || [],
    editingProjects: (db.editingProjects || defaultEditingProjects()).map(project => ({
      ...project,
      steps: project.steps || [
        { name: '脚本', done: false },
        { name: '分镜', done: false },
        { name: '素材', done: false },
        { name: '粗剪', done: false },
        { name: '成片', done: false },
        { name: '审核', done: false }
      ],
      materialStatus: project.materialStatus || 'platform_source_pending_check'
    }))
  };
}

export async function runMaterialAgent(db) {
  const normalized = normalizeDb(db);
  const now = new Date().toISOString();
  const downloadFiles = await listMaterialFiles(downloadsDir);
  const sourceFiles = await listMaterialFiles(sourceVideoDir);
  const finishedDownload = newestFinishedDownload(downloadFiles);
  const activeDownload = newestActiveDownload(downloadFiles);
  const queue = ensureMaterialQueue(normalized.materialQueue, normalized.materialSources);
  const douyinSource = normalized.materialSources.find(source => source.id === 'source_douyin_hot');
  const douyinItem = queue.find(item => item.platform === '抖音');
  const actions = [];

  await mkdir(sourceVideoDir, { recursive: true });

  if (finishedDownload && !sourceFiles.some(file => file.name === finishedDownload.name)) {
    const targetName = safeAssetName(finishedDownload.name, 'douyin-platform-download.mp4');
    const targetPath = path.join(sourceVideoDir, targetName);
    await rename(finishedDownload.path, targetPath);
    sourceFiles.push({
      ...finishedDownload,
      path: targetPath,
      name: targetName
    });
    actions.push(`已把完成下载的视频归档到 ${relativeAssetPath(targetPath)}`);
  }

  if (douyinItem) {
    douyinItem.updatedAt = now;
    douyinItem.sourceUrl = douyinSource?.url || douyinItem.sourceUrl;

    if (sourceFiles.length) {
      const newestSource = sourceFiles[sourceFiles.length - 1];
      douyinItem.status = 'downloaded';
      douyinItem.localPath = relativeAssetPath(newestSource.path);
      douyinItem.note = '平台下载素材已进入本地素材库，可以交给剪辑员检查画面和改写脚本。';
    } else if (activeDownload) {
      douyinItem.status = 'download_in_progress';
      douyinItem.localPath = activeDownload.path;
      douyinItem.note = `Chrome 下载仍是临时文件，大小 ${formatMb(activeDownload.size)}，最后更新时间 ${activeDownload.modifiedAt}。`;
    } else {
      douyinItem.status = 'downloadable';
      douyinItem.note = '登录后已验证页面存在平台自带下载按钮；等待重新触发或完成下载。';
    }
  }

  if (douyinSource) {
    douyinSource.checkedAt = now;
    if (sourceFiles.length) {
      douyinSource.status = 'downloaded';
      douyinSource.result = '素材采集 Agent 已检测到抖音素材进入本地素材库。';
    } else if (activeDownload) {
      douyinSource.status = 'download_in_progress';
      douyinSource.result = `抖音平台下载仍在临时状态：${activeDownload.path}，大小 ${formatMb(activeDownload.size)}。`;
    } else {
      douyinSource.status = 'downloadable';
      douyinSource.result = '登录后可触发平台自带下载按钮，但当前未检测到完成的视频文件。';
    }
  }

  const readyCount = queue.filter(item => item.status === 'downloaded').length;
  const runningCount = queue.filter(item => item.status === 'download_in_progress').length;
  const blockedCount = queue.filter(item => item.status === 'reference_only' || item.status === 'failed').length;
  const summary = readyCount
    ? `素材采集 Agent 已找到 ${readyCount} 条可用素材，可交给二号员工进入粗剪检查。`
    : runningCount
      ? `素材采集 Agent 检测到 ${runningCount} 条素材正在下载，还不能进入剪辑。`
      : '素材采集 Agent 已完成巡检，当前还没有可入库视频。';
  const run = {
    id: `material_run_${Date.now()}`,
    agentId: 'material_agent',
    createdAt: now,
    summary,
    actions,
    stats: {
      ready: readyCount,
      downloading: runningCount,
      blocked: blockedCount,
      queue: queue.length
    }
  };

  normalized.materialQueue = queue;
  normalized.materialAgentRuns = [run, ...normalized.materialAgentRuns].slice(0, 12);
  updateMaterialTasks(normalized, summary, now);
  updateEditingProjects(normalized, sourceFiles);

  return {
    db: normalized,
    run
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

function ensureMaterialQueue(queue, sources) {
  const existing = queue.length ? [...queue] : defaultMaterialQueue();
  const sourceByPlatform = new Map(sources.map(source => [source.platform, source]));

  for (const item of existing) {
    const source = sourceByPlatform.get(item.platform);
    item.sourceUrl = item.sourceUrl || source?.url || '';
    item.updatedAt = item.updatedAt || item.createdAt || new Date().toISOString();
  }

  return existing;
}

async function listMaterialFiles(dir) {
  if (!dir) return [];
  try {
    const names = await readdir(dir);
    const files = await Promise.all(names.map(async name => {
      const filePath = path.join(dir, name);
      const info = await stat(filePath).catch(() => null);
      if (!info?.isFile()) return null;
      const ext = path.extname(name).toLowerCase();
      const isVideo = videoExtensions.has(ext);
      const isActiveDownload = name.endsWith('.crdownload');
      if (!isVideo && !isActiveDownload) return null;
      return {
        name,
        path: filePath,
        size: info.size,
        modifiedAt: info.mtime.toISOString(),
        isActiveDownload,
        isVideo
      };
    }));

    return files.filter(Boolean).sort((a, b) => new Date(a.modifiedAt) - new Date(b.modifiedAt));
  } catch {
    return [];
  }
}

function newestFinishedDownload(files) {
  return [...files].reverse().find(file => file.isVideo);
}

function newestActiveDownload(files) {
  return [...files].reverse().find(file => file.isActiveDownload);
}

function updateMaterialTasks(db, summary, now) {
  for (const task of db.tasks) {
    if (task.ownerId === 'agent_editor' && task.title?.includes('检查三平台')) {
      task.status = 'in_progress';
      task.deliverable = `${summary} 详情见素材采集 Agent 队列。`;
      task.updatedAt = now;
    }
  }
}

function updateEditingProjects(db, sourceFiles) {
  if (!sourceFiles.length) return;
  const newestSource = sourceFiles[sourceFiles.length - 1];

  for (const project of db.editingProjects) {
    if (!project.sourceFile) {
      project.sourceFile = relativeAssetPath(newestSource.path);
    }
    project.materialStatus = 'ready';
    project.nextAction = '素材已入库，二号员工可以检查画面、截取结构参考，并开始第一版粗剪方案。';
    project.steps = project.steps.map(step => step.name === '素材' ? { ...step, done: true } : step);
  }
}

function safeAssetName(name, fallback) {
  const ext = path.extname(name) || path.extname(fallback);
  const base = path.basename(name, ext).replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || path.basename(fallback, ext);
  return `${base}${ext}`;
}

function relativeAssetPath(filePath) {
  return path.relative(process.cwd(), filePath);
}

function formatMb(size) {
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function defaultMaterialSources() {
  return [
    {
      id: 'source_douyin_hot',
      platform: '抖音',
      name: '抖音热榜',
      url: 'https://www.douyin.com/hot',
      sourceType: 'official_hotlist',
      status: 'platform_source_found',
      downloadPolicy: '如果具体视频页提供平台原生下载，则进入素材采集；否则只做结构参考。',
      assignedTo: 'agent_editor'
    },
    {
      id: 'source_xiaohongshu_hot',
      platform: '小红书',
      name: '小红书热榜聚合入口',
      url: 'https://rebang.today/?tab=xiaohongshu',
      sourceType: 'hotlist_aggregator',
      status: 'platform_source_found',
      downloadPolicy: '打开对应小红书笔记页后，如果页面提供原生下载/保存入口，再进入素材采集。',
      assignedTo: 'agent_editor'
    },
    {
      id: 'source_kuaishou_hot',
      platform: '快手',
      name: '快手实时热榜聚合入口',
      url: 'https://tophub.today/n/MZd7PrPerO',
      sourceType: 'hotlist_aggregator',
      status: 'platform_source_found',
      downloadPolicy: '打开对应快手视频页后，如果页面提供原生下载/保存入口，再进入素材采集。',
      assignedTo: 'agent_editor'
    }
  ];
}

function defaultMaterialQueue() {
  const now = new Date().toISOString();
  return [
    {
      id: 'material_douyin_top1',
      platform: '抖音',
      title: '抖音热榜 Top1',
      sourceUrl: 'https://www.douyin.com/hot',
      status: 'downloadable',
      ownerId: 'agent_editor',
      note: '登录后检查平台原生下载按钮；只使用平台自带能力。',
      localPath: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'material_xiaohongshu_top1',
      platform: '小红书',
      title: '小红书热榜 Top1',
      sourceUrl: 'https://rebang.today/?tab=xiaohongshu',
      status: 'pending_check',
      ownerId: 'agent_editor',
      note: '等待打开具体笔记页检查是否有保存入口。',
      localPath: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'material_kuaishou_top1',
      platform: '快手',
      title: '快手热榜 Top1',
      sourceUrl: 'https://tophub.today/n/MZd7PrPerO',
      status: 'pending_check',
      ownerId: 'agent_editor',
      note: '等待打开具体视频页检查是否有下载入口。',
      localPath: '',
      createdAt: now,
      updatedAt: now
    }
  ];
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
