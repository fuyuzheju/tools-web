import { create } from 'zustand';
import { type AllocNode, RuleType, calculateTree, type CalculationMap } from './core';

interface AppState {
  totalValue: number;
  rootNode: AllocNode;
  calculationResult: CalculationMap;
  collapsedNodes: Set<string>; // 新增：记录折叠状态
  
  setTotalValue: (val: number) => void;
  updateNodeRule: (id: string, rule: Partial<AllocNode['rule']>) => void;
  addNode: (parentId: string, name: string) => void;
  deleteNode: (id: string) => void;
  updateNodeName: (id: string, name: string) => void;
  toggleCollapse: (id: string) => void;
}

// 深拷贝并查找节点更新
const updateTree = (root: AllocNode, targetId: string, updater: (node: AllocNode) => void): AllocNode => {
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
      
      // 自动展开父节点
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
  }
}));