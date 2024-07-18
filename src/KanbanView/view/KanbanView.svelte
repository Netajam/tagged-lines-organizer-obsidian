<script lang="ts">
  import { onMount } from 'svelte';
  import  KanbanViewModel  from '../viewModel/KanbanViewModel';
  import TaggedLineStatus from '../../components/TaggedLineStatus.svelte';
  import type {TaggedLine ,FilterConfig} from '../../types';
import type { KanbanContainer } from 'src/KanbanContainer';
  import {printReadableStore} from '../../utils/consoleLogging';
  import { get, writable, } from 'svelte/store';
  import FilterModal from '../modals/FilterModal.svelte';
	import { logger } from 'src/utils/logger';

  
  
  export let initialViewConfig;
  export let TaggedLinesStore;
  export let container:KanbanContainer;
  logger.info(`00060: This is the viewConfig received by the View${initialViewConfig}`,initialViewConfig);
  logger.info(TaggedLinesStore);
  logger.info(`This is the loaded container on the view ${container.toString()}`);
  const viewModel = new KanbanViewModel(container,TaggedLinesStore, initialViewConfig);
  const {viewConfigStore: viewConfig,TaggedLinesByColumnStore, groupedTaggedLinesInsideColumnsStore} = viewModel;

  logger.info(`Log 522 ${printReadableStore(TaggedLinesByColumnStore)})`);
  $: columns = $viewConfig.columns;
  $: groupedTaggedLinesByColumn = $TaggedLinesByColumnStore;
  $: groupedTaggedLinesInsideColumn= $groupedTaggedLinesInsideColumnsStore;
  $: viewConfigStore= $viewConfig;
  $: selectedProperty=$viewConfig.selectedProperty; 
  $: appliedFilter=$viewConfig.filters;  
  $: appliedGroupBy=$viewConfig.groupby;  
  $: appliedOrderBy=$viewConfig.sorts; 
  $: isGroupingActive = viewModel.isGroupingActive;   
  onMount(async() => {
    await viewModel.updateTaggedLinesStore();
    logger.info("Trigger Fetch TaggedLine happend successfully");
  });
// Selected folder

$: selectedFolder = $viewConfig.selectedFolder;
logger.info(`00061`+`${JSON.stringify(selectedFolder)}`);
$: isFolderSuggestionsVisible = viewModel.isFolderSuggestionsVisibleStore;
$: folderSuggestions = viewModel.folderSuggestionsStore;

// Main Tag
$: selectedMainTag = $viewConfig.lineTag;

let isResizing = false;
let resizingColumnIndex: number | null = null;
let startX: number;
let startWidth: number;
let showTags = true;
let showProperties = true;
let showTaggedLineBullet = true;
let showFolders = true; 
let menuExpanded = false;
let hoverTimeout: NodeJS.Timeout;
let kanbanContainer: HTMLElement;
// Collapsable Header
let allTaggedLineHeadersCollapsed = false;
const TaggedLineHeaderStates = writable<Record<string, boolean>>({});
// Filter
let showFilterModal = false;


function startResize(event: MouseEvent, index: number) {
  isResizing = true;
  resizingColumnIndex = index;
  startX = event.clientX;
  startWidth = ((event.target as HTMLElement).closest('.kanban-column') as HTMLElement)?.offsetWidth || 0;
  window.addEventListener('mousemove', resize);
  window.addEventListener('mouseup', stopResize);
}

function resize(event: MouseEvent) {
  if (!isResizing) return;
  const diff = event.clientX - startX;
  const newWidth = startWidth + diff;
  if (resizingColumnIndex !== null) {
    const column = document.querySelector(`.kanban-column:nth-child(${resizingColumnIndex + 1})`) as HTMLElement;
    if (column) {
      column.style.width = `${newWidth}px`;
    }
  } 
}

