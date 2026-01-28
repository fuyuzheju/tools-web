import { create } from 'zustand';
import { useMemo } from 'react';
import { type AllocNode, RuleType, calculateTree } from './core';

export const PreAllocationRuleType = {
    FIXED: "FIXED",
    PERCENTAGE: "PERCENTAGE",
} as const;
export type PreAllocationRuleType = typeof PreAllocationRuleType[keyof typeof PreAllocationRuleType];
export interface PreAllocationRule {
    type: PreAllocationRuleType;
    value: number;
}
export interface PreAllocation {
    id: string,
    name: string,
    rule: PreAllocationRule,
}

export interface ProjectData {
    id: string;
    name: string;
    totalValue: number;
    preAllocations: PreAllocation[];
    rootNode: AllocNode;
    view: ProjectView; // UI相关内容
}

export interface ProjectView {
    nodeLayouts: Record<string, NodeLayoutType>;
}

export type DropPosition = 'inside' | 'before' | 'after';
export type NodeLayoutType = 'collapsed' | 'horizontal' | 'vertical';

interface BaseState {
    projects: ProjectData[];
    activeProjectId: string;

    addProject: () => void;
    switchProject: (id: string) => void;
    removeProject: (id: string) => void;
    loadProject: (data: Omit<ProjectData, 'name'>) => void;
    updateProjectName: (id: string, name: string) => void;

    setTotalValue: (val: number) => void;

    addPreAllocation: () => void;
    removePreAllocation: (id: string) => void;
    updatePreAllocationName: (id: string, name: string) => void;
    updatePreAllocationRule: (id: string, rule: Partial<PreAllocationRule>) => void;

    addNode: (parentId: string, name: string) => void;
    removeNode: (id: string) => void;
    moveNode: (sourceId: string, targetId: string, position: DropPosition) => void;
    updateNodeName: (id: string, name: string) => void;
    updateNodeRule: (id: string, rule: Partial<AllocNode['rule']>) => void;
    toggleNodeLayout: (id: string) => void;
}

// --- 辅助函数 ---
const findParent = (root: AllocNode, targetId: string): AllocNode | null => {
    if (root.children.some(c => c.id === targetId)) {
        return root;
    }
    for (const child of root.children) {
        const parent = findParent(child, targetId);
        if (parent) return parent;
    }
    return null;
};

const createDefaultProject = (id: string, layout: NodeLayoutType, name: string): ProjectData => ({
    id,
    name,
    totalValue: 1000000,
    preAllocations: [],
    rootNode: {
        id: `root-${id}`,
        name: name,
        rule: { type: RuleType.FIXED, value: 0 },
        children: []
    },
    view: {nodeLayouts: {[`root-${id}`]: layout}}
});

const findNode = (node: AllocNode, id: string): AllocNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
    }
    return null;
};

const isDescendant = (sourceNode: AllocNode, targetId: string): boolean => {
    if (sourceNode.id === targetId) return true;
    return sourceNode.children.some(child => isDescendant(child, targetId));
};

const applyPreAllcation = (totalValue: number, previousValue: number, preAllocation: PreAllocation): number => {
    if (preAllocation.rule.type === "FIXED") {
        return previousValue - preAllocation.rule.value;
    } else if (preAllocation.rule.type === "PERCENTAGE") {
        return previousValue - preAllocation.rule.value / 100 * totalValue;
    } else {
        throw Error;
    }
}

const updateTree = (root: AllocNode, targetId: string, updater: (node: AllocNode) => void): AllocNode => {
    const newRoot = { ...root, children: [...root.children] };
    if (newRoot.id === targetId) {
        updater(newRoot);
        return newRoot;
    }
    newRoot.children = newRoot.children.map(child => updateTree(child, targetId, updater));
    return newRoot;
};

const removeFromTree = (root: AllocNode, targetId: string): AllocNode => {
    const newRoot = { ...root, children: [...root.children] };
    newRoot.children = newRoot.children
        .filter(child => child.id !== targetId)
        .map(child => removeFromTree(child, targetId));
    return newRoot;
};

