<script lang="ts">
  import TaggedLineOrganizerPlugin from '../main';
  import type { TaggedLine } from '../types';
  
  export let status: 'To Do' | 'Done';
  export let TaggedLine: TaggedLine;

  const plugin = TaggedLineOrganizerPlugin.getInstance();

  async function toggleStatus() {
    const newStatus = status === 'To Do' ? 'Done' : 'To Do';
    await toggleTaggedLineStatus(TaggedLine, newStatus);
  }

  async function toggleTaggedLineStatus(TaggedLine: TaggedLine, newStatus: 'To Do' | 'Done') {
    if (!TaggedLine || !plugin || !plugin.TaggedLineExtractor) {
      console.error('Unable to update TaggedLine status: plugin or TaggedLineExtractor is undefined');
      return;
    }
    try {
      await plugin.TaggedLineExtractor.updateTaskLineStatus(TaggedLine, newStatus);
      status = newStatus; // Update local status
      // Notify parent component that TaggedLine status has changed
      dispatchEvent(new CustomEvent('statusChanged', { detail: { TaggedLine, newStatus } }));
    } catch (error) {
      console.error('Failed to update Tagged Line Status:', error);
    }
  }
</script>

<div class="TaggedLine-checkbox">
<button type="button" aria-label="Toggle TaggedLine Status" on:click={toggleStatus}>
  <span class="checkbox">{status === 'To Do' ? '' : '✔'}</span>
</button>
</div>

<style>
.TaggedLine-checkbox {
  display: inline-flex;
  align-items: center;
  font-family: monospace;
  font-size: 1.5rem;
}

button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #f0f0f0;
}

.checkbox {
  font-size: 1.5rem;
  padding: none;
}

button:focus {
  outline: none;
  background-color: 0 0 0 2px #007acc;
}
</style>