function stopResize() {
  if (isResizing && resizingColumnIndex !== null) {
    const column = document.querySelector(`.kanban-column:nth-child(${resizingColumnIndex + 1})`) as HTMLElement;
    if (column) {
      viewModel.updateColumnWidth(resizingColumnIndex, column.offsetWidth);
    }
  }
  isResizing = false;
  resizingColumnIndex = null;
  window.removeEventListener('mousemove', resize);
  window.removeEventListener('mouseup', stopResize);
}
function resizeColumns(width: number) {
  columns.forEach((_, index) => {
    const column = document.querySelector(`.kanban-column:nth-child(${index + 1})`) as HTMLElement;
    if (column) {
      column.style.width = `${width}px`;
      viewModel.updateColumnWidth(index, width);
    }
  });
}
function handleBlurEvent(e: FocusEvent, TaggedLine: TaggedLine, viewModel: any) {
  const target = e.target as HTMLElement;
  if (target) {
    viewModel.triggerUpdateTaggedLineDescription(TaggedLine, target.textContent || '');
  }
}
function toggleTags() { 
  showTags = !showTags;
}

function toggleProperties() {
  showProperties = !showProperties;
}

function toggleTaggedLineBullet() {
  showTaggedLineBullet = !showTaggedLineBullet;
}
function toggleFolders() {
  showFolders = !showFolders;
}
function toggleMenu() {
    menuExpanded = !menuExpanded;
  }

function showHoverMessage(event: MouseEvent) {
  const target = event.target as HTMLElement;
  hoverTimeout = setTimeout(() => {
    target.setAttribute('data-tooltip', 'Open in notes');
  }, 500);
}

function hideHoverMessage(event: MouseEvent) {
  const target = event.target as HTMLElement;
  clearTimeout(hoverTimeout);
  target.removeAttribute('data-tooltip');
}

function moveColumnLeft(index: number) {
  if (index > 0) {
    const columnToMove = columns[index];
    columns.splice(index, 1);
    columns.splice(index - 1, 0, columnToMove);
    columns = columns;
    scrollToColumn(index - 1);
  }
}

function moveColumnRight(index: number) {
  if (index < columns.length - 1) {
    const columnToMove = columns[index];
    columns.splice(index, 1);
    columns.splice(index + 1, 0, columnToMove);
    columns = columns;
    scrollToColumn(index + 1);
  }
}

function scrollToColumn(index: number) {
  const columnWidth = kanbanContainer.querySelector('.kanban-column')?.clientWidth || 0;
  const scrollPosition = index * columnWidth;
  kanbanContainer.scrollTo({
    left: scrollPosition,
    behavior: 'smooth'
  });}

//TaggedLine Section
function getFolderName(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length > 1) {
    return parts[parts.length - 2];// Return the parent folder name
  }
  return 'Root'; // If the file is in the root directory
}
//Collapsable Header
function toggleAllTaggedLineHeaders() {
  allTaggedLineHeadersCollapsed = !allTaggedLineHeadersCollapsed;
  TaggedLineHeaderStates.update(states => {
    Object.keys(states).forEach(TaggedLineId => {
      states[TaggedLineId] = allTaggedLineHeadersCollapsed;
    });
    return states;
  });}
// Filtering
function openFilterModal() {
  showFilterModal = true;
}

function applyFilter(event: CustomEvent<FilterConfig>) {
  viewModel.applyFilter(event.detail);
  showFilterModal = false;
}

function cancelFilter() {
  showFilterModal = false;
}


function toggleTaggedLineHeader(TaggedLineId: string) {
  TaggedLineHeaderStates.update(states => {
    states[TaggedLineId] = !states[TaggedLineId];
    return states;
  });
}

function isTaggedLineHeaderCollapsed(TaggedLineId: string) {
  return get(TaggedLineHeaderStates)[TaggedLineId] ?? false;
}
function saveView() {
  viewModel.triggerSaveView(showProperties, showTags, showTaggedLineBullet, showFolders, allTaggedLineHeadersCollapsed);
}

