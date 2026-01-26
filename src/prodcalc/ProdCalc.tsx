import { useState } from 'react';
import './ProdCalc.css';
import { useStore, type ProjectData } from './store'; // 引入类型
import RootNodeCard from './NodeCard';
import SummaryModal from './SummaryModal';
import StatsPanel from './StatsPanel';
import Zoomer from './Zoomer';

interface Props {
    projects: ProjectData[];
    activeProjectId: string;
    switchProject: (id: string) => void;
    removeProject: (id: string) => void;
    addProject: () => void;
}

const TabsBar = ({ projects, activeProjectId, switchProject, removeProject, addProject }: Props) => {
    return (
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
    )
}

export default function ProdCalc() {
    const {
        rootNode, projects, activeProjectId,
        addProject, switchProject, removeProject
    } = useStore();

    const [scale, setScale] = useState(1.0);

    const [isSummaryOpen, setSummaryOpen] = useState(false);
    return (
        <div className="app">
            <SummaryModal isOpen={isSummaryOpen} onClose={() => setSummaryOpen(false)} />

            <header className="app-header">
                <div className="header-left">
                    <div className="title-group">
                        <h1>产值分配计算器</h1>
                    </div>
                </div>
                <button className="summary-btn" onClick={() => setSummaryOpen(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                    </svg>
                    汇总报表
                </button>
                <TabsBar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    addProject={addProject}
                    switchProject={switchProject}
                    removeProject={removeProject}
                />

            </header>

            <StatsPanel />

            <main className="app-main">
                <div className="tree-container" style={{ zoom: scale }}>
                    {/* 加个 key 强制切换项目时重新渲染动画 */}
                    <RootNodeCard key={rootNode.id} node={rootNode} />
                </div>

                <Zoomer scale={scale} setScale={setScale} />
            </main>

        </div>
    );
}