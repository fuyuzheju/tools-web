import { RuleType, type AllocNode } from './core';
import { useStore } from './store';
import RULE_CONFIG from './config';

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