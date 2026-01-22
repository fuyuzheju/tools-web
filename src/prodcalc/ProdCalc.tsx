import React, { useMemo, useRef, useState } from 'react';
import { type AllocNode } from './core';
import './ProdCalc.css';
import { useStore } from './store'; // 引入类型
import NodeCard from './NodeCard';
import SummaryModal from './SummaryModal';
import { type ProjectData } from './store';

// ... StatsPanel 代码保持不变 ...
// (为了节省篇幅，StatsPanel 代码省略，请保留原样)
type AppStatus = 'error' | 'warning' | 'normal';

const StatsPanel: React.FC = () => {
    const { calculationResult, rootNode } = useStore();
  
    const { stats, appStatus, statusLabel, statusIcon } = useMemo(() => {
      // 递归计数逻辑保持不变
      const countNodes = (node: AllocNode): number =>
        1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
      const countLeaves = (node: AllocNode): number =>
        node.children.length === 0 ? 1 : node.children.reduce((sum, c) => sum + countLeaves(c), 0);
  
      const allResults = Object.values(calculationResult);
  
      // --- 核心状态判断逻辑 ---
      let currentStatus: AppStatus = 'normal';
      
      // 1. 检查是否有负数 (Error)
      // 条件：分配到的金额是负数 OR 分配给子节点后剩余金额是负数(超额)
      const hasError = allResults.some(r => r.isError);
  
      // 2. 检查是否有未分配完的余额 (Warning)
      // 条件：不是 Error 且 有未分配的余额
      const hasWarning = !hasError && allResults.some(r => r.isWarning);
  
      if (hasError) currentStatus = 'error';
      else if (hasWarning) currentStatus = 'warning';
  
      // 3. 配置 UI 文案和图标
      const config = {
        error:   { label: '存在超额', icon: '️❌' },
        warning: { label: '有未分配', icon: '⚠️' },
        normal:  { label: '分配完美', icon: '✅' }
      };
  
      return {
        stats: {
          totalNodes: countNodes(rootNode),
          leafCount: countLeaves(rootNode),
        },
        appStatus: currentStatus,
        statusLabel: config[currentStatus].label,
        statusIcon: config[currentStatus].icon
      };
    }, [calculationResult, rootNode]);
  
    // 根据状态动态生成 className
    // CSS 中需添加 .stat-item.warning { color: #f59e0b; bg: #fffbeb }
    return (
      <div className="stats-panel">
        <div className="stat-item">
          <span className="stat-value">{stats.totalNodes}</span>
          <span className="stat-label">总节点</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.leafCount}</span>
          <span className="stat-label">末级分配</span>
        </div>
        <div className={`stat-item ${appStatus}`}>
          <span className="stat-icon">{statusIcon}</span>
          <span className="stat-label">{statusLabel}</span>
        </div>
      </div>
    );
  };

export default function ProdCalc() {
  // 从 store 获取新属性
  const { 
    totalValue, setTotalValue, rootNode, name, loadProject, 
    projects, activeProjectId, addProject, switchProject, removeProject
  } = useStore();
  
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... handleSave, handleOpenFile 逻辑保持不变 ... 
  // 它们操作的是当前激活的项目
  const handleSave = async () => {
    // 1. 准备数据
    const data: ProjectData = {
      id: activeProjectId,
      name,
      totalValue,
      rootNode
    };
    const jsonString = JSON.stringify(data, null, 2);

    // 2. 尝试使用现代 File System Access API (支持 "另存为" 弹窗)
    // 目前支持: Chrome, Edge, Opera (需 HTTPS 或 localhost)
    if ('showSaveFilePicker' in window) {
      try {
        const options = {
          suggestedName: `${rootNode.name || 'allocation'}-data.json`,
          types: [
            {
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            },
          ],
        };
        // @ts-expect-error: new API that typescript does not recognize
        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return; // 保存成功，直接返回
      } catch (err: any) {
        // 如果用户点了取消，或者 API 调用失败，什么都不做或降级处理
        if (err.name === 'AbortError') return;
        console.warn('File System Access API failed, falling back to download.', err);
      }
    }

    // 3. 降级方案 (兼容 Firefox, Safari 或 旧版浏览器)
    // 弹出一个输入框询问文件名
    let fileName = prompt('请输入文件名', `${rootNode.name || 'allocation'}-data.json`);
    if (!fileName) return; // 用户点击取消
    if (!fileName.endsWith('.json')) fileName += '.json';

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- 打开文件逻辑 ---
  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        
        // 简单的格式校验
        if (typeof data.totalValue === 'number' && data.rootNode && data.rootNode.id) {
          loadProject(data);
        } else {
          alert('文件格式错误：无法识别的数据结构');
        }
      } catch (err) {
        alert('文件读取失败：无效的 JSON 文件');
        console.error(err);
      }
    };
    reader.readAsText(file);
    
    // 清空 input 使得同一个文件可以被重复选择
    e.target.value = '';
  };

  return (
    <div className="app">
      {/* 模态框 */}
      <SummaryModal isOpen={isSummaryOpen} onClose={() => setSummaryOpen(false)} />

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json"
        onChange={handleFileChange} // 请确保引用之前的 handleFileChange
      />

      <header className="app-header">
         {/* 左侧 Logo 保持不变 */}
        <div className="header-left">
             {/* ...SVG logo... */}
            <div className="title-group">
                <h1>产值分配计算器</h1>
            </div>
        </div>

        <div className="header-right">
            {/* 新增：汇总统计按钮 */}
            <button className="summary-btn" onClick={() => setSummaryOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                </svg>
                汇总报表
            </button>
            
            <div className="divider-v"></div>

            {/* 原有的打开/保存按钮 */}
            <div className="action-group">
                <button className="icon-btn secondary" onClick={handleOpenFile} title="导入当前页">
                    {/* ...icon... */} <span>导入</span>
                </button>
                <button className="icon-btn secondary" onClick={handleSave} title="保存当前页">
                    {/* ...icon... */} <span>保存</span>
                </button>
            </div>

            <div className="divider-v"></div>

            <div className="total-input-wrapper">
                <label>当前项目总产值</label>
                <div className="money-input-group">
                    <span className="currency-symbol">¥</span>
                    <input
                        type="number"
                        value={totalValue}
                        onChange={(e) => setTotalValue(Number(e.target.value))}
                        min={0}
                    />
                </div>
            </div>
        </div>
      </header>

      {/* 新增：标签页栏 */}
      <div className="tabs-bar">
        <div className="tabs-list">
            {projects.map(proj => (
                <div 
                    key={proj.id} 
                    className={`tab-item ${proj.id === activeProjectId ? 'active' : ''}`}
                    onClick={() => switchProject(proj.id)}
                >
                    <span className="tab-name">{proj.name}</span>
                    {projects.length > 1 && (
                        <span 
                            className="tab-close" 
                            onClick={(e) => { e.stopPropagation(); removeProject(proj.id); }}
                        >
                            &times;
                        </span>
                    )}
                </div>
            ))}
            <button className="add-tab-btn" onClick={addProject} title="新建项目">
                +
            </button>
        </div>
      </div>

      <StatsPanel />

      <main className="app-main">
        <div className="tree-container">
           {/* 加个 key 强制切换项目时重新渲染动画 */}
          <NodeCard key={rootNode.id} node={rootNode} level={0} isLast />
        </div>
      </main>

      <footer className="app-footer">
        {/* ... Legend 保持不变 ... */}
      </footer>
    </div>
  );
}