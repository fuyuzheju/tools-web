import { RuleType, type AllocNode } from './core';
import { useStore, type DropPosition } from './store';
import RULE_CONFIG from './config';
import { useState } from 'react';

// --- 工具函数 ---
const formatMoney = (val: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0
  }).format(val);

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

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
    moveNode,
    collapsedNodes,
    toggleCollapse
  } = useStore();

  const [dragPosition, setDragPosition] = useState<DropPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const result = calculationResult[node.id] || { amount: 0, percentOfParent: 0, isError: false };
  const isRoot = level === 0;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedNodes.has(node.id);
  const ruleConfig = RULE_CONFIG[node.rule.type];

  const handleDragStart = (e: React.DragEvent) => {
    if (isRoot) { e.preventDefault(); return; }
    e.stopPropagation();
    
    // 标记 ID
    e.dataTransfer.setData('node-id', node.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // 延迟设置样式，避免拖拽时的 ghost image 也变成半透明
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. 如果拖拽的是根节点（虽然我们在 start 阻止了，但为了安全）或自己
    // 需要在 drop 时判断，这里仅做视觉处理

    // 2. 计算鼠标在元素内的位置
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top; // 鼠标距离元素顶部的距离
    const height = rect.height;

    // 3. 判定区域阈值 (例如：上下 25% 区域为插入，中间 50% 为变为子节点)
    const threshold = 0.25; 
    
    let position: DropPosition = 'inside';
    
    // 根节点只能接受 inside (无法在其前后插入兄弟)
    if (isRoot) {
        position = 'inside';
    } else {
        if (y < height * threshold) {
            position = 'before';
        } else if (y > height * (1 - threshold)) {
            position = 'after';
        }
    }

    // 优化：只有状态改变时才 set，减少渲染
    if (dragPosition !== position) {
        setDragPosition(position);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sourceId = e.dataTransfer.getData('node-id');
    const position = dragPosition;

    // 清理状态
    setDragPosition(null);

    // 校验
    if (!sourceId || !position) return;
    if (sourceId === node.id) return;

    // 执行移动
    moveNode(sourceId, node.id, position);
  };

  // 生成 class
  let dragClass = '';
  if (dragPosition === 'inside') dragClass = 'drag-inside';
  if (dragPosition === 'before') dragClass = 'drag-top';
  if (dragPosition === 'after')  dragClass = 'drag-bottom';

  return (
    <div className={`tree-node
                    ${isRoot ? 'is-root' : ''}
                    ${isLast ? 'is-last' : ''}
                    ${isDragging ? 'dragging' : ''}`}>

      {!isRoot && (
        <div className="connector">
          <div className="connector-v-top" />
          {!isLast && <div className="connector-v-bottom" />}
          <div className="connector-h" />
        </div>
      )}

      {/* 节点内容区域 */}
      <div className="node-content">
        {/* 节点主卡片 */}
        <div className="node-card">
          <div className={`node-card-content 
                          ${result.isError ? 'has-error' : ''} 
                          ${isRoot ? 'root-card' : ''} 
                          ${dragClass}`}
              draggable={!isRoot}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >

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
            </div>
            {hasChildren && 
              <div className={`node-unallocated ${result.isError ? 'error' : ''} ${result.isWarning ? 'warning' : ''}`}>
                  剩余{formatMoney(result.unallocated)}
              </div>
            }

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

export default NodeCard;