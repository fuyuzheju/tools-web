// src/core.ts

// --- 类型定义 ---

export const RuleType = {
    FIXED: "FIXED",
    PERCENTAGE: "PERCENTAGE",
    REMAINDER: "REMAINDER",
} as const;
export type RuleType = typeof RuleType[keyof typeof RuleType];

export interface NodeRule {
  type: RuleType;
  value: number; // 如果是 REMAINDER，此值通常忽略，或者作为权重
}

export interface AllocNode {
  id: string;
  name: string;
  rule: NodeRule;
  children: AllocNode[];
}

// 计算结果表，key是节点ID
export type CalculationMap = Record<string, {
  amount: number;   // 最终分到的钱
  percentOfParent: number; // 占父节点的实际比例
  isError: boolean; // 是否出现负数/超额
}>;

// --- 核心计算引擎 (纯函数) ---

export const calculateTree = (
  node: AllocNode,
  inputAmount: number,
  resultMap: CalculationMap = {}
): CalculationMap => {
  
  // 1. 记录当前节点的计算结果
  resultMap[node.id] = {
    amount: inputAmount,
    percentOfParent: 0, // 根节点或顶层由调用者决定，此处暂存
    isError: inputAmount < 0
  };

  if (!node.children || node.children.length === 0) {
    return resultMap;
  }

  // 2. 分类子节点
  const fixedNodes = node.children.filter(c => c.rule.type === RuleType.FIXED);
  const percentNodes = node.children.filter(c => c.rule.type === RuleType.PERCENTAGE);
  const remainderNodes = node.children.filter(c => c.rule.type === RuleType.REMAINDER);

  let remainingAmount = inputAmount;

  // 3. 第一轮：扣除固定金额 (优先级最高)
  fixedNodes.forEach(child => {
    const allocated = child.rule.value;
    remainingAmount -= allocated;
    
    // 递归计算子树
    calculateTree(child, allocated, resultMap);
    
    // 补全子节点的元数据
    resultMap[child.id].percentOfParent = inputAmount === 0 ? 0 : (allocated / inputAmount);
  });

  // 4. 第二轮：扣除百分比 (基于父节点总额)
  percentNodes.forEach(child => {
    const allocated = inputAmount * (child.rule.value / 100);
    remainingAmount -= allocated;

    calculateTree(child, allocated, resultMap);
    resultMap[child.id].percentOfParent = child.rule.value / 100;
  });

  // 5. 第三轮：分配剩余部分
  if (remainderNodes.length > 0) {
    // 如果有多个剩余节点，平分剩余额度 (你也可以改为按权重分)
    const amountPerNode = remainingAmount / remainderNodes.length;
    
    remainderNodes.forEach(child => {
      calculateTree(child, amountPerNode, resultMap);
      resultMap[child.id].percentOfParent = inputAmount === 0 ? 0 : (amountPerNode / inputAmount);
    });
  }

  return resultMap;
};