import type { ExpressionNode, LogicalOperator, FilterCondition } from "../types";

function parseExpression(input: string): ExpressionNode {
    const tokens = input.match(/\w+|==|!=|>|<|>=|<=|"[^"]*"|\(|\)|AND|OR/g);
    if (!tokens) throw new Error("Invalid input");
  
    let index = 0;
  
    function parse(): ExpressionNode {
      const token = tokens[index++];
  
      if (token === "(") {
        const left = parse();
        const operator = tokens[index++] as LogicalOperator;
        const right = parse();
        index++; // skip ")"
        return { type: "operator", operator, left, right };
      } else if (token && token.match(/^\w+$/)) {
        const nextToken = tokens[index];
        if (nextToken === "==") {
          index += 2; // skip '==' and value token
          const value = tokens[index - 1].replace(/"/g, "");
          const filter: FilterCondition = {
            type: "tag",
            tag: token,
            presence: true,
          };
          return { type: "condition", filter };
        } else {
          const operator = tokens[index++];
          const value = tokens[index++].replace(/"/g, "");
          const filter: FilterCondition = {
            type: "property",
            property: token,
            values: [value],
            presence: true,
          };
          return { type: "condition", filter };
        }
      } else {
        throw new Error("Unexpected token: " + token);
      }
    }
  
    return parse();
  }
  
  export { parseExpression };