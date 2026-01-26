import React from "react";
import { useStore } from "./store";
import { useMemo, useRef } from "react";
import { saveData } from "./file";
import { type AllocNode } from "./core";

type AppStatus = 'error' | 'warning' | 'normal';

function StatsPanel() {
    const {
        totalValue, setTotalValue, calculationResult, rootNode,
        preAllocations, activeProjectId, name, loadProject,
    } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveFile = () => {
        saveData({
            id: activeProjectId,
            name: name,
            totalValue: totalValue,
            preAllocations: preAllocations,
            rootNode: rootNode,
        }, `${rootNode.name || 'allocation'}-data.json`);
    }

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


    const { stats, appStatus, statusLabel, statusIcon } = useMemo(() => {
        const countNodes = (node: AllocNode): number =>
            1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
        const countLeaves = (node: AllocNode): number =>
            node.children.length === 0 ? 1 : node.children.reduce((sum, c) => sum + countLeaves(c), 0);

        const allResults = Object.values(calculationResult);

        let currentStatus: AppStatus = 'normal';

        const hasError = allResults.some(r => r.isError);
        const hasWarning = !hasError && allResults.some(r => r.isWarning);

        if (hasError) currentStatus = 'error';
        else if (hasWarning) currentStatus = 'warning';

        const config = {
            error: { label: '存在超额', icon: '️❌' },
            warning: { label: '有未分配', icon: '⚠️' },
            normal: { label: '分配完美', icon: '✅' }
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

    return (
        <div className="stats-panel">
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
            <div className="divider-v"></div>

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
            <div className="divider-v"></div>
            <div className="panel-right">
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={handleFileChange}
                />

                <div className="action-group">
                    <button className="icon-btn secondary" onClick={handleOpenFile} title="导入当前页">
                        <span>导入</span>
                    </button>
                    <button className="icon-btn secondary" onClick={handleSaveFile} title="保存当前页">
                        <span>保存</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsPanel;