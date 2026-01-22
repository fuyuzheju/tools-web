import { RuleType } from "./core";

const RULE_CONFIG = {
  [RuleType.PERCENTAGE]: { label: '比例', color: '#3b82f6', bg: '#eff6ff', icon: '%' },
  [RuleType.FIXED]: { label: '定额', color: '#10b981', bg: '#ecfdf5', icon: '¥' },
  [RuleType.REMAINDER]: { label: '剩余', color: '#8b5cf6', bg: '#f5f3ff', icon: '∞' },
};
export default RULE_CONFIG;