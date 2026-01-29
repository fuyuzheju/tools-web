import React from "react";
import { useStore } from "./store";
import { useMemo, useRef } from "react";
import { saveData } from "./file";
import { type AllocNode } from "./core";

type AppStatus = 'error' | 'warning' | 'normal';

function StatsPanel({setSummaryOpen}:{setSummaryOpen: (open: boolean) => void}) {
    const {
        calculationResult, activePhase,
        activeProject, loadProject,
    } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveFile = () => {
        saveData(activeProject, `${activeProject.name || 'allocation'}-data.json`);
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

                if (typeof data.totalValue === 'number' && data.phases && data.phases[0].rootNode) {
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
            error: { label: '存在\n超额', icon: '️❌' },
            warning: { label: '有未\n分配', icon: '⚠️' },
            normal: { label: '分配\n完美', icon: '✅' }
        };

        return {
            stats: {
                totalNodes: countNodes(activePhase.rootNode),
                leafCount: countLeaves(activePhase.rootNode),
            },
            appStatus: currentStatus,
            statusLabel: config[currentStatus].label,
            statusIcon: config[currentStatus].icon
        };
    }, [calculationResult, activePhase]);

    return (
        <div className="stats-panel">
            <div className="panel-top">
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={handleFileChange}
                />

                <div className="action-group">
                    <button className="icon-btn secondary" onClick={handleOpenFile} title="导入当前页">
                        <span>打开</span>
                    </button>
                    <button className="icon-btn secondary" onClick={handleSaveFile} title="保存当前页">
                        <span>保存</span>
                    </button>
                </div>
            </div>
            <div className="divider-h"></div>
            <button className="summary-btn" onClick={() => setSummaryOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                </svg>
                汇总
            </button>
            <div className="divider-h"></div>
            <div className="stat-item">
                <span className="stat-label">所有<br></br>节点</span>
                <span className="stat-value">{stats.totalNodes}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">末级<br></br>分配</span>
                <span className="stat-value">{stats.leafCount}</span>
            </div>
            <div className={`stat-item ${appStatus}`}>
                <span className="stat-label" style={{whiteSpace: 'pre-line'}}>{statusLabel}</span>
                <span className="stat-icon">{statusIcon}</span>
            </div>
        </div>
    );
};

export default StatsPanel;