const useBaseStore = create<BaseState>((set) => {
    const initialId = Math.random().toString(36);

    return {
        projects: [createDefaultProject(initialId, 'horizontal', '新项目')],
        activeProjectId: initialId,

        addProject: () => {
            set(state => {
                const newId = Math.random().toString(36);
                return {
                    projects: [...state.projects, createDefaultProject(newId, 'horizontal', `新项目`)],
                    activeProjectId: newId,
                };
            });
        },

        switchProject: (id) => set({ activeProjectId: id }),

        removeProject: (id) => {
            set(state => {
                if (state.projects.length <= 1) return state;
                const newProjects = state.projects.filter(p => p.id !== id);
                const newActiveId = state.activeProjectId === id ? newProjects[0].id : state.activeProjectId;
                return { projects: newProjects, activeProjectId: newActiveId };
            });
        },

        loadProject: (data) => {
            set(state => {
                if (state.projects.find(p => p.id === data.id)) {
                    return {
                        activeProjectId: data.id,
                    }
                }
                const newProject: ProjectData = {
                    id: data.id,
                    name: data.rootNode.name,
                    totalValue: data.totalValue,
                    preAllocations: data.preAllocations,
                    rootNode: data.rootNode,
                    view: data.view,
                };
                return {
                    projects: [...state.projects, newProject],
                    activeProjectId: data.id,
                }
            });
        },

        updateProjectName: (id, name) => {
            set(state => ({
                projects: state.projects.map(p =>
                    p.id === id
                        ? { ...p, name: name, rootNode: { ...p.rootNode, name: name } }
                        : p
                )
            }));
        },

        setTotalValue: (val) => {
            set(state => ({
                projects: state.projects.map(p =>
                    p.id === state.activeProjectId ? { ...p, totalValue: val } : p
                )
            }));
        },

        addPreAllocation: () => {
            const newPreAllocation: PreAllocation = {
                id: Math.random().toString(36),
                name: '',
                rule: { type: "PERCENTAGE", value: 10 },
            }
            set(state => ({
                projects: state.projects.map(p =>
                    p.id === state.activeProjectId ? { ...p, preAllocations: [...p.preAllocations, newPreAllocation] } : p
                )
            }))
        },

        removePreAllocation: (id) => {
            set(state => ({
                projects: state.projects.map(p =>
                    p.id === state.activeProjectId ?
                        { ...p, preAllocations: p.preAllocations.filter(pa => pa.id !== id) }
                        : p
                )
            }))
        },

        updatePreAllocationName(id, name) {
            set(state => ({
                projects: state.projects.map(p =>
                    p.id === state.activeProjectId ?
                        {
                            ...p, preAllocations: p.preAllocations.map(pa =>
                                pa.id === id ? { ...pa, name: name } : pa
                            )
                        }
                        : p
                )
            }))
        },

        updatePreAllocationRule(id, rule) {
            set(state => ({
                projects: state.projects.map(p =>
                    p.id === state.activeProjectId ?
                        {
                            ...p, preAllocations: p.preAllocations.map(pa =>
                                pa.id === id ? { ...pa, rule: { ...pa.rule, ...rule } } : pa
                            )
                        }
                        : p
                )
            }))
        },

        addNode: (parentId, name) => {
            set(state => {
                const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
                const newId = Math.random().toString(36);
                const newNode: AllocNode = {
                    id: newId,
                    name,
                    rule: { type: RuleType.PERCENTAGE, value: 10 },
                    children: []
                };
                const newRoot = updateTree(activeProj.rootNode, parentId, n => {
                    n.children = [...n.children, newNode];
                });
                const newView: ProjectView = {
                    nodeLayouts: {...activeProj.view.nodeLayouts, [newId]: 'vertical'},
                }

                return {
                    projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, rootNode: newRoot, view: newView } : p),
                };
            });
        },

        removeNode: (id) => {
            set(state => {
                const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
                const newRoot = removeFromTree(activeProj.rootNode, id);
                const {[id]: _, ...newNodeLayouts} = activeProj.view.nodeLayouts;
                const newView: ProjectView = {
                    nodeLayouts: newNodeLayouts,
                }
                return {
                    projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, rootNode: newRoot, view: newView } : p)
                };
            });
        },

        moveNode: (sourceId, targetId, position) => {
            set(state => {
                const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
                const root = activeProj.rootNode;

                if (sourceId === root.id) return state;
                if (sourceId === targetId) return state;

                const sourceNode = findNode(root, sourceId);
                if (!sourceNode) return state;

                if (isDescendant(sourceNode, targetId)) {
                    return state;
                }
                let newRoot = removeFromTree(root, sourceId);

                if (position === 'inside') {
                    newRoot = updateTree(newRoot, targetId, (node) => {
                        node.children = [...node.children, sourceNode];
                    });
                } else {
                    if (targetId === root.id) {
                        newRoot = updateTree(newRoot, targetId, (node) => {
                            node.children.push(sourceNode);
                        });
                    } else {
                        const parent = findParent(newRoot, targetId);
                        if (parent) {
                            newRoot = updateTree(newRoot, parent.id, (parentNode) => {
                                const targetIndex = parentNode.children.findIndex(c => c.id === targetId);
                                if (targetIndex !== -1) {
                                    const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
                                    const newChildren = [...parentNode.children];
                                    newChildren.splice(insertIndex, 0, sourceNode);
                                    parentNode.children = newChildren;
                                }
                            });
                        }
                    }
                }

                return {
                    projects: state.projects.map(p =>
                        p.id === state.activeProjectId ? { ...p, rootNode: newRoot } : p
                    )
                };
            });
        },

        updateNodeName: (nodeId, name) => {
            set(state => {
                const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
                const isRoot = nodeId === activeProj.rootNode.id;

                if (isRoot) {
                    // avoid repeated names
                    const isDuplicate = state.projects.some(p =>
                        p.id !== activeProj.id && p.name === name
                    );

                    if (isDuplicate) {
                        alert(`项目名称 "${name}" 已存在，请使用其他名称。`);
                        return state; // 直接返回原状态，不进行更新
                    }
                }

                const newRoot = updateTree(activeProj.rootNode, nodeId, n => { n.name = name; });
                let newName = activeProj.name;
                if (isRoot) newName = name;
                return {
                    projects: state.projects.map(p =>
                        p.id === state.activeProjectId ? { ...p, rootNode: newRoot, name: newName } : p
                    )
                };
            });
        },

        updateNodeRule: (nodeId, rule) => {
            set(state => {
                const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
                const newRoot = updateTree(activeProj.rootNode, nodeId, n => { n.rule = { ...n.rule, ...rule }; });
                return {
                    projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, rootNode: newRoot } : p)
                };
            });
        },

        toggleNodeLayout: (id) => {
            set(state => {
                let newLayout: NodeLayoutType;
                switch (state.projects.find(p => p.id === state.activeProjectId)!.view.nodeLayouts[id]) {
                    case 'collapsed':
                        newLayout = 'vertical';
                        break;
                    case 'vertical':
                        newLayout = 'horizontal';
                        break;
                    case 'horizontal':
                        newLayout = 'collapsed';
                        break;
                }
                const activeProject = state.projects.find(p => p.id === state.activeProjectId)!;
                const newNodeLayouts = {...activeProject.view.nodeLayouts, [id]: newLayout};
                console.log(`toggle node layout ${newLayout}`);
                return {
                    projects: state.projects.map(p => 
                        p.id !== state.activeProjectId ? p :
                            {...p, view: {...p.view, nodeLayouts: newNodeLayouts}}
                    )
                }
            });
        },

    };
});

// 封装useBaseStore hook
export const useStore = () => {
    const state = useBaseStore();

    const activeProject = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];
    const restValue = activeProject.preAllocations.reduce(
        (prev, curr) => applyPreAllcation(activeProject.totalValue, prev, curr),
        activeProject.totalValue
    );

    const calculationResult = useMemo(() => {
        return calculateTree(activeProject.rootNode, restValue);
    }, [activeProject.rootNode, restValue]);

    return {
        ...state,
        rootNode: activeProject.rootNode,
        preAllocations: activeProject.preAllocations,
        totalValue: activeProject.totalValue,
        restValue: restValue,
        name: activeProject.name,
        view: activeProject.view,
        calculationResult
    };
};