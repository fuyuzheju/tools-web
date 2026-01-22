import React, { useMemo, useRef } from 'react';
import { type AllocNode } from './core';
import './App.css';
import { useStore, type ProjectData } from './store'; // 引入类型
import NodeCard from './NodeCard';
import RULE_CONFIG from './config';

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

// --- 主应用 ---
export default function App() {
  const { totalValue, setTotalValue, rootNode, loadProject } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 保存文件逻辑 ---
  const handleSave = async () => {
    // 1. 准备数据
    const data: ProjectData = {
      version: '1.0.0',
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
      {/* 隐藏的文件输入框 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json"
        onChange={handleFileChange}
      />

      {/* 顶部导航 */}
      <header className="app-header">
        <div className="header-left">
            {/* Logo 保持不变 */}
            <div className="logo">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                <path d="M16 8v16M8 16h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M10 12l6-4 6 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 20l6 4 6-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#8b5cf6" />
                    </linearGradient>
                </defs>
                </svg>
            </div>
            <div className="title-group">
                <h1>产值分配计算器</h1>
                <p>可视化配置 · 实时计算 · 灵活分配</p>
            </div>
        </div>

        <div className="header-right">
          {/* 新增：操作按钮组 */}
          <div className="action-group">
            <button className="icon-btn secondary" onClick={handleOpenFile} title="打开文件">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M3 15h6" /><path d="M6 12l3 3-3 3" />
              </svg>
              <span>打开</span>
            </button>
            <button className="icon-btn secondary" onClick={handleSave} title="保存文件">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>保存</span>
            </button>
          </div>

          <div className="divider-v"></div>

          <div className="total-input-wrapper">
            <label>项目总产值</label>
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

      {/* 统计面板 */}
      <StatsPanel />

      {/* 主内容区 */}
      <main className="app-main">
        <div className="tree-container">
          <NodeCard node={rootNode} level={0} isLast />
        </div>
      </main>

      {/* 图例 */}
      <footer className="app-footer">
        <div className="legend">
          <span className="legend-title">分配规则：</span>
          {Object.entries(RULE_CONFIG).map(([type, config]) => (
            <span key={type} className="legend-item" style={{ color: config.color }}>
              <span className="legend-dot" style={{ backgroundColor: config.color }} />
              {config.label}分配
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}