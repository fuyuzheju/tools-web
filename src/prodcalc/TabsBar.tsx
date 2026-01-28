import { type ProjectData } from "./store";

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
                {projects.map((proj, idx) => (
                    <div
                        key={proj.id}
                        className={`tab-item ${proj.id === activeProjectId ? 'active' : ''}`}
                        style={{transform: `translateX(-${idx*4}px)`}}
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
            </div>
            <button className="add-tab-btn" onClick={addProject} title="新建项目">
                +
            </button>
        </div>
    )
}

export default TabsBar;