onMount(async () => {
  await viewModel.updateTaggedLinesStore();
  logger.info("Trigger Fetch TaggedLine happened successfully");
  
  // Initialize TaggedLineHeaderStates for each TaggedLine
  const currentTaggedLinesByColumn = get(TaggedLinesByColumnStore);
  const initialStates: Record<string, boolean> = {};
  Object.values(currentTaggedLinesByColumn).forEach(columnTaggedLines => {
    columnTaggedLines.forEach(TaggedLine => {
      initialStates[TaggedLine.id] = false;
    });
  });
  TaggedLineHeaderStates.set(initialStates);
});
function clearSelectedInfo(info: string) {
    switch (info) {
      case 'folder':
        selectedFolder = '';
        break;
      case 'property':
        selectedProperty = '';
        break;
      case 'filter':
        appliedFilter = '';
        break;
      case 'goupBy':
        appliedGroupBy = '';
        break;
      case 'orderBy':
        appliedOrderBy = '';
        break;
    }
  }


  
</script>
<div class=kanban-view>
<div class="kanban-header">
  <div class="header-left">
    <h2>{viewConfigStore.name}</h2>
    <div class="button-selection-section">
      <div class="button-line"> 
        <button on:click={()=>viewModel.triggerOpenPropertySelection()}>Tagged Lines to fetch</button>
        {#if selectedMainTag}
          <p>
            Line Tag: 
            <span class="info-value">{selectedMainTag}</span>
            <button class="delete-btn" on:click={() => clearSelectedInfo('tag')}>×</button>
          </p>
        {/if}
      </div>
    </div>
      <div class="button-selection-section">
      <div class="button-line"> 
        <button on:click={()=>viewModel.triggerOpenPropertySelection()}>Select Tag Line</button>
        {#if selectedProperty}
        <p> Selected Property: </p>
        <div class="info-value-container">
          <span class="info-value">{selectedProperty}</span>
          <div class="delete-btn-container">
            <button class="delete-btn" on:click={() => clearSelectedInfo('property')}>×</button>
          </div>
        </div>
        {/if}
      </div>
    </div>
    <div class="folder-button-selection-section">
      <div class="folder-selection-button-line"> 
       <button on:click={() => viewModel.changeSelectedFolderAndUpdateStores(selectedFolder)}>Select Folder</button>
        <input 
          type="text" 
          placeholder={selectedFolder || "No folder selected"} 
          on:input={(e)=>viewModel.handleFolderInput(e)}
          on:focus={()=>viewModel.showFolderSuggestions()}
          style="width: 300px;"
        />
        {#if $isFolderSuggestionsVisible}
          <ul class="folder-suggestions">
            {#each $folderSuggestions as folder}
              <li on:click={() => viewModel.triggerSelectFolder(folder)}>{folder}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
   <div class="button-selection-section">
      <div class="button-line"> 
        <button on:click={()=>viewModel.triggerOpenPropertySelection()}>Select Property</button>
        {#if selectedProperty}
          <p>
            Selected Property: 
            <span class="info-value">{selectedProperty}</span>
            <button class="delete-btn" on:click={() => clearSelectedInfo('property')}>×</button>
          </p>
       {/if}
      </div>
    </div>
    <div class="button-selection-section">
      <div class="button-line"> 
        <button on:click={openFilterModal}>Filter TaggedLines</button>
        {#if appliedFilter}
        <p>
          Filter Applied: 
          <span class="info-value">{appliedFilter}</span>
          <button class="delete-btn" on:click={() => clearSelectedInfo('filter')}>×</button>
        </p>
        {/if}
        {#if showFilterModal}
        <FilterModal
          filterConfig={viewModel.filterConfig}
          availableTags={viewModel.availableTags}
          availableProperties={viewModel.availableProperties}
          on:applyFilter={applyFilter}
          on:cancelFilter={cancelFilter}
        />
        {/if}
      </div>
    </div>
    <div class="button-selection-section">
      <div class="button-line"> 
        <button on:click={()=>viewModel.triggerGroupBy()}>Group By</button>
        {#if appliedGroupBy}
        <p>
          Group By Applied: 
          <span class="info-value">{appliedGroupBy[0]?.type}</span>
          <button class="delete-btn" on:click={() => clearSelectedInfo('groupBy')}>×</button>
        </p>
        {/if}
      </div>
    </div>
    <div class="button-selection-section">
      <div class="button-line"> 
        <button on:click={()=>viewModel.triggerOrderBy()}>Order By</button>
        {#if appliedOrderBy}
        <p>
          Order By Applied: 
          <span class="info-value">{appliedOrderBy}</span>
          <button class="delete-btn" on:click={() => clearSelectedInfo('orderBy')}>×</button>
        </p>
      {/if}
      </div>
    </div>
  </div>
  
  <div class="header-right">
    <div class="view-management">
      <button on:click={saveView}>Save View</button>
      <button on:click={()=>viewModel.triggerLoad()}>Load</button>
      <button on:click={()=>viewModel.triggerNewView()}>New</button>
      <button on:click={()=>viewModel.updateTaggedLinesStore()}>Refresh View</button>
    </div>
    <div class="toggle-menu">
      <div class="menu-header" on:click={toggleMenu}>
        <span>Toggle Options</span>
        <span>{menuExpanded ? '▲' : '▼'}</span>
      </div>
      <div class={`menu-content ${menuExpanded ? 'expanded' : ''}`}>
        <div class="toggle-buttons">
          <div>
            <label class="switch">
              <input type="checkbox" checked={showTags} on:change={toggleTags}>
              <span class="slider"></span>
            </label>
            <span>Toggle Tags</span>
          </div>
          
          <div>
            <label class="switch">  
              <input type="checkbox" checked={showProperties} on:change={toggleProperties}>
              <span class="slider"></span>
            </label>
            <span>Toggle Properties</span>
          </div>
          
          <div>
            <label class="switch">
              <input type="checkbox" checked={showTaggedLineBullet} on:change={toggleTaggedLineBullet}> 
              <span class="slider"></span>
            </label>
            <span>Toggle TaggedLine Bullet</span>
          </div>
          
          <div>
            <label class="switch">
              <input type="checkbox" checked={showFolders} on:change={toggleFolders}>
              <span class="slider"></span>  
            </label>
            <span>Toggle Folders</span>
          </div>
          
          <div>
            <label class="switch">
              <input type="checkbox" checked={allTaggedLineHeadersCollapsed} on:change={toggleAllTaggedLineHeaders}>
              <span class="slider"></span>
            </label>
            <span>Collapse/Expand All TaggedLine Headers</span>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</div>

<div >
  <button on:click={()=>viewModel.triggerAddColumn()}>Add Column</button>
</div>
<div class="kanban-container" bind:this={kanbanContainer} >
  {#each columns as column, index (column.id)}
  <div class="kanban-column" data-priority={column.id}>
    <div class="column-header">
      <button class="arrow-button" on:click={() => moveColumnLeft(index)} disabled={index === 0}>
          &lt;
      </button>
      <h3>{column.name}</h3>
      <button class="arrow-button" on:click={() => moveColumnRight(index)} disabled={index === columns.length - 1}>
          &gt;
      </button>
      <button on:click={() => viewModel.triggerDeleteColumn(column.id)} class="delete-button" title="Delete Column">
          🗑️
      </button>
  </div>
      <div class="TaggedLine-list" 
           role="list" 
           on:dragover={viewModel.onDragOver} 
           on:drop={(e) => viewModel.onTaggedLineDroppedOnColumn(e, column.id) }>
        {#if $isGroupingActive}
          {#each Object.entries(groupedTaggedLinesInsideColumn[column.id] || {}) as [groupName, groupedTaggedLines]}
            <div class="TaggedLine-group">
              <h4 class="group-title">{groupName}</h4>
              {#each Object.entries(groupedTaggedLines) as [index,TaggedLine]}
              <div class="TaggedLine" draggable="true" on:dragstart={(e) => viewModel.onDragStart(e, TaggedLine)}>
                <div class="TaggedLine-subheader"> 
                {#if showTaggedLineBullet}
                <span class="TaggedLine-bullet" 
                      on:click={() => viewModel.triggerOpenTaggedLineInVault(TaggedLine)}
                      on:mouseenter={showHoverMessage}
                      on:mouseleave={hideHoverMessage}>•</span>
              {/if}
                <div class="TaggedLine-header-toggle" on:click={() => toggleTaggedLineHeader(TaggedLine.id)}>
                  {$TaggedLineHeaderStates[TaggedLine.id] ? '▶' : '▼'}
                </div>
              </div>
                {#if !$TaggedLineHeaderStates[TaggedLine.id]}
                  {#if showFolders}
                    <div class="TaggedLine-folder">
                      📁 {getFolderName(TaggedLine.filePath)}
                    </div>
                  {/if}
         
                  {#if showTags}
                    <div class="TaggedLine-tags">
                      {#each TaggedLine.tags as tag}
                        <span class="TaggedLine-tag">#{tag}</span>
                      {/each}
                    </div>
                  {/if}
                  {#if showProperties}
                    <div class="TaggedLine-properties">
                      <span class="TaggedLine-property">
                        <strong>Status:</strong> {TaggedLine.status}
                      </span>
                      <span class="TaggedLine-property">
                        <strong>Priority:</strong> {TaggedLine.priority}
                      </span>
                      {#each Object.entries(TaggedLine.dynamicProperties) as [key, value]}
                        <span class="TaggedLine-property">
                          <strong>{key}:</strong> {value}
                        </span>
                      {/each}
                    </div>
                  {/if}
                {/if}
                <div class="TaggedLine-body">
                  <TaggedLineStatus 
                    status={TaggedLine.status} 
                    {TaggedLine}
                    on:statusChanged={viewModel.handleStatusChanged}
                  />
                  <span 
                    class="TaggedLine-description" 
                    contenteditable="true" 
                    on:blur={(e) => handleBlurEvent(e, TaggedLine, viewModel)}
                  >
                    {TaggedLine.description}
                  </span>
                </div>
              </div>
              {/each}
            </div>
          {/each}
        {:else}
        {#each Object.entries(groupedTaggedLinesByColumn[column.id] || {}) as [index, TaggedLine]}
        <div class="TaggedLine-group">
          <div class="TaggedLine" draggable="true" on:dragstart={(e) => viewModel.onDragStart(e, TaggedLine)}>
            <div class="TaggedLine-subheader"> 
            {#if showTaggedLineBullet}
                <span class="TaggedLine-bullet" 
                      on:click={() => viewModel.triggerOpenTaggedLineInVault(TaggedLine)}
                      on:mouseenter={showHoverMessage}
                      on:mouseleave={hideHoverMessage}>•</span>
              {/if}
            <div class="TaggedLine-header-toggle" on:click={() => toggleTaggedLineHeader(TaggedLine.id)}>
              {$TaggedLineHeaderStates[TaggedLine.id] ? '▶' : '▼'}
            </div>
          </div>
            {#if !$TaggedLineHeaderStates[TaggedLine.id]}
             {#if showFolders}
                <div class="TaggedLine-folder">
                  📁 {getFolderName(TaggedLine.filePath)}
                </div>
                <div class="TaggedLine-folder">
                  📝{TaggedLine.filePath}
                </div>
              {/if}
              {#if showTags}
                <div class="TaggedLine-tags">
                  {#each TaggedLine.tags as tag}
                    <span class="TaggedLine-tag">#{tag}</span>
                  {/each}
                </div>
              {/if}
              {#if showProperties}
                <div class="TaggedLine-properties">
                  <span class="TaggedLine-property">
                    <strong>Status:</strong> {TaggedLine.status}
                  </span>
                  <span class="TaggedLine-property">
                    <strong>Priority:</strong> {TaggedLine.priority}
                  </span>
                  {#each Object.entries(TaggedLine.dynamicProperties) as [key, value]}
                    <span class="TaggedLine-property">
                      <strong>{key}:</strong> {value}
                    </span>
                  {/each}
                </div>
              {/if}
            {/if}
            <div class="TaggedLine-body">
              <TaggedLineStatus 
                status={TaggedLine.status} 
                {TaggedLine}
                on:statusChanged={viewModel.handleStatusChanged}
              />
              <span 
                class="TaggedLine-description" 
                contenteditable="true" 
                on:blur={(e) => handleBlurEvent(e, TaggedLine, viewModel)}
              >
                {TaggedLine.description}
              </span>
            </div>
          </div>
        </div>
      {/each}
        {/if}
      </div>
      <div class="column-resizer" on:mousedown={(e) => startResize(e, index)}></div>
    </div>
  {/each}
</div>
</div>

<style>
.kanban-view {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-self: stretch;
  order: 0;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0%;
}
.kanban-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-self: stretch;
  order: 0;
  flex-grow: 0;
  flex-shrink: 1;
  flex-basis: auto;
}
.header-left {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-self: flex-start;
  order: 0;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0%;
  grid-column-gap: 0px;
  grid-row-gap: 0px;
}
.header-right {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex-wrap: nowrap;
  align-items: flex-end;
  align-self: stretch;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: 0%;
}
.button-selection-section {
  display: block;
  flex-direction: column;
  flex-wrap: nowrap;
  align-self: flex-start;
  align-items: flex-start;
}
.button-line {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-self: flex-start;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: auto;
}
.button-line {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  align-self: flex-start;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: auto;
}
.p {
  margin: 0px;
}
.selected-info p {
  margin: 0px 0;
  position: relative;
}

.info-value {
  padding: 2px 20px 2px 6px;
  border-radius: 4px;
}

.delete-btn {
  position: absolute;
  top: 50%;
  right: 5px;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: #999;
}

.delete-btn:hover {
  color: #333;
}

.toggle-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  margin-right: 10px;
}

.toggle-menu {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
  width: fit-content;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.menu-content {
  display: none;
}

.menu-content.expanded {
  display: block;
}

.kanban-header-content {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
}


.folder-selection {
  display: flex;
  align-items: center;
  gap: 0px;
  margin-bottom: 0px; /* Add margin-bottom for vertical spacing */
}

.folder-selection input {
  width: auto;
  height: auto;
  margin-bottom: 0px;

}
.p{
  margin: 0px;}
  .div{
  margin: 0px;
}
@media (max-width: 768px) {
  .kanban-header-content {
    flex-direction: column;
  }


  .kanban-actions,
  .folder-selection {
    margin: 0px;
  }
  .p{
    margin: 0px;}
    .div{
  margin: 0px;
}
}

.TaggedLine-header-toggle {
  cursor: pointer;
  user-select: none;
  font-size: 0.8em;
  color: var(--text-muted);
  margin-bottom: 5px;
}

.TaggedLine-header-toggle:hover {
  color: var(--text-normal);
}

.kanban-header, .column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.kanban-container {
  display: flex;
  overflow-x: auto;
  padding: 20px;
  height: 90vh; /* Make the container take up the full viewport height */
}

.kanban-column {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: 300px; /* Set a default width for the columns */
  margin-right: 10px;
  background-color: var(--background-secondary);
  border-radius: 5px;
  padding: 10px;
  position: relative; /* Add this line to position the resizer */
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  background-color: var(--background-secondary-alt);
  border-radius: 3px;
  position: relative; /* To allow positioning of delete button */
}

.arrow-button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.3s;
}

.arrow-button:hover {
  color: var(--text-normal);
}

.arrow-button:disabled {
  color: var(--text-faint);
  cursor: default;
}

button {
  margin: 5px;
  padding: 2px 5px;
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  align-self: center;
}

button:hover {
  background-color: var(--interactive-accent-hover);
}

.delete-button {
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  display: none; /* Hide the delete button by default */
}

.kanban-column:hover .delete-button {
  display: block; /* Show the delete button on hover */
}

.delete-button:hover {
  color: var(--text-error);
}

.TaggedLine-group {
  margin-bottom: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 0.5rem;
}

.group-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #e0e0e0;
}

.TaggedLine-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  border-radius: 3px;
  background-color: var(--background-primary-alt);
  /* Remove fixed height to allow for flexible height */
}

.TaggedLine {
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  padding: 10px;
  background-color: var(--background-primary);
  border-radius: 3px;
  cursor: move;
}

.TaggedLine-subheader {
  display: flex;
  align-items: center; /* This ensures both elements are vertically centered */
}

.TaggedLine-header {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.TaggedLine-folder {
  font-size: 0.8em;
  color: var(--text-muted);
  margin-bottom: 5px;
}

.TaggedLine-bullet {
  cursor: pointer;
  margin-right: 10px;
  font-size: 1.5em;
  position: relative;
}

.TaggedLine-bullet:hover {
  color: var(--interactive-accent);
}

.TaggedLine-bullet[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px;
  background-color: var(--background-secondary);
  color: var(--text-normal);
  border-radius: 3px;
  font-size: 0.8em;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
}

.TaggedLine-bullet[data-tooltip]:hover::after {
  opacity: 1;
}

.TaggedLine-tags {
  display: flex;
  flex-wrap: wrap;
}

.TaggedLine-tag {
  font-size: 0.8em;
  background-color: var(--background-secondary);
  padding: 2px 5px;
  margin-right: 5px;
  border-radius: 3px;
}

.TaggedLine-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.9em;
}

.TaggedLine-property {
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.TaggedLine-property strong {
  margin-right: 4px;
}

.TaggedLine-body {
  display: flex;
  align-items: center;
}

.TaggedLine-description {
  flex-grow: 1;
  margin-left: 10px;
  min-height: 1em;
  outline: none;
}

.TaggedLine-description:focus {
  background-color: var(--background-secondary);
}

.view-in-vault {
  margin-left: 10px;
  padding: 2px 5px;
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.view-in-vault:hover {
  background-color: var(--interactive-accent-hover);
}

.column-resizer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  background-color: transparent;
  z-index: 10;
}

.column-resizer:hover {
  background-color: var(--interactive-accent);
}

.folder-selection {
  position: relative;
  margin: 0px;
}

input {
  width: 100%;
  padding: 5px;
  align-self: center;
}
.div{
  margin: 0px;
}
.folder-button-selection-section {
    position: relative;
  }

.folder-selection-button-line {
    display: flex;
    align-items: center;
  }
.folder-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    border: 1px solid #ccc;
    background-color: white;
    list-style-type: none;
    margin: 0;
    padding: 0;
    width: 100%;
    max-height: 150px; /* Adjust based on your preference */
    overflow-y: auto;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .folder-suggestions li {
    padding: 10px;
    cursor: pointer;
  }

  .folder-suggestions li:hover {
    background-color: #f0f0f0;
  }

  .folder-suggestions li:active {
    background-color: #e0e0e0;
  }
  .info-value-container {
    display: flex;
    align-items: center;
    position: relative;
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background-color: #f9f9f9;
    margin-left: 10px;
  }

  .info-value {
    flex-grow: 1;
  }

  .delete-btn-container {
    display: flex;
    align-items: center;
  }

  .delete-btn {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding-left: 10px;
  }

  .delete-btn:hover {
    color: #333;
  }
</style>