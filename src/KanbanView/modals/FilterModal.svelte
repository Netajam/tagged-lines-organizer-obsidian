<script lang="ts">
    import { writable } from "svelte/store";
    import type { ExpressionNode } from "../../types";
    import { parseExpression } from "../../utils/ expressionParserUtils";
  

    let expressionInput = "";
  const expressionTreeStore = writable<ExpressionNode | null>(null);

  // Function to handle input change
  function handleInputChange(event: Event) {
    expressionInput = (event.target as HTMLInputElement).value;
  }

  // Function to parse and validate the input expression
  function parseAndValidateExpression() {
    try {
      const expressionTree = parseExpression(expressionInput);
      expressionTreeStore.set(expressionTree);
      alert("Expression is valid!");
    } catch (error) {
      alert("Invalid expression: " + error.message);
    }
  }
</script>


<div>
  <h3>Create Filter</h3>
  <div class="example">
    <strong>Example of a correct expression:</strong> 
    <span class="example-code">((tag == "urgent" AND property == "priority" >= "high") OR (property == "status" == "To Do"))</span>
  </div>
  <input type="text" bind:value={expressionInput} on:input={handleInputChange} placeholder="Type your filter expression" />
  <button on:click={parseAndValidateExpression}>Validate Expression</button>
</div>


<style>
    .example {
      margin-bottom: 1em;
      color: #666;
    }
    .example-code {
      font-family: monospace;
      background: #f5f5f5;
      padding: 0.5em;
      display: inline-block;
    }
  </style>