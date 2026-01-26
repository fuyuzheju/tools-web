import { RuleType, type AllocNode } from './core';
import { useStore, type DropPosition } from './store';
import RULE_CONFIG from './config';
import { PreAllocationRuleType } from './store';
import { Fragment, useState } from 'react';

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

const FoldButton: React.FC<{
    toggleCollapse: () => void,
    isCollapsed: boolean,
}> = ({ toggleCollapse, isCollapsed }) => {
    return <button
        className="collapse-btn"
        onClick={toggleCollapse}
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
}

const AddActionButton: React.FC<{
    addNode: (name: string) => void
}> = ({ addNode }) => {
    return <button
        className="action-btn add"
        onClick={() => addNode('')}
        title="添加子节点"
    >
        <svg viewBox="0 0 14 14">
            <path d="M7 3v8M3 7h8" />
        </svg>
    </button>
}

const RemoveActionButton: React.FC<{
    hasChildren: boolean,
    name: string,
    removeNode: () => void,
}> = ({ hasChildren, name, removeNode }) => {
    return <button
        className="action-btn delete"
        onClick={() => {
            if (hasChildren) {
                if (confirm(`确定删除"${name}"及其所有子节点吗？`)) {
                    removeNode();
                }
            } else {
                removeNode();
            }
        }}
        title="删除节点"
    >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h8" />
        </svg>
    </button>
}

// --- 工具函数 ---
const formatMoney = (val: number) =>
    new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        maximumFractionDigits: 0
    }).format(val);

const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

const handleDragStart = (
    e: React.DragEvent,
    isRoot: boolean,
    node: AllocNode,
    setIsDragging: (isDragging: boolean) => void,
) => {
    if (isRoot) { e.preventDefault(); return; }
    e.stopPropagation();

    e.dataTransfer.setData('node-id', node.id);
    e.dataTransfer.effectAllowed = 'move';

    setTimeout(() => setIsDragging(true), 0);
};

const handleDragEnd = (
    setIsDragging: (isDragging: boolean) => void,
    setDragPosition: (dragPosition: DropPosition | null) => void
) => {
    setIsDragging(false);
    setDragPosition(null);
};

const handleDragOver = (
    e: React.DragEvent,
    isRoot: boolean,
    dragPosition: DropPosition | null,
    setDragPosition: (dragPosition: DropPosition | null) => void,
) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    const threshold = 0.25;

    let position: DropPosition = 'inside';

    if (isRoot) {
        position = 'inside';
    } else {
        if (y < height * threshold) {
            position = 'before';
        } else if (y > height * (1 - threshold)) {
            position = 'after';
        }
    }

    if (dragPosition !== position) {
        setDragPosition(position);
    }
};

const handleDragLeave = (
    e: React.DragEvent,
    setDragPosition: (dragPosition: DropPosition | null) => void,
) => {
    e.preventDefault();
    e.stopPropagation();
    setDragPosition(null);
};

const handleDrop = (
    e: React.DragEvent,
    node: AllocNode,
    position: DropPosition | null,
    setDragPosition: (position: DropPosition | null) => void,
    moveNode: (sourceId: string, targetId: string, position: DropPosition) => void,
) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceId = e.dataTransfer.getData('node-id');

    setDragPosition(null);

    if (!sourceId || !position) return;
    if (sourceId === node.id) return;

    moveNode(sourceId, node.id, position);
};

