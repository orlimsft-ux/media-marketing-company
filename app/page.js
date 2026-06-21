'use client';

import { useEffect, useMemo, useState } from 'react';

const statusLabel = {
  todo: '待开始',
  in_progress: '进行中',
  waiting_review: '待处理',
  approved: '已通过',
  returned: '需修改',
  blocked: '卡住'
};

const stageLabel = {
  discovery: '找热点',
  analysis: '做分析',
  selection: '定选题',
  creative: '做视频',
  manager_review: '老板看',
  distribution: '发出去',
  performance: '看数据'
};

export default function Home() {
  const [state, setState] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [bossLink, setBossLink] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadState() {
    const response = await fetch('/api/state', { cache: 'no-store' });
    const payload = await response.json();
    setState(payload);
    setSelectedTaskId(current => current || primaryTasks(payload.tasks || [])[0]?.id || payload.tasks?.[0]?.id);
    setLoading(false);
  }

  useEffect(() => {
    loadState();
  }, []);

  const tasks = state?.tasks || [];
  const editingProjects = state?.editingProjects || [];
  const materialQueue = state?.materialQueue || [];
  const promotionQueue = state?.promotionQueue || [];
  const videos = state?.videos || [];

  const visibleTasks = useMemo(() => primaryTasks(tasks), [tasks]);

  const selectedTask = useMemo(() => {
    if (!state) return null;
    return tasks.find(task => task.id === selectedTaskId) || visibleTasks[0] || tasks[0];
  }, [state, tasks, selectedTaskId, visibleTasks]);

  const selectedAgent = useMemo(() => {
    if (!state || !selectedTask) return null;
    return state.agents.find(agent => agent.id === selectedTask.ownerId);
  }, [state, selectedTask]);

  const selectedVideo = useMemo(() => {
    if (!state || !selectedTask) return null;
    return videos.find(video => video.id === selectedTask.sourceVideoId);
  }, [state, selectedTask, videos]);

  const taskFeedback = useMemo(() => {
    if (!state || !selectedTask) return [];
    return (state.feedback || []).filter(item => item.taskId === selectedTask.id);
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
    setMessage(action === 'approve' ? '已通过，任务会进入下一步。' : '反馈已记录。');
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
    setSelectedTaskId(primaryTasks(payload.tasks || [])[0]?.id || payload.tasks?.[0]?.id);
    setMessage(payload.workDayResult?.created ? '今日任务已生成。' : '今日任务已经存在。');
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
    setMessage(payload.materialAgentResult?.summary || '素材巡检已完成。');
    setSaving(false);
  }

  async function runEditorAgent() {
    setSaving(true);
    const response = await fetch('/api/editor-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceUrl: bossLink
      })
    });
    const payload = await response.json();
    setState(payload);
    setSelectedTaskId(primaryTasks(payload.tasks || [])[0]?.id || payload.tasks?.[0]?.id);
    setMessage(payload.editorAgentResult?.summary || '二创剪辑 Agent 已完成处理。');
    setBossLink('');
    setSaving(false);
  }

  async function uploadTestVideo() {
    if (!videoFile) {
      setMessage('请先选择一个测试视频。');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('video', videoFile);
    const response = await fetch('/api/test-video', {
      method: 'POST',
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error || '测试视频上传失败。');
      setSaving(false);
      return;
    }

    setState(payload);
    setVideoFile(null);
    setSelectedTaskId(payload.uploadedVideoResult?.taskId || primaryTasks(payload.tasks || [])[0]?.id || payload.tasks?.[0]?.id);
    setMessage(`测试视频已入库：${payload.uploadedVideoResult?.localPath}`);
    setSaving(false);
  }

  if (loading) {
    return <main className="loading">正在打开驾驶舱...</main>;
  }

  const pendingCount = tasks.filter(task => task.status === 'waiting_review').length;
  const activeCount = tasks.filter(task => task.status === 'in_progress').length;
  const editorVersionCount = editingProjects.reduce((total, project) => total + (project.editVersions?.length || 0), 0);
  const nextProject = editingProjects.find(project => project.status !== 'approved');

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p>媒体营销公司</p>
          <h1>今日驾驶舱</h1>
        </div>
        <div className="top-actions">
          <button disabled={saving} onClick={createTodayWorkDay}>生成今日任务</button>
          <button disabled={saving} onClick={runMaterialAgent}>巡检素材</button>
        </div>
      </header>

      <section className="agent-input">
        <div>
          <strong>二创剪辑 Agent</strong>
          <span>上传真实视频测试，或直接输入一个需要二创的视频链接。</span>
        </div>
        <label className="file-pick">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={event => setVideoFile(event.target.files?.[0] || null)}
          />
          <span>{videoFile ? videoFile.name : '选择测试视频'}</span>
        </label>
        <button disabled={saving} onClick={uploadTestVideo}>上传入库</button>
      </section>

      <section className="agent-input compact">
        <div>
          <strong>链接输入</strong>
          <span>没有视频文件时，也可以按老板输入链接流程测试。</span>
        </div>
        <input
          value={bossLink}
          onChange={event => setBossLink(event.target.value)}
          placeholder="粘贴需要二创的视频链接，可留空处理已入库素材"
        />
        <button disabled={saving} onClick={runEditorAgent}>运行剪辑 Agent</button>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <section className="summary" aria-label="今日概况">
        <Metric label="要你处理" value={pendingCount} tone="red" />
        <Metric label="正在推进" value={activeCount} tone="blue" />
        <Metric label="成片版本" value={editorVersionCount} tone="green" />
      </section>

      <section className="focus-layout">
        <div className="queue">
          <div className="section-title">
            <h2>先看这些</h2>
            <span>{visibleTasks.length} 个关键任务</span>
          </div>

          {visibleTasks.map(task => (
            <button
              key={task.id}
              className={`task-row ${task.id === selectedTask?.id ? 'selected' : ''}`}
              onClick={() => setSelectedTaskId(task.id)}
            >
              <span className={`dot ${task.status}`} />
              <div>
                <strong>{task.title}</strong>
                <p>{stageLabel[task.stage]} · {agentName(state, task.ownerId)}</p>
              </div>
              <em>{statusLabel[task.status] || task.status}</em>
            </button>
          ))}
        </div>

        <aside className="decision">
          {selectedTask ? (
            <>
              <div className="decision-head">
                <span className={`status ${selectedTask.status}`}>{statusLabel[selectedTask.status] || selectedTask.status}</span>
                <span>{selectedAgent?.name || '未分配'}</span>
              </div>
              <h2>{selectedTask.title}</h2>
              <p>{selectedTask.summary}</p>

              <div className="plain-block">
                <span>交付物</span>
                <strong>{selectedTask.deliverable || '等待员工补齐交付物。'}</strong>
              </div>

              {selectedVideo ? (
                <div className="plain-block">
                  <span>关联热点</span>
                  <strong>{selectedVideo.title}</strong>
                  <p>{selectedVideo.marketingValue}</p>
                </div>
              ) : null}

              <textarea
                value={feedbackText}
                onChange={event => setFeedbackText(event.target.value)}
                placeholder="一句话反馈：通过、退回原因，或下一步指令。"
              />

              <div className="actions">
                <button disabled={saving} onClick={() => submitFeedback('approve', 'approved')}>通过</button>
                <button disabled={saving} onClick={() => submitFeedback('return', 'returned')}>退回</button>
                <button disabled={saving} onClick={() => submitFeedback('handoff', 'in_progress')}>继续做</button>
              </div>

              <div className="history">
                <span>最近反馈</span>
                {taskFeedback.slice(0, 2).map(item => (
                  <p key={item.id}>{item.comment}</p>
                ))}
                {!taskFeedback.length ? <p>暂无反馈。</p> : null}
              </div>
            </>
          ) : (
            <p>暂无任务。</p>
          )}
        </aside>
      </section>

      <section className="lower-grid">
        <Panel title="剪辑进度">
          {nextProject ? (
            <>
              <strong>{nextProject.title}</strong>
              <p>{nextProject.nextAction}</p>
              {nextProject.editorBrief ? (
                <div className="brief">
                  <span>剪辑 Agent 方案</span>
                  <p>{nextProject.editorBrief.hook}</p>
                  <p>{nextProject.editorBrief.caption}</p>
                </div>
              ) : null}
              {nextProject.editVersions?.length ? (
                <div className="version-list">
                  {nextProject.editVersions.map(version => (
                    <div key={version.id}>
                      <strong>{version.id} · {version.name}</strong>
                      <p>{version.editingStyle}</p>
                      <span>{version.outputUrl}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="steps">
                {(nextProject.steps || []).map(step => (
                  <span className={step.done ? 'done' : ''} key={step.name}>{step.name}</span>
                ))}
              </div>
            </>
          ) : (
            <p>暂无剪辑项目。</p>
          )}
        </Panel>

        <Panel title="素材队列">
          {materialQueue.slice(0, 3).map(item => (
            <div className="mini-row" key={item.id}>
              <strong>{item.platform}</strong>
              <span>{materialQueueStatusLabel(item.status)}</span>
            </div>
          ))}
          {!materialQueue.length ? <p>暂无素材队列。</p> : null}
        </Panel>

        <Panel title="交给推广">
          {promotionQueue.slice(0, 3).map(item => (
            <div className="handoff" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.instruction}</p>
              <span>{item.channel} · {item.versions?.length || 0} 个版本</span>
            </div>
          ))}
          {!promotionQueue.length ? <p>剪辑 Agent 输出成片后，会在这里交给推广 Agent。</p> : null}
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function primaryTasks(tasks) {
  const priority = { waiting_review: 0, returned: 1, blocked: 2, in_progress: 3, todo: 4, approved: 5 };
  return [...tasks]
    .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
    .slice(0, 6);
}

function agentName(state, id) {
  return state.agents.find(agent => agent.id === id)?.name || '未分配';
}

function defaultComment(action) {
  if (action === 'approve') return '通过，进入下一阶段。';
  if (action === 'return') return '退回修改，请按要求重新提交。';
  return '继续推进下一步。';
}

function materialQueueStatusLabel(status) {
  if (status === 'downloadable') return '可下载';
  if (status === 'download_in_progress') return '下载中';
  if (status === 'downloaded') return '已入库';
  if (status === 'reference_only') return '仅参考';
  if (status === 'failed') return '失败';
  return '待检查';
}
