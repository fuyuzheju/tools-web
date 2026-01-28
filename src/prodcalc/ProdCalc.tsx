import { useState, useEffect } from 'react';
import './ProdCalc.css';
import { useStore } from './store'; // 引入类型
import RootNodeCard from './NodeCard';
import SummaryModal from './SummaryModal';
import StatsPanel from './StatsPanel';
import Zoomer from './Zoomer';
import TabsBar from './TabsBar';

const useGlobalShortcuts = () => {
    const { 
        selectedNodeId, 
        copyNode, 
        pasteNode, 
        removeNode,
        selectNode 
    } = useStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. 如果焦点在输入框或文本域内，不触发快捷键（保留系统的复制粘贴文本功能）
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const MacOS = /mac/i.test(navigator.userAgent);
            const isCmdOrCtrl = MacOS ? e.metaKey : e.ctrlKey; // Windows用Ctrl, Mac用Command(Meta)

            if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
                if (selectedNodeId) {
                    e.preventDefault();
                    copyNode();
                }
            }

            if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
                if (selectedNodeId) {
                    e.preventDefault();
                    pasteNode();
                }
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedNodeId) {
                    e.preventDefault();
                    removeNode(selectedNodeId); 
                    selectNode(null);
                }
            }
            
            if (e.key === 'Escape') {
                selectNode(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeId, copyNode, pasteNode, removeNode, selectNode]);
};

export default function ProdCalc() {
    const {
        rootNode, projects, activeProjectId,
        addProject, switchProject, removeProject, selectNode,
    } = useStore();

    const [scale, setScale] = useState(1.0);
    const [isSummaryOpen, setSummaryOpen] = useState(false);

    useGlobalShortcuts();

    return (
        <div onClick={()=>selectNode(null)} className="app">
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
                <div className="tree-container" style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
                    {/* 加个 key 强制切换项目时重新渲染动画 */}
                    <RootNodeCard key={rootNode.id} node={rootNode} />
                </div>

                <Zoomer scale={scale} setScale={setScale} />
            </main>

        </div>
    );
}