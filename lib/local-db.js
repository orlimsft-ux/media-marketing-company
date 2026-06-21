import { access, copyFile, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const runtimeDataDir = process.env.VERCEL
  ? path.join('/tmp', 'media-marketing-company')
  : path.join(process.cwd(), 'data');
const dbPath = path.join(runtimeDataDir, 'local-db.json');
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
  await mkdir(runtimeDataDir, { recursive: true });

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
    editorAgentRuns: db.editorAgentRuns || [],
    editorReviews: db.editorReviews || [],
    promotionQueue: db.promotionQueue || [],
    editingProjects: (db.editingProjects || defaultEditingProjects()).map((project, index) => ({
      ...project,
      sourceVideoId: project.sourceVideoId || db.videos?.[index]?.id || db.videos?.[0]?.id,
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

export function runEditorAgent(db, options = {}) {
  const normalized = normalizeDb(db);
  const now = new Date().toISOString();
  const bossSourceUrl = typeof options.sourceUrl === 'string' ? options.sourceUrl.trim() : '';
  const bossProject = bossSourceUrl ? createBossLinkProject(normalized, bossSourceUrl, now) : null;
  const updatedProjects = [];
  const waitingForMaterial = [];
  const handoffs = [];

  for (const project of normalized.editingProjects) {
    if (project.status === 'approved') continue;

    const video = normalized.videos.find(item => item.id === project.sourceVideoId) || normalized.videos[0];
    const sourceItem = findSourceForProject(normalized, project);
    const hasMaterial = project.materialStatus === 'ready'
      || Boolean(project.sourceFile)
      || Boolean(project.sourceUrl)
      || sourceItem?.status === 'downloaded';
    const brief = createEditorBrief(video, project, hasMaterial);
    const editVersions = createEditVersions(project, brief, hasMaterial);
    const promotionHandoff = createPromotionHandoff(project, editVersions, now);

    project.editorBrief = brief;
    project.editingSoftware = '剪映 / CapCut 自动工程接口（原型占位）';
    project.editVersions = editVersions;
    project.promotionHandoff = promotionHandoff;
    project.version = editVersions[0]?.id || project.version || 'v1';
    project.status = hasMaterial ? 'waiting_review' : 'in_progress';
    project.materialStatus = hasMaterial ? 'ready' : (project.materialStatus || 'platform_source_pending_check');
    project.nextAction = hasMaterial
      ? `剪辑 Agent 已生成 ${editVersions.length} 个二创版本，等待老板选版后交给推广 Agent。`
      : '剪辑 Agent 已完成脚本和分镜预案，等待素材采集 Agent 提供可剪源文件。';
    project.steps = project.steps.map(step => {
      if (step.name === '脚本' || step.name === '分镜') return { ...step, done: true };
      if (step.name === '素材') return { ...step, done: hasMaterial };
      if (step.name === '粗剪' || step.name === '成片') return { ...step, done: hasMaterial };
      return step;
    });
    project.updatedAt = now;

    const task = normalized.tasks.find(item => item.id === project.taskId)
      || normalized.tasks.find(item => item.ownerId === 'agent_editor' && item.sourceVideoId === project.sourceVideoId);

    if (task) {
      task.status = hasMaterial ? 'waiting_review' : 'in_progress';
      task.summary = hasMaterial
        ? `二创剪辑 Agent 已为「${video?.title || project.title}」生成 ${editVersions.length} 个可审核成片版本。`
        : `二创剪辑 Agent 已生成预案，但「${video?.title || project.title}」仍缺少可剪素材。`;
      task.deliverable = formatEditorDeliverable(brief, editVersions, hasMaterial);
      task.updatedAt = now;
    }

    if (hasMaterial) {
      updatedProjects.push(project);
      handoffs.push(promotionHandoff);
    } else {
      waitingForMaterial.push(project);
    }
  }

  for (const handoff of handoffs) {
    const existingIndex = normalized.promotionQueue.findIndex(item => item.projectId === handoff.projectId);
    if (existingIndex >= 0) {
      normalized.promotionQueue[existingIndex] = handoff;
    } else {
      normalized.promotionQueue.unshift(handoff);
    }
  }

  const summary = updatedProjects.length
    ? `二创剪辑 Agent 已生成 ${updatedProjects.length} 个项目的成片版本，并交给推广 Agent 待接收。`
    : waitingForMaterial.length
      ? `二创剪辑 Agent 已生成 ${waitingForMaterial.length} 个预案，但还在等素材入库。`
      : '二创剪辑 Agent 没有发现需要处理的剪辑项目。';

  const run = {
    id: `editor_run_${Date.now()}`,
    agentId: 'agent_editor',
    createdAt: now,
    summary,
    stats: {
      readyForReview: updatedProjects.length,
      waitingForMaterial: waitingForMaterial.length,
      handoffToPromotion: handoffs.length,
      projects: normalized.editingProjects.length
    },
    source: bossProject ? 'boss_link' : 'material_agent'
  };

  normalized.editorAgentRuns = [run, ...normalized.editorAgentRuns].slice(0, 12);

  return {
    db: normalized,
    run
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

function createEditorBrief(video, project, hasMaterial) {
  const title = video?.title || project.title;
  const marketingValue = video?.marketingValue || '把热点转成公司服务场景，突出可咨询、可转化的问题。';
  const viralReason = video?.viralReason || '热点具备情绪冲突或实用价值，适合改写成短视频观点。';
  const sourceLabel = project.sourceUrl ? `老板输入链接：${project.sourceUrl}` : '来自素材采集 Agent 的待剪任务';

  return {
    sourceLabel,
    hook: `不要直接搬运「${title}」，开头改成老板视角的问题：这个热点为什么能帮小公司拿到线索？`,
    angle: marketingValue,
    structure: [
      '前 3 秒抛出反常识判断，说明这不是蹭热点，而是在借用户情绪找需求。',
      `中段拆解爆点：${viralReason}`,
      '结尾落到公司服务：给出一个可执行动作，引导评论或私信咨询。'
    ],
    shots: [
      '热点画面只做结构参考，不直接搬运原视频核心镜头。',
      '补充老板口播、屏幕录制、评论关键词截图和公司案例画面。',
      hasMaterial ? '已检测到素材可进入粗剪，先做 30-45 秒版本。' : '当前缺少可剪源文件，先保留脚本和分镜。'
    ],
    caption: '小公司追热点，重点不是流量，是找到用户正在表达的问题。',
    riskCheck: '避免照搬原文案、原镜头和原封面；保留观点改写和服务场景。'
  };
}

function createBossLinkProject(db, sourceUrl, now) {
  const id = `edit_boss_${Date.now()}`;
  const taskId = `task_boss_edit_${Date.now()}`;
  const title = linkTitle(sourceUrl);

  const project = {
    id,
    taskId,
    sourceUrl,
    title,
    status: 'in_progress',
    goal: '老板直接输入链接，二创剪辑 Agent 需要拆解内容、重新包装观点，并产出 1-3 个可传播版本。',
    version: 'v1',
    nextAction: '剪辑 Agent 正在拆解链接内容并生成二创版本。',
    materialStatus: 'ready',
    steps: [
      { name: '脚本', done: false },
      { name: '分镜', done: false },
      { name: '素材', done: true },
      { name: '粗剪', done: false },
      { name: '成片', done: false },
      { name: '审核', done: false }
    ],
    createdAt: now
  };

  db.editingProjects.unshift(project);
  db.tasks.unshift({
    id: taskId,
    title: `二创老板输入链接：${title}`,
    ownerId: 'agent_editor',
    stage: 'creative',
    status: 'in_progress',
    priority: 'high',
    dueAt: now,
    summary: `老板输入了一个需要二创的链接：${sourceUrl}`,
    deliverable: '等待二创剪辑 Agent 生成版本。',
    createdAt: now
  });

  return project;
}

function createEditVersions(project, brief, hasMaterial) {
  if (!hasMaterial) return [];

  const baseOutput = project.sourceUrl ? project.id : safeAssetName(project.sourceFile || project.id, project.id);

  return [
    {
      id: 'v1',
      name: '观点口播版',
      length: '35-45 秒',
      editingStyle: '强开头 + 老板口播 + 评论关键词截图 + 服务场景收束',
      outputUrl: `exports/${baseOutput}-v1.mp4`,
      publishFit: '视频号首发，适合建立观点和信任'
    },
    {
      id: 'v2',
      name: '反差快剪版',
      length: '20-30 秒',
      editingStyle: '热点片段结构参考 + 大字卡反转 + 快节奏 BGM + 三段式包袱',
      outputUrl: `exports/${baseOutput}-v2.mp4`,
      publishFit: '适合测试完播率和转发'
    },
    {
      id: 'v3',
      name: '清单教学版',
      length: '45-60 秒',
      editingStyle: '问题拆解 + 3 条方法 + 结尾引导咨询',
      outputUrl: `exports/${baseOutput}-v3.mp4`,
      publishFit: '适合沉淀专业感和私信转化'
    }
  ];
}

function createPromotionHandoff(project, versions, now) {
  return {
    id: `promo_${project.id}`,
    projectId: project.id,
    agentId: 'agent_promoter',
    status: versions.length ? 'ready_for_distribution' : 'waiting_for_video',
    channel: '视频号',
    title: project.title,
    selectedVersionId: versions[0]?.id || '',
    versions,
    instruction: versions.length
      ? '请推广 Agent 优先发布 v1 到视频号，并保留 v2/v3 做 A/B 测试。'
      : '等待剪辑 Agent 输出成片版本后再发布。',
    createdAt: now,
    updatedAt: now
  };
}

function findSourceForProject(db, project) {
  if (project.sourceUrl) {
    return { status: 'downloaded', sourceUrl: project.sourceUrl };
  }

  return db.materialQueue.find(item => item.localPath && item.status === 'downloaded')
    || db.materialQueue.find(item => item.status === 'downloaded')
    || null;
}

function formatEditorDeliverable(brief, versions, hasMaterial) {
  return [
    `来源：${brief.sourceLabel}`,
    `开头：${brief.hook}`,
    `角度：${brief.angle}`,
    `结构：${brief.structure.join(' / ')}`,
    `画面：${brief.shots.join(' / ')}`,
    `文案：${brief.caption}`,
    `风险：${brief.riskCheck}`,
    hasMaterial ? `版本：${versions.map(version => `${version.id} ${version.name}`).join('；')}` : '状态：等待素材采集 Agent 提供源文件。',
    hasMaterial ? '交接：已进入推广 Agent 的视频号发布队列。' : ''
  ].join('\n');
}

function linkTitle(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    return `${url.hostname} 链接二创`;
  } catch {
    return '老板输入链接二创';
  }
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
      sourceVideoId: 'video_001',
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
      sourceVideoId: 'video_002',
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
