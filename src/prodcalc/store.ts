import { create } from 'zustand';
import { useMemo } from 'react';
import { type AllocNode, RuleType, calculateTree } from './core';

// --- 类型定义 ---
export interface ProjectData {
  id: string;
  name: string;
  totalValue: number;
  rootNode: AllocNode;
}

// 基础 State，只存核心数据和动作
interface BaseState {
  projects: ProjectData[];
  activeProjectId: string;
  collapsedNodes: Set<string>; // UI 状态可以共享，或者根据 ID 存

  // Actions
  addProject: () => void;
  switchProject: (id: string) => void;
  removeProject: (id: string) => void;
  updateProjectName: (id: string, name: string) => void;

  setTotalValue: (val: number) => void;
  updateNodeRule: (id: string, rule: Partial<AllocNode['rule']>) => void;
  addNode: (parentId: string, name: string) => void;
  deleteNode: (id: string) => void;
  updateNodeName: (id: string, name: string) => void;
  toggleCollapse: (id: string) => void;
  loadProject: (data: Omit<ProjectData, 'id' | 'name'>) => void;
}

// --- 辅助函数 ---
const createDefaultProject = (id: string, name: string): ProjectData => ({
  id,
  name,
  totalValue: 1000000,
  rootNode: {
    id: `root-${id}`,
    name: name,
    rule: { type: RuleType.FIXED, value: 0 },
    children: []
  }
});

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

// --- 创建基础 Store ---
// 注意：这里不再包含 get rootNode() 等计算属性
const useBaseStore = create<BaseState>((set) => {
  const initialId = 'proj-1';

  return {
    projects: [createDefaultProject(initialId, '新项目')],
    activeProjectId: initialId,
    collapsedNodes: new Set(),

    addProject: () => {
      set(state => {
        const newId = Math.random().toString(36);
        return {
          projects: [...state.projects, createDefaultProject(newId, `新项目`)],
          activeProjectId: newId,
          collapsedNodes: new Set()
        };
      });
    },

    switchProject: (id) => set({ activeProjectId: id, collapsedNodes: new Set() }),

    removeProject: (id) => {
      set(state => {
        if (state.projects.length <= 1) return state;
        const newProjects = state.projects.filter(p => p.id !== id);
        const newActiveId = state.activeProjectId === id ? newProjects[0].id : state.activeProjectId;
        return { projects: newProjects, activeProjectId: newActiveId };
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

    updateNodeRule: (nodeId, rule) => {
      set(state => {
        const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
        const newRoot = updateTree(activeProj.rootNode, nodeId, n => { n.rule = { ...n.rule, ...rule }; });
        return {
          projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, rootNode: newRoot } : p)
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
        const newCollapsed = new Set(state.collapsedNodes);
        newCollapsed.delete(parentId);

        return {
          projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, rootNode: newRoot } : p),
          collapsedNodes: newCollapsed
        };
      });
    },

    deleteNode: (id) => {
      set(state => {
        const activeProj = state.projects.find(p => p.id === state.activeProjectId)!;
        const newRoot = removeFromTree(activeProj.rootNode, id);
        return {
          projects: state.projects.map(p => p.id === state.activeProjectId ? { ...p, rootNode: newRoot } : p)
        };
      });
    },

    toggleCollapse: (id) => {
      set(state => {
        const newSet = new Set(state.collapsedNodes);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        return { collapsedNodes: newSet };
      });
    },

    loadProject: (data) => {
      set(state => {
        const newId = Math.random().toString(36);
        const newProject = {
          id: newId,
          name: data.rootNode.name,
          totalValue: data.totalValue,
          rootNode: data.rootNode
        };
        return {
          projects: [...state.projects, newProject],
          collapsedNodes: new Set(),
          activeProjectId: newId,
        }
      });
    }
  };
});

// --- 封装 Hook：在组件层动态计算当前数据 ---
export const useStore = () => {
  const state = useBaseStore();

  // 1. 获取当前激活的项目
  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];

  // 2. 实时计算结果（使用 useMemo 避免每次渲染都重算，仅在项目数据变化时计算）
  const calculationResult = useMemo(() => {
    return calculateTree(activeProject.rootNode, activeProject.totalValue);
  }, [activeProject.rootNode, activeProject.totalValue]);

  // 3. 返回合并后的对象，兼容之前的接口
  return {
    ...state,
    rootNode: activeProject.rootNode,
    totalValue: activeProject.totalValue,
    name: activeProject.name,
    calculationResult // 动态计算出的结果
  };
};