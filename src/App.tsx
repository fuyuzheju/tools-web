import React, { useMemo } from 'react';
import { useStore } from './store';
import { RuleType, type AllocNode } from './core';
import './App.css';

// --- 工具函数 ---
const formatMoney = (val: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(val);

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

// --- 规则类型配置 ---
const RULE_CONFIG = {
  [RuleType.PERCENTAGE]: { label: '比例', color: '#3b82f6', bg: '#eff6ff', icon: '%' },
  [RuleType.FIXED]: { label: '定额', color: '#10b981', bg: '#ecfdf5', icon: '¥' },
  [RuleType.REMAINDER]: { label: '剩余', color: '#8b5cf6', bg: '#f5f3ff', icon: '∞' },
};

// --- 进度条组件 ---
const ProgressBar: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  const width = Math.min(Math.max(percent * 100, 0), 100);
  return (
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
};

// --- 节点卡片组件 ---
const NodeCard: React.FC<{
  node: AllocNode;
  level: number;
  isLast: boolean;
}> = ({ node, level, isLast }) => {
  const {
    calculationResult,
    updateNodeRule,
    addNode,
    updateNodeName,
    deleteNode,
    collapsedNodes,
    toggleCollapse
  } = useStore();

  const result = calculationResult[node.id] || { amount: 0, percentOfParent: 0, isError: false };
  const isRoot = level === 0;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedNodes.has(node.id);
  const ruleConfig = RULE_CONFIG[node.rule.type];

  return (
    <div className={`tree-node ${isRoot ? 'is-root' : ''} ${isLast ? 'is-last' : ''}`}>

      {/* 连接线 - 只有非根节点才显示 */}
      {!isRoot && (
        <div className="connector">
          {/* 垂直线上半部分：从上方到节点中心 */}
          <div className="connector-v-top" />
          {/* 垂直线下半部分：从节点中心到底部，只在非最后节点显示 */}
          {!isLast && <div className="connector-v-bottom" />}
          {/* 水平线：从垂直线到节点卡片 */}
          <div className="connector-h" />
        </div>
      )}

      {/* 节点内容区域 */}
      <div className="node-content">
        {/* 节点主卡片 */}
        <div className="node-card">
          <div className={`node-card-content ${result.isError ? 'has-error' : ''} ${isRoot ? 'root-card' : ''}`}>

            {/* 折叠按钮 */}
            {hasChildren && (
              <button
                className="collapse-btn"
                onClick={() => toggleCollapse(node.id)}
                title={isCollapsed ? '展开' : '折叠'}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
                </svg>
              </button>
            )}

            {/* 左侧：规则标签 */}
            {!isRoot && (
              <div
                className="rule-badge"
                style={{ backgroundColor: ruleConfig.bg, color: ruleConfig.color }}
              >
                <span className="rule-icon">{ruleConfig.icon}</span>
                <span className="rule-label">{ruleConfig.label}</span>
              </div>
            )}

            {/* 中间：信息区 */}
            <div className="node-info">
              <input
                className="name-input"
                value={node.name}
                onChange={(e) => updateNodeName(node.id, e.target.value)}
                placeholder="输入名称"
              />

              {!isRoot && (
                <div className="rule-editor">
                  <select
                    className="rule-select"
                    value={node.rule.type}
                    onChange={(e) => updateNodeRule(node.id, { type: e.target.value as RuleType })}
                  >
                    <option value={RuleType.PERCENTAGE}>比例分配</option>
                    <option value={RuleType.FIXED}>定额分配</option>
                    <option value={RuleType.REMAINDER}>吸纳剩余</option>
                  </select>

                  {node.rule.type !== RuleType.REMAINDER && (
                    <div className="value-input-group">
                      <input
                        type="number"
                        className="value-input"
                        value={node.rule.value}
                        onChange={(e) => updateNodeRule(node.id, { value: Number(e.target.value) })}
                        min={0}
                      />
                      <span className="value-unit">
                        {node.rule.type === RuleType.PERCENTAGE ? '%' : '元'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧：金额和进度 */}
            <div className="node-result">
              <div className={`amount ${result.isError ? 'error' : ''}`}>
                {formatMoney(result.amount)}
              </div>
              {!isRoot && (
                <>
                  <div className="percent-label">
                    占比 {formatPercent(result.percentOfParent)}
                  </div>
                  <ProgressBar
                    percent={result.percentOfParent}
                    color={result.isError ? '#ef4444' : ruleConfig.color}
                  />
                </>
              )}
              {result.isError && (
                <div className="error-tip">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 0C2.7 0 0 2.7 0 6s2.7 6 6 6 6-2.7 6-6S9.3 0 6 0zm.5 9h-1V8h1v1zm0-2h-1V3h1v4z" />
                  </svg>
                  资金不足
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="node-actions">
              <button
                className="action-btn add"
                onClick={() => addNode(node.id, '新部门')}
                title="添加子节点"
              >
                <svg viewBox="0 0 14 14">
                  <path d="M7 3v8M3 7h8" />
                </svg>
              </button>

              {!isRoot && (
                <button
                  className="action-btn delete"
                  onClick={() => {
                    if (hasChildren) {
                      if (confirm(`确定删除"${node.name}"及其所有子节点吗？`)) {
                        deleteNode(node.id);
                      }
                    } else {
                      deleteNode(node.id);
                    }
                  }}
                  title="删除节点"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7h8" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 子节点容器 */}
        {hasChildren && !isCollapsed && (
          <div className="tree-children">
            {node.children.map((child, idx) => (
              <NodeCard
                key={child.id}
                node={child}
                level={level + 1}
                isLast={idx === node.children.length - 1}
              />
            ))}
          </div>
        )}

        {/* 折叠提示 */}
        {hasChildren && isCollapsed && (
          <div className="collapsed-hint" onClick={() => toggleCollapse(node.id)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 3l4 4-4 4" />
            </svg>
            <span>{node.children.length} 个子节点已折叠，点击展开</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 统计面板 ---
const StatsPanel: React.FC = () => {
  const { calculationResult, rootNode } = useStore();

  const stats = useMemo(() => {
    const countNodes = (node: AllocNode): number =>
      1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);

    const countLeaves = (node: AllocNode): number =>
      node.children.length === 0 ? 1 : node.children.reduce((sum, c) => sum + countLeaves(c), 0);

    const hasError = Object.values(calculationResult).some(r => r.isError);

    return {
      totalNodes: countNodes(rootNode),
      leafCount: countLeaves(rootNode),
      hasError
    };
  }, [calculationResult, rootNode]);

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
      <div className={`stat-item ${stats.hasError ? 'error' : 'success'}`}>
        <span className="stat-icon">{stats.hasError ? '⚠️' : '✓'}</span>
        <span className="stat-label">{stats.hasError ? '存在超额' : '分配正常'}</span>
      </div>
    </div>
  );
};

// --- 主应用 ---
export default function App() {
  const { totalValue, setTotalValue, rootNode } = useStore();

  return (
    <div className="app">
      {/* 顶部导航 */}
      <header className="app-header">
        <div className="header-left">
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