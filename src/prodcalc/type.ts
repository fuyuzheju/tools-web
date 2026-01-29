import { z } from "zod";

export const PreAllocationRuleSchema = z.enum(["FIXED", "PERCENTAGE"] as const);
export 


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

export interface PhaseData {
    id: string;
    name: string;
    phaseValue: number;
    preAllocations: PreAllocation[];
    rootNode: AllocNode;
    view: ProjectView; // UI相关内容
}

export interface ProjectData {
    id: string;
    name: string;
    totalValue: number;
    phases: PhaseData[];
}

export interface ProjectView {
    nodeLayouts: Record<string, NodeLayoutType>;
}

export type DropPosition = 'inside' | 'before' | 'after';
export type NodeLayoutType = 'collapsed' | 'horizontal' | 'vertical';