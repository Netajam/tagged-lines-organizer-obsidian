import type {ConditionNode,LogicalOperatorNode,ExpressionNode } from `../types`;
  
  export type ExpressionNode = ConditionNode | LogicalOperatorNode;
  
  export function generateConditionCode(node: ExpressionNode, getTaggedLinePropertyValue: (TaggedLine: any, property: string) => any): string {
    if (node.type === 'condition') {
      const filter = node.filter;
      if (filter.type === 'tag') {
        return `TaggedLine.tags.includes('${filter.tag}') === ${filter.presence}`;
      } else if (filter.type === 'property') {
        const propValue = `getTaggedLinePropertyValue(TaggedLine, '${filter.property}')`;
        if (filter.values.length === 0) {
          return `(${propValue} !== undefined) === ${filter.presence}`;
        } else {
          const valueCondition = filter.values.map(value => `${propValue} === '${value}'`).join(' || ');
          return `(${valueCondition}) === ${filter.presence}`;
        }
      }
    } else if (node.type === 'operator') {
      const leftCode = generateConditionCode(node.left, getTaggedLinePropertyValue);
      const rightCode = generateConditionCode(node.right, getTaggedLinePropertyValue);
      return `(${leftCode}) ${node.operator} (${rightCode})`;
    }
    return 'false';
  }