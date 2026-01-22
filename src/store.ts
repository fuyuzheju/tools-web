import { create } from 'zustand';
import { type AllocNode, RuleType, calculateTree, type CalculationMap } from './core';

// 新增：定义保存文件的结构
export interface ProjectData {
  totalValue: number;
  rootNode: AllocNode;
  version: string; // 最好加个版本号，方便未来兼容
}

interface AppState {
  totalValue: number;
  rootNode: AllocNode;
  calculationResult: CalculationMap;
  collapsedNodes: Set<string>;

  setTotalValue: (val: number) => void;
  updateNodeRule: (id: string, rule: Partial<AllocNode['rule']>) => void;
  addNode: (parentId: string, name: string) => void;
  deleteNode: (id: string) => void;
  updateNodeName: (id: string, name: string) => void;
  toggleCollapse: (id: string) => void;

  // 新增：加载项目数据的方法
  loadProject: (data: ProjectData) => void;
}

// ... updateTree, removeFromTree, INITIAL_ROOT 保持不变 ...
// (为了节省篇幅，这里省略重复代码，请保留原有的辅助函数和 INITIAL_ROOT)

const updateTree = (root: AllocNode, targetId: string, updater: (node: AllocNode) => void): AllocNode => {
  // ... 原有逻辑
  const newRoot = { ...root, children: [...root.children] };
  if (newRoot.id === targetId) {
    updater(newRoot);
    return newRoot;
  }
  newRoot.children = newRoot.children.map(child => updateTree(child, targetId, updater));
  return newRoot;
};

// 从树中删除节点
const removeFromTree = (root: AllocNode, targetId: string): AllocNode => {
  // ... 原有逻辑
  const newRoot = { ...root, children: [...root.children] };
  newRoot.children = newRoot.children
    .filter(child => child.id !== targetId)
    .map(child => removeFromTree(child, targetId));
  return newRoot;
};

const INITIAL_ROOT: AllocNode = {
  id: 'root',
  name: '项目总产值',
  rule: { type: RuleType.FIXED, value: 0 },
  children: [
    {
      id: '1', name: '外包团队',
      rule: { type: RuleType.PERCENTAGE, value: 30 },
      children: [
        { id: '1-1', name: '设计外包', rule: { type: RuleType.PERCENTAGE, value: 40 }, children: [] },
        { id: '1-2', name: '开发外包', rule: { type: RuleType.REMAINDER, value: 0 }, children: [] },
      ]
    },
    {
      id: '2', name: '内部工程部',
      rule: { type: RuleType.REMAINDER, value: 0 },
      children: [
        { id: '2-1', name: '前端组', rule: { type: RuleType.PERCENTAGE, value: 35 }, children: [] },
        { id: '2-2', name: '后端组', rule: { type: RuleType.PERCENTAGE, value: 45 }, children: [] },
        { id: '2-3', name: '测试组', rule: { type: RuleType.REMAINDER, value: 0 }, children: [] },
      ]
    }
  ]
};

export const useStore = create<AppState>((set) => ({
  totalValue: 1000000,
  rootNode: INITIAL_ROOT,
  calculationResult: calculateTree(INITIAL_ROOT, 1000000),
  collapsedNodes: new Set<string>(),

  // ... 原有的 setTotalValue, updateNodeRule, updateNodeName, addNode, deleteNode, toggleCollapse ...
  setTotalValue: (val) => {
    set(state => ({
      totalValue: val,
      calculationResult: calculateTree(state.rootNode, val)
    }));
  },

  updateNodeRule: (id, newRule) => {
    set(state => {
      const newRoot = updateTree(state.rootNode, id, (node) => {
        node.rule = { ...node.rule, ...newRule };
      });
      return {
        rootNode: newRoot,
        calculationResult: calculateTree(newRoot, state.totalValue)
      };
    });
  },

  updateNodeName: (id, name) => {
    set(state => {
      const newRoot = updateTree(state.rootNode, id, (node) => { node.name = name });
      return { rootNode: newRoot };
    });
  },

  addNode: (parentId, name) => {
    set(state => {
      const newId = Math.random().toString(36).substr(2, 9);
      const newNode: AllocNode = {
        id: newId,
        name,
        rule: { type: RuleType.PERCENTAGE, value: 10 },
        children: []
      };

      const newRoot = updateTree(state.rootNode, parentId, (node) => {
        node.children = [...node.children, newNode];
      });

      const newCollapsed = new Set(state.collapsedNodes);
      newCollapsed.delete(parentId);

      return {
        rootNode: newRoot,
        calculationResult: calculateTree(newRoot, state.totalValue),
        collapsedNodes: newCollapsed
      };
    });
  },

  deleteNode: (id) => {
    set(state => {
      const newRoot = removeFromTree(state.rootNode, id);
      return {
        rootNode: newRoot,
        calculationResult: calculateTree(newRoot, state.totalValue)
      };
    });
  },

  toggleCollapse: (id) => {
    set(state => {
      const newSet = new Set(state.collapsedNodes);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { collapsedNodes: newSet };
    });
  },

  // --- 新增 Action ---
  loadProject: (data: ProjectData) => {
    set({
      totalValue: data.totalValue,
      rootNode: data.rootNode,
      // 重新计算结果
      calculationResult: calculateTree(data.rootNode, data.totalValue),
      // 加载新文件时，重置折叠状态
      collapsedNodes: new Set<string>()
    });
  }
}));