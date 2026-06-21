'use client';

import { useEffect, useMemo, useState } from 'react';

const statusLabel = {
  todo: '待开始',
  in_progress: '进行中',
  waiting_review: '待审核',
  approved: '已通过',
  returned: '已退回',
  blocked: '被阻塞'
};

const stageLabel = {
  discovery: '热点发现',
  analysis: '热点分析',
  selection: '选题确认',
  creative: '二创加工',
  manager_review: '老板审核',
  distribution: '推广分发',
  performance: '数据回收'
};

export default function Home() {
  const [state, setState] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workDayMessage, setWorkDayMessage] = useState('');
  const [materialAgentMessage, setMaterialAgentMessage] = useState('');

  async function loadState() {
    const response = await fetch('/api/state', { cache: 'no-store' });
    const payload = await response.json();
    setState(payload);
    setSelectedTaskId(current => current || payload.tasks?.[0]?.id);
    setLoading(false);
  }

  useEffect(() => {
    loadState();
  }, []);

  const selectedTask = useMemo(() => {
    if (!state) return null;
    return state.tasks.find(task => task.id === selectedTaskId) || state.tasks[0];
  }, [state, selectedTaskId]);

  const selectedAgent = useMemo(() => {
    if (!state || !selectedTask) return null;
    return state.agents.find(agent => agent.id === selectedTask.ownerId);
  }, [state, selectedTask]);

  const selectedVideo = useMemo(() => {
    if (!state || !selectedTask) return null;
    return state.videos.find(video => video.id === selectedTask.sourceVideoId);
  }, [state, selectedTask]);

  const taskFeedback = useMemo(() => {
    if (!state || !selectedTask) return [];
    return state.feedback.filter(item => item.taskId === selectedTask.id);
  }, [state, selectedTask]);

  async function submitFeedback(action, nextStatus) {
    if (!selectedTask) return;
    setSaving(true);
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: selectedTask.id,
        action,
        nextStatus,
        comment: feedbackText || defaultComment(action),
        rating: action === 'approve' ? 90 : action === 'return' ? 70 : 78
      })
    });
    const payload = await response.json();
    setState(payload);
    setFeedbackText('');
    setSaving(false);
  }

  async function createTodayWorkDay() {
    setSaving(true);
    const response = await fetch('/api/work-day', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const payload = await response.json();
    setState(payload);
    setSelectedTaskId(payload.tasks?.[0]?.id);
    setWorkDayMessage(payload.workDayResult?.created ? '今日工作日已创建，任务和剪辑项目已生成。' : '今日工作日已经存在，没有重复生成。');
    setSaving(false);
  }

  async function runMaterialAgent() {
    setSaving(true);
    const response = await fetch('/api/material-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const payload = await response.json();
    setState(payload);
    setMaterialAgentMessage(payload.materialAgentResult?.summary || '素材采集 Agent 已完成巡检。');
    setSaving(false);
  }

  if (loading) {
    return <main className="loading">正在启动媒体营销公司后端...</main>;
  }

  const editingProjects = state.editingProjects || [];
  const materialSources = state.materialSources || [];
  const tasks = state.tasks || [];
  const workDays = state.workDays || [];
  const agents = state.agents || [];
  const videos = state.videos || [];
  const materialQueue = state.materialQueue || [];
  const materialAgentRuns = state.materialAgentRuns || [];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">M</span>
          <strong>媒体营销公司</strong>
        </div>
        <nav>
          <a href="#review">待我审核</a>
          <a href="#workdays">工作日</a>
          <a href="#edit">剪辑项目</a>
          <a href="#material-agent">素材 Agent</a>
          <a href="#sources">素材采集</a>
          <a href="#agents">Agent 员工</a>
          <a href="#videos">热点视频</a>
        </nav>
        <div className="side-note">
          <strong>本地后端已接入</strong>
          <span>任务状态和反馈会写入 `data/local-db.json`，刷新页面后仍然保留。</span>
        </div>
      </aside>

      <main className="main">
        <header className="hero">
          <p className="eyebrow">Agent operating system</p>
          <h1>一人公司每日工作台</h1>
          <p>让热点分析员、二创剪辑员、推广员每天持续产出；老板在这里审核、反馈和推进下一阶段。</p>
          <div className="ops-bar">
            <div>
              <strong>每日启动</strong>
              <span>生成今天的热点分析、Top3 推荐、剪辑和推广任务。</span>
            </div>
            <button disabled={saving} onClick={createTodayWorkDay}>创建今日工作日</button>
          </div>
          {workDayMessage ? <p className="notice">{workDayMessage}</p> : null}
        </header>

        <section className="metrics">
          <Metric label="待审核" value={countByStatus(tasks, 'waiting_review')} note="老板优先处理" />
          <Metric label="剪辑中" value={editingProjects.filter(project => project.status !== 'approved').length} note="视频制作队列" />
          <Metric label="今日任务" value={tasks.length} note="持续工作项" />
          <Metric label="工作日" value={workDays.length} note="已创建批次" />
        </section>

        <section className="section" id="workdays">
          <div className="section-head">
            <h2>工作日记录</h2>
            <p>每一天都是一个运营批次。后续定时任务会每天自动创建这里的工作日。</p>
          </div>
          <div className="workday-grid">
            {workDays.length ? workDays.map(workDay => (
              <article className="workday-card" key={workDay.id}>
                <div className="row">
                  <h3>{workDay.date}</h3>
                  <span className="status in_progress">{workDay.status}</span>
                </div>
                <p>{workDay.goal}</p>
                <div className="tags">
                  <span>{tasks.filter(task => task.workDayId === workDay.id).length} 个任务</span>
                  <span>{editingProjects.filter(project => project.workDayId === workDay.id).length} 个剪辑项目</span>
                </div>
              </article>
            )) : (
              <article className="workday-card">
                <h3>还没有工作日</h3>
                <p>点击“创建今日工作日”，系统会生成 Agent 今天要做的任务。</p>
              </article>
            )}
          </div>
        </section>

        <section className="workspace" id="review">
          <div>
            <div className="section-head">
              <h2>待我审核</h2>
              <p>点击任务查看交付物、关联视频和反馈历史。你的操作会真实写入本地后端。</p>
            </div>
            <div className="task-list">
              {tasks.map(task => (
                <button
                  key={task.id}
                  className={`task-card ${task.id === selectedTask?.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="row">
                    <strong>{task.title}</strong>
                    <span className={`status ${task.status}`}>{statusLabel[task.status]}</span>
                  </div>
                  <p>{task.summary}</p>
                  <div className="tags">
                    <span>{agentName(state, task.ownerId)}</span>
                    <span>{stageLabel[task.stage]}</span>
                    <span>{task.priority === 'high' ? '高优先级' : '中优先级'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="detail-panel">
            <div className="panel-top">
              <span className={`status ${selectedTask.status}`}>{statusLabel[selectedTask.status]}</span>
              <span>{selectedAgent?.name}</span>
            </div>
            <h2>{selectedTask.title}</h2>
            <p>{selectedTask.summary}</p>

            <div className="block">
              <h3>关联热点视频</h3>
              <strong>{selectedVideo?.title}</strong>
              <p>{selectedVideo?.viralReason}</p>
              <p>营销价值：{selectedVideo?.marketingValue}</p>
            </div>

            <div className="block">
              <h3>员工交付物</h3>
              <p>{selectedTask.deliverable || '等待 Agent 提交交付物。'}</p>
            </div>

            <div className="block">
              <h3>反馈历史</h3>
              <div className="history">
                {taskFeedback.length ? taskFeedback.map(item => (
                  <article key={item.id}>
                    <strong>{item.action} · 评分 {item.rating}</strong>
                    <span>{item.comment}</span>
                    <small>{item.createdAt}</small>
                  </article>
                )) : <p>还没有反馈。</p>}
              </div>
            </div>

            <textarea
              value={feedbackText}
              onChange={event => setFeedbackText(event.target.value)}
              placeholder="写下老板反馈、修改要求或下一步指令。"
            />
            <div className="actions">
              <button disabled={saving} onClick={() => submitFeedback('approve', 'approved')}>通过</button>
              <button disabled={saving} onClick={() => submitFeedback('return', 'returned')}>退回</button>
              <button disabled={saving} onClick={() => submitFeedback('handoff', 'in_progress')}>指派</button>
              <button disabled={saving} onClick={() => submitFeedback('block', 'blocked')}>阻塞</button>
            </div>
          </aside>
        </section>

        <section className="section" id="edit">
          <div className="section-head">
            <h2>剪辑项目</h2>
            <p>剪辑员不再只是写脚本，而是要进入真实视频制作流程：脚本、分镜、素材、剪辑版本、成片链接。</p>
          </div>
          <div className="editing-grid">
            {editingProjects.map(project => (
              <article className="editing-card" key={project.id}>
                <div className="row">
                  <h3>{project.title}</h3>
                  <span className={`status ${project.status}`}>{statusLabel[project.status] || project.status}</span>
                </div>
                <p>{project.goal}</p>
                <div className="edit-steps">
                  {(project.steps || []).map(step => (
                    <span className={step.done ? 'done' : ''} key={step.name}>{step.name}</span>
                  ))}
                </div>
                <p><strong>素材状态：</strong>{materialStatusLabel(project.materialStatus)}</p>
                <p><strong>源文件：</strong>{project.sourceFile || '未提供'}</p>
                <p><strong>成片：</strong>{project.outputUrl || '未输出'}</p>
                <p><strong>当前版本：</strong>{project.version}</p>
                <p><strong>下一步：</strong>{project.nextAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="sources">
          <div className="section-head">
            <h2>素材采集</h2>
            <p>二号员工先打开这些热榜入口，找到具体 Top3 视频页；如果页面提供原生下载，就保存到素材目录进入剪辑。</p>
          </div>
          <div className="source-grid">
            {materialSources.length ? materialSources.map(source => (
              <article className="source-card" key={source.id}>
                <div className="row">
                  <h3>{source.platform}</h3>
                  <span className="status in_progress">{sourceStatusLabel(source.status)}</span>
                </div>
                <p><strong>{source.name}</strong></p>
                <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a>
                <p>{source.downloadPolicy}</p>
              </article>
            )) : (
              <article className="source-card">
                <h3>还没有素材来源</h3>
                <p>先为二号员工添加抖音、小红书、快手的热榜入口。</p>
              </article>
            )}
          </div>
        </section>

        <section className="section" id="material-agent">
          <div className="section-head">
            <h2>素材采集 Agent</h2>
            <p>这个 Agent 负责巡检素材队列、下载状态和本地素材库，只使用平台自己提供的下载入口。</p>
          </div>
          <div className="agent-console">
            <div className="agent-command">
              <div>
                <strong>运行一次素材巡检</strong>
                <span>检查下载目录、素材目录和三平台素材队列，自动更新二号员工任务。</span>
              </div>
              <button disabled={saving} onClick={runMaterialAgent}>运行 Agent</button>
            </div>
            {materialAgentMessage ? <p className="notice">{materialAgentMessage}</p> : null}
            <div className="queue-grid">
              {materialQueue.map(item => (
                <article className="queue-card" key={item.id}>
                  <div className="row">
                    <h3>{item.platform}</h3>
                    <span className={`status ${queueStatusClass(item.status)}`}>{materialQueueStatusLabel(item.status)}</span>
                  </div>
                  <strong>{item.title}</strong>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a>
                  <p>{item.note}</p>
                  <p><strong>本地文件：</strong>{item.localPath || '未入库'}</p>
                </article>
              ))}
            </div>
            <div className="agent-runs">
              <h3>最近汇报</h3>
              {materialAgentRuns.length ? materialAgentRuns.slice(0, 4).map(run => (
                <article key={run.id}>
                  <strong>{run.summary}</strong>
                  <span>{run.createdAt}</span>
                  <p>可剪 {run.stats?.ready || 0} · 下载中 {run.stats?.downloading || 0} · 队列 {run.stats?.queue || 0}</p>
                </article>
              )) : <p>还没有运行记录。</p>}
            </div>
          </div>
        </section>

        <section className="section" id="agents">
          <div className="section-head">
            <h2>Agent 员工</h2>
            <p>后续每个 Agent 会接入自动任务：每天生成任务、提交产出、等待老板审核。</p>
          </div>
          <div className="agent-grid">
            {agents.map(agent => (
              <article className="agent-card" key={agent.id}>
                <div className="row">
                  <h3>{agent.name}</h3>
                  <span>评分 {agent.score}</span>
                </div>
                <p>{agent.role}</p>
                <div className="tags">{agent.outputs.map(output => <span key={output}>{output}</span>)}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="videos">
          <div className="section-head">
            <h2>热点视频</h2>
            <p>现在先用样例数据，下一步会让热点分析员每天新增 Top10。</p>
          </div>
          <div className="video-grid">
            {videos.map(video => (
              <article className="video-card" key={video.id}>
                <span className="rank">{video.rank}</span>
                <h3>{video.title}</h3>
                <p>{video.platform} · 热度 {video.heatScore}</p>
                <p>{video.viralReason}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, note }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <b>{note}</b>
    </article>
  );
}

function countByStatus(tasks, status) {
  return tasks.filter(task => task.status === status).length;
}

function agentName(state, id) {
  return state.agents.find(agent => agent.id === id)?.name || '未分配';
}

function defaultComment(action) {
  if (action === 'approve') return '通过，进入下一阶段。';
  if (action === 'return') return '退回修改，请按要求重新提交。';
  if (action === 'block') return '暂时阻塞，等待老板进一步判断。';
  return '继续推进下一步。';
}

function materialStatusLabel(status) {
  if (status === 'missing_source_video') return '缺少原始视频';
  if (status === 'platform_source_pending_check') return '待检查平台下载';
  if (status === 'ready') return '素材已就绪';
  if (status === 'editing') return '剪辑中';
  if (status === 'exported') return '已输出成片';
  return '待确认';
}

function sourceStatusLabel(status) {
  if (status === 'platform_source_found') return '已找到入口';
  if (status === 'downloadable') return '平台可下载';
  if (status === 'download_in_progress') return '下载中';
  if (status === 'checked_no_web_download') return '网页不可下载';
  if (status === 'downloaded') return '已下载';
  return '待检查';
}

function materialQueueStatusLabel(status) {
  if (status === 'downloadable') return '可下载';
  if (status === 'download_in_progress') return '下载中';
  if (status === 'downloaded') return '已入库';
  if (status === 'reference_only') return '仅参考';
  if (status === 'failed') return '失败';
  return '待检查';
}

function queueStatusClass(status) {
  if (status === 'downloaded') return 'approved';
  if (status === 'download_in_progress' || status === 'downloadable') return 'in_progress';
  if (status === 'failed' || status === 'reference_only') return 'returned';
  return 'todo';
}