const RootNodeCard: React.FC<{ node: AllocNode }> = ({ node }) => {
    const {
        calculationResult,
        preAllocations,
        totalValue,
        addNode,
        updateNodeName,
        moveNode,
        addPreAllocation,
        removePreAllocation,
        updatePreAllocationName,
        updatePreAllocationRule,
        collapsedNodes,
        toggleCollapse
    } = useStore();

    const [dragPosition, setDragPosition] = useState<DropPosition | null>(null);

    const result = calculationResult[node.id] || { amount: 0, percentOfParent: 0, isError: false };
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);

    // 生成 class
    const dragClass = dragPosition ? 'drag-inside' : '';

    return (
        <div className="tree-node is-root">
            <div className="node-content is-root">
                <div className="node-card">
                    <div
                        className={`node-card-content root-card ${dragClass}`}
                        draggable={false}
                        onDragOver={(e) => handleDragOver(e, true, dragPosition, setDragPosition)}
                        onDrop={(e) => handleDrop(e, node, dragPosition, setDragPosition, moveNode)}
                    >

                        <div className="root-card-info">
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                <div className="total-value-info">
                                    <input
                                        className="preallocation-name-input"
                                        value={node.name}
                                        onChange={(e) => updateNodeName(node.id, e.target.value)}
                                        placeholder="输入名称"
                                    />
                                    <div className="preallocation-value total-value">{formatMoney(totalValue)}</div>
                                </div>
                                {preAllocations.map(pa => {
                                    let preAllocationValue, preAllocationPercentage;
                                    switch (pa.rule.type) {
                                        case 'FIXED':
                                            preAllocationValue = pa.rule.value;
                                            preAllocationPercentage = pa.rule.value / totalValue;
                                            break;

                                        case 'PERCENTAGE':
                                            preAllocationValue = totalValue * pa.rule.value / 100;
                                            preAllocationPercentage = pa.rule.value / 100;
                                    }
                                    return <Fragment key={pa.id}>
                                        <div className="minus-char">-</div>

                                        <div className="preallocation-info">
                                            <div style={{ display: 'flex' }}>
                                                <button onClick={()=>removePreAllocation(pa.id)} className="remove-preallocation-button">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path 
                                                        d="M18 6L6 18M6 6l12 12" 
                                                        stroke="black" 
                                                        strokeWidth="2" 
                                                        strokeLinecap="round" 
                                                        strokeLinejoin="round"
                                                    />
                                                    </svg>
                                                </button>
                                                <input
                                                    value={pa.name}
                                                    onChange={(e)=>updatePreAllocationName(pa.id, e.target.value)}
                                                    placeholder="输入名称"
                                                    className="preallocation-name-input"
                                                >
                                                </input>
                                                <div className="preallocation-value-input-group">
                                                    <input
                                                        type="number"
                                                        value={pa.rule.value}
                                                        onChange={(e)=>updatePreAllocationRule(pa.id, {value: Number(e.target.value)})}
                                                        className="value-input">
                                                    </input>
                                                    <select
                                                        value={pa.rule.type}
                                                        onChange={(e)=>updatePreAllocationRule(pa.id, {type: e.target.value as PreAllocationRuleType})}
                                                        className="preallocation-value-select"
                                                    >
                                                        <option value={PreAllocationRuleType.FIXED}>¥</option>
                                                        <option value={PreAllocationRuleType.PERCENTAGE}>%</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="preallocation-value">
                                                {formatMoney(preAllocationValue)}（{formatPercent(preAllocationPercentage)}）
                                            </div>
                                        </div>
                                    </Fragment>
                                }
                                )}

                                <button className="add-preallocation-button" onClick={addPreAllocation}>+</button>
                            </div>
                            <div className="rest-value">
                                = {formatMoney(result.amount)}
                                <span style={{
                                    marginLeft: '24px',
                                    height: '100%',
                                    position: 'absolute',
                                    color: 'white',
                                    fontSize: '1rem',
                                }}>剩余{formatMoney(result.unallocated)}</span>
                            </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="node-actions">
                            <AddActionButton addNode={(name) => addNode(node.id, name)} />
                        </div>
                    </div>
                </div>

                {/* 子节点容器 */}
                {hasChildren && !isCollapsed && (
                    <div className="tree-children horizontal">
                        {node.children.map((child, idx) => (
                            <NodeCard
                                key={child.id}
                                node={child}
                                level={1}
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
}

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
        removeNode,
        moveNode,
        collapsedNodes,
        toggleCollapse
    } = useStore();

    const [dragPosition, setDragPosition] = useState<DropPosition | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const result = calculationResult[node.id] || { amount: 0, percentOfParent: 0, isError: false };
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const ruleConfig = RULE_CONFIG[node.rule.type];

    // 生成 class
    let dragClass = '';
    if (dragPosition === 'inside') dragClass = 'drag-inside';
    if (dragPosition === 'before') dragClass = 'drag-top';
    if (dragPosition === 'after') dragClass = 'drag-bottom';

    return (
        <div className={`tree-node
                    ${isLast ? 'is-last' : ''}
                    ${isDragging ? 'dragging' : ''}`}>

            {(level !== 1) && (
                <div className="connector">
                    <div className="connector-v-top" />
                    {!isLast && <div className="connector-v-bottom" />}
                    <div className="connector-h" />
                </div>
            )}

            {/* 节点内容区域 */}
            <div className={`node-content`}>
                {/* 节点主卡片 */}
                <div className="node-card">
                    <div className={`node-card-content 
                          ${result.isError ? 'has-error' : ''} 
                          ${dragClass}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, false, node, setIsDragging)}
                        onDragEnd={() => handleDragEnd(setIsDragging, setDragPosition)}
                        onDragOver={(e) => handleDragOver(e, false, dragPosition, setDragPosition)}
                        onDragLeave={(e) => handleDragLeave(e, setDragPosition)}
                        onDrop={(e) => handleDrop(e, node, dragPosition, setDragPosition, moveNode)}
                    >

                        {/* 折叠按钮 */}
                        {hasChildren && <FoldButton toggleCollapse={() => toggleCollapse(node.id)} isCollapsed={isCollapsed} />}

                        {/* 中间：信息区 */}
                        <div className="node-info">
                            <input
                                className="name-input"
                                value={node.name}
                                onChange={(e) => updateNodeName(node.id, e.target.value)}
                                placeholder="输入名称"
                            />

                            <div className="rule-editor">
                                <select
                                    className="rule-select"
                                    style={{ backgroundColor: ruleConfig.bg, color: ruleConfig.color }}
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
                        </div>

                        {/* 右侧：金额和进度 */}
                        <div className="node-result">
                            <div className={`amount ${result.isError ? 'error' : ''}`}>
                                {formatMoney(result.amount)}
                            </div>
                            <div className="percent-label">
                                占比 {formatPercent(result.percentOfParent)}
                            </div>
                            <ProgressBar
                                percent={result.percentOfParent}
                                color={result.isError ? '#ef4444' : ruleConfig.color}
                            />
                        </div>
                        {hasChildren &&
                            <div className={`node-unallocated ${result.isError ? 'error' : ''} ${result.isWarning ? 'warning' : ''}`}>
                                剩余{formatMoney(result.unallocated)}
                            </div>
                        }

                        {/* 操作按钮 */}
                        <div className="node-actions">
                            <AddActionButton addNode={(name) => addNode(node.id, name)} />
                            <RemoveActionButton hasChildren={hasChildren} name={node.name} removeNode={() => removeNode(node.id)} />
                        </div>
                    </div>
                </div>

                {/* 子节点容器 */}
                {hasChildren && !isCollapsed && (
                    <div className={`tree-children vertical`}>
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

export default RootNodeCard;