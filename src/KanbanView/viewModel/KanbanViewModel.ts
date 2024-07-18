import { onMount, setContext } from 'svelte';
import { debounce } from 'lodash-es';
import type { Writable, Readable } from 'svelte/store';
import { get, writable, readable, derived} from 'svelte/store';
import TaggedLineOrganizerPlugin from '../../main';
import type { FilterConfig, TaggedLine, Priority, ViewConfig, ColumnConfig, PropertyConfig, OrderByConfig, GroupByConfig, GroupedTaggedLines, ExpressionNode, TogglesConfig } from '../../types';
import { openTaggedLineInVault, updateTaggedLineDescription, updateTaggedLinePriorityInFile, updateTaggedLinePropertyInFile,updateTaggedLineStatus} from '../../utils/TaggedLineUtils';
import type { KanbanContainerInterface } from '../../KanbanContainerInterface';
import {printReadableStore} from '../../utils/consoleLogging';
import { stringify } from 'querystring';
import { read } from 'fs';
import { OrderByModal } from 'src/utils/orderByUtils';
import { GroupByModal } from 'src/utils/groupByUtils';
import { generateConditionCode } from '../../utils/filterUtils';
import { logger } from 'src/utils/logger';
import { error } from 'console';
import type TaggedLineStatus from 'src/components/TaggedLineStatus.svelte';



export default class KanbanViewModel {

    private container: KanbanContainerInterface;
  // Stores
    //TaggedLine Stores
    TaggedLinesStore: Writable<TaggedLine[]>;
    TaggedLinesByColumnStore: Writable<Record<string, TaggedLine[]>>;
    groupedTaggedLinesInsideColumnsStore: Writable<Record<string, GroupedTaggedLines[]>> = writable({});
    
  
    isGroupingActive: Writable<boolean>=writable(false);
    currentPropertyStore: Writable<string>;
    viewConfigStore: Writable<ViewConfig>;
    plugin: TaggedLineOrganizerPlugin;
    columnsStore: Writable<ColumnConfig[]>;
    propertyConfigsStore: Writable<PropertyConfig[]>;
    orderBy: Writable<OrderByConfig> = writable({ property: '', order: 'asc', type: 'value' });
    groupBy: Writable<GroupByConfig>=writable<GroupByConfig>({
      type: 'none',
      properties: [],
      tags: [],
      includeAll: false
    }); 


    properties?: string[]; // For 'propertyValues' and 'properties' types
    tags?: string[]; 
    alltags?;// For 'tags' type
    includeAll: boolean;
   
   // Filterring 
filterConfig: FilterConfig = {
  expressionTree: null
};
 availableTags: string[] = [
  'bug',
  'feature',
  'enhancement',
  'documentation',
  'refactor',
  'testing',
  'performance',
  'security',
  'design',
  'accessibility'
];

 availableProperties: string[] = [
  'priority',
  'assignee',
  'dueDate',
  'status',
  'estimate',
  'sprint',
  'storyPoints',
  'component',
  'version',
  'milestone'
];


  // Folder Selection
    selectedFolderStore = writable('');
    allFoldersStore: Writable<string[]> = writable([]);
    folderSuggestionsStore: Writable<string[]> = writable([]);
    isFolderSuggestionsVisibleStore: Writable<boolean> = writable(false);
 
     private debouncedUpdateSuggestions: (input: string) => void;
     constructor(container: KanbanContainerInterface, initialTaggedLines: Writable<TaggedLine[]>, initialViewConfig: ViewConfig) {
      this.container = container;
      //Stores
      this.TaggedLinesStore = initialTaggedLines;
      this.viewConfigStore = writable(initialViewConfig);
      this.currentPropertyStore = writable(initialViewConfig.selectedProperty);
      this.columnsStore = writable(initialViewConfig.columns);
      this.propertyConfigsStore= writable(container.propertyConfigs);
      ///NewlyBuiltstores
      this.TaggedLinesByColumnStore = this.createTaggedLinesByColumnStore(this.TaggedLinesStore, this.viewConfigStore, this.currentPropertyStore);

  
  
      this.plugin = TaggedLineOrganizerPlugin.getInstance();
      this.debouncedUpdateSuggestions = debounce(this.updateFolderSuggestions.bind(this), 300);
  
      onMount(async () => {
    
          try {
            logger.info(`00030:Mounting ViewModel`);
            this.initializeFolderStore();
            this.updateTaggedLinesDerivedStores();
          } catch (error) {
              console.error("Error in onMount: ", error);
          }
      });
  }

//Folder Selection
private initializeFolderStore() {
  const folders = this.container.getFolders();
  this.allFoldersStore.set(folders);
}

handleFolderInput = (event: Event) => {
  logger.info(`9990`)

  const input = (event.target as HTMLInputElement).value;
  this.debouncedUpdateSuggestions(input);
}

private updateFolderSuggestions(input: string) {
  const allFolders = this.container.getFolders();
  const suggestions = allFolders.filter(folder => 
    folder.toLowerCase().includes(input.toLowerCase())
  );
  this.folderSuggestionsStore.set(suggestions);
  this.isFolderSuggestionsVisibleStore.set(suggestions.length > 0);
}
triggerSelectFolder(folder: string) {
  logger.info(`99978`);
  this.changeSelectedFolderAndUpdateStores(folder);
  this.hideFolderSuggestions();
}
updateSelectedFolderInfoInStores(folder:string){
  this.selectedFolderStore.set(folder);
  this.isFolderSuggestionsVisibleStore.set(false);
  this.viewConfigStore.update(config => ({
    ...config,
    selectedFolder: folder
  }));
}

async changeSelectedFolderAndUpdateStores(folder: string) {
  // Updating the associated stores
  logger.info(`999`);
  this.updateSelectedFolderInfoInStores(folder);
  await this.updateTaggedLinesStore();
  await this.updateTaggedLinesDerivedStores();
  await this.updatePropertiesConfigStore();
  logger.info(`9996`);
 }
 showFolderSuggestions() {
  logger.info(`9992`)
  this.isFolderSuggestionsVisibleStore.set(true);
}

hideFolderSuggestions() {
  logger.info(`9991`)
  this.isFolderSuggestionsVisibleStore.set(false);
}
// TaggedLines By Column
    private createTaggedLinesByColumnStore(
        TaggedLinesStore: Readable<TaggedLine[]> | Writable<TaggedLine[]>,
        viewConfig: Writable<ViewConfig>,
        currentProperty: Writable<string>
    ): Writable<Record<string, TaggedLine[]>> {
        logger.info(`118`);
        const store = writable<Record<string, TaggedLine[]>>({});

        derived(
            [TaggedLinesStore, viewConfig, currentProperty],
            ([$TaggedLines, $viewConfig, $currentProperty]) => {
                if (!$TaggedLines || !$viewConfig || !$viewConfig.columns || !$currentProperty) {
                    console.error('Invalid store values:', { $TaggedLines, $viewConfig, $currentProperty });
                    return {};
                }

                const groupedTaggedLines = this.groupTaggedLinesByColumn($TaggedLines, $viewConfig.columns, $currentProperty);
                logger.info(`333 ${JSON.stringify(groupedTaggedLines)}`);
                return groupedTaggedLines;
            }
        ).subscribe(value => {
            store.set(value);
        });

        return store;
    }
    private groupTaggedLinesByColumn(
      TaggedLines: TaggedLine[],
      columns: ColumnConfig[],
      selectedProperty: string
    ): Record<string, TaggedLine[]> {
      const groupedTaggedLines: Record<string, TaggedLine[]> = {};
      const noPropertyColumnId = 'no_property';
    
      if (!TaggedLines || !columns) {
        console.error('220 TaggedLines or columns are undefined or null:', { TaggedLines, columns });
        return groupedTaggedLines;
      }
    
      // Create a separate column for TaggedLines without the selected property
      groupedTaggedLines[noPropertyColumnId] = [];
    
      for (const TaggedLine of TaggedLines) {
        if (!TaggedLine) {
          console.error('Invalid TaggedLine:', TaggedLine);
          continue;
        }
    
        const TaggedLineValue = this.getTaggedLinePropertyValueForTaggedLine(TaggedLine, selectedProperty);
        if (TaggedLineValue === undefined) {
          // If the TaggedLine doesn't have the selected property, add it to the "no_property" column
          groupedTaggedLines[noPropertyColumnId].push(TaggedLine);
          logger.info(`2215 ${JSON.stringify(groupedTaggedLines[`no_property`])}`);

        } else {
          // If the TaggedLine has the selected property, add it to the corresponding column
          const columnId = columns.find(column => column.id === TaggedLineValue)?.id;
          if (columnId) {
            if (!groupedTaggedLines[columnId]) {
              groupedTaggedLines[columnId] = [];
            }
            groupedTaggedLines[columnId].push(TaggedLine);
          }
        }
      }
    
      logger.info(`2214 ${JSON.stringify(groupedTaggedLines, null, 2)}`);
      logger.info(`2212 ${JSON.stringify(groupedTaggedLines[`no_property`])}`);
      return groupedTaggedLines;
    }

    
        // Cleans the TaggedLine description by removing unwanted patterns
        cleanTaggedLineDescription(description: string): string {
            if (!description) {
                console.error('Invalid TaggedLine description:', description);
                return '';
            }
    
            description = description.replace('#TaggedLine', '');
            description = description.replace(/\[priority::\s*\w+\]/g, '');
            description = description.replace(/\[[^\]]+::[^\]]+\]/g, '');
            description = description.replace(/- \[[ xX]\] /g, '');
    
            const placeholders: string[] = [];
            description = description.replace(/\[\[([^\]]+)\]\]/g, (match, content) => {
                const placeholder = `__${placeholders.length}__`;
                placeholders.push(match);
                return placeholder;
            });
    
            description = description.replace(/\[|\]/g, '');
    
            placeholders.forEach((placeholder, index) => {
                description = description.replace(`__${index}__`, placeholder);
            });
    
            return description.trim();
        }
    
        // Opens a TaggedLine in the Vault
        triggerOpenTaggedLineInVault(TaggedLine: TaggedLine) {
            if (!TaggedLine) {
                console.error('Invalid TaggedLine:', TaggedLine);
                return;
            }
            openTaggedLineInVault(this.plugin.app, TaggedLine);
        }
    
        // Updates the TaggedLine description
        async triggerUpdateTaggedLineDescription(TaggedLine: TaggedLine, newDescription: string) {
            if (!TaggedLine || newDescription === undefined) {
                console.error('Invalid TaggedLine or new description:', { TaggedLine, newDescription });
                return;
            }
            await updateTaggedLineDescription(this.plugin.app, TaggedLine, newDescription, this.TaggedLinesStore);
        }
    
        // Handles dropping a TaggedLine to update its priority
        async onTaggedLineDroppedOnColumn(event: DragEvent, columnId: string) {
            event.preventDefault();
            let newPropertyValue=columnId;
            try {
                if (event.dataTransfer) {
                  let taggedLine=this.transformDragEventIntoTaggedLine(event);
                  if(taggedLine)
                    {
                      if(this.isStatusColumn(get(this.currentPropertyStore),columnId))
                        {
                          await updateTaggedLineStatus(this.plugin.app,taggedLine);
                          this.updateTaggedLineStatusInStore(taggedLine);
                        }
                        else{
                          logger.info("6666");
                      this.updateTaggedLineProperty(taggedLine,get(this.currentPropertyStore),newPropertyValue);
                    }}
    
                  
                }
            } catch (error) {
                console.error("Error in onDrop: ", error);
            }
        }
       async updateTaggedLineProperty(taggedLine:TaggedLine,currentProperty:string,newPropertyValue:string){
          if (this.isPriority(newPropertyValue)) {
  
            if (taggedLine) {
                await updateTaggedLinePriorityInFile(this.plugin.app, taggedLine, newPropertyValue);
            }
          
        } else {
            logger.info(`808`);
            if (taggedLine) {
          await updateTaggedLinePropertyInFile(this.plugin.app, taggedLine, currentProperty, newPropertyValue);}
       
       
        }
        this.updateTaggedLinePropertyInStore(taggedLine,currentProperty,newPropertyValue);


        }
        updateTaggedLineStatusInStore(taggedLine:TaggedLine){
          let newStatus:"Done" | "To Do";
          if(taggedLine.status=="To Do")
             newStatus="Done";
          else{
            newStatus="To Do";
          }
          let updatedTaggedLine:TaggedLine = { 
            ...taggedLine, 
            status: newStatus,};
        
        this.TaggedLinesStore.update(TaggedLines => {
            const newTaggedLines = TaggedLines.map(t => t.id === updatedTaggedLine.id ? updatedTaggedLine : t);
            logger.info('Updated TaggedLines store:', newTaggedLines);
            return newTaggedLines;
        });
        }
        updateTaggedLinePropertyInStore(taggedLine:TaggedLine,propertyName:string,newPropertyValue:string){
             // Update the TaggedLine in the store
      let updatedTaggedLine:TaggedLine = { 
        ...taggedLine, 
        [propertyName]: newPropertyValue,
        dynamicProperties: {
            ...taggedLine.dynamicProperties,
            [propertyName]: newPropertyValue
        }};
    
    this.TaggedLinesStore.update(TaggedLines => {
        const newTaggedLines = TaggedLines.map(t => t.id === updatedTaggedLine.id ? updatedTaggedLine : t);
        logger.info('Updated TaggedLines store:', newTaggedLines);
        return newTaggedLines;
    });

        }
    transformDragEventIntoTaggedLine(event:DragEvent):TaggedLine|undefined{
      let taggedLine:TaggedLine|undefined;
      try{
      if (event.dataTransfer) {
        const TaggedLineData = event.dataTransfer.getData('text/plain');
        taggedLine = JSON.parse(TaggedLineData);
      }}
      catch (erorr){
        logger.error("Failed to transform dragEvent into TaggedLine Object",error);
      }
      return taggedLine
    }
        // Handles the drag start event for a TaggedLine
        onDragStart(event: DragEvent, TaggedLine: TaggedLine) {
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', JSON.stringify(TaggedLine));
            } else {
                console.error('Invalid drag start event:', event);
            }
        }
    
        // Prevents the default behavior for drag over event
        onDragOver(event: DragEvent) {
            event.preventDefault();
        }
    
        // Checks if the value is a valid priority
        isPriority(value: string): value is Priority {
            const priorities: Priority[] = ['lowest', 'low', 'normal', 'medium', 'high', 'highest'];
            if (!priorities.includes(value as Priority)) {
                console.error('Invalid priority value:', value);
                return false;
            }
            return true;
        }
        isStatusColumn(selectedProperty:string,columnValue:string): boolean {
          const validStatus:string[] = ['To Do','Done'];
          if (!validStatus.includes(columnValue)) {
              console.error('Invalid priority value:', columnValue);
              return false;
          }
          return true;
      }
    
        // Updates the width of a column
        updateColumnWidth(index: number, width: number) {
            this.viewConfigStore.update(config => {
                if (!config || !config.columns || !config.columns[index]) {
                    console.error('Invalid column index or config:', { index, config });
                    return config;
                }
    
                const updatedConfig = { ...config };
                updatedConfig.columns[index].width = width;
                return updatedConfig;
            });
        }
    
        // Triggers deletion of a column
        triggerDeleteColumn(columnId: string) {
            logger.info(`532`);
            if (!columnId) {
                console.error('Invalid column ID:', columnId);
                return;
            }
    
            // Use get() to read the current value of the columns store
            const currentColumns = get(this.columnsStore);
    
            const columnIndexToRemove = currentColumns.findIndex(column => column.id === columnId);
            if (columnIndexToRemove !== -1) {
                // Use the update method to modify the store
                this.columnsStore.update(columns => {
                    columns.splice(columnIndexToRemove, 1);
                    return columns;
                });
    
                this.viewConfigStore.update(config => {
                    return {
                        ...config,
                        columns: get(this.columnsStore)
                    };
                });
            }
        }

    
        // Handles status change for a TaggedLine
        handleStatusChanged(event: CustomEvent) {
            const { TaggedLine, newStatus } = event.detail;
            if (!TaggedLine || newStatus === undefined) {
                console.error('Invalid TaggedLine or new status:', { TaggedLine, newStatus });
                return;
            }
    
            const updatedTaggedLine = { ...TaggedLine, status: newStatus };
            this.TaggedLinesStore.update(TaggedLines => TaggedLines.map(t => t.id === updatedTaggedLine.id ? updatedTaggedLine : t));
            this.updateTaggedLinesDerivedStores();
        }
    
        // Fetches TaggedLines from the container
         async updateTaggedLinesStore()  {
            logger.info("00045: TriggerfetchTaggedLine");
            if (typeof this.container.initTaggedLinesStore !== 'function') {
              console.error("fetchTaggedLines method is not implemented in the container");
              return;
            }
            else{
            try {
              const viewConfig=get(this.viewConfigStore);
              this.container.initialViewConfig=viewConfig;
              logger.info("1471:", this.container.initialViewConfig);
              await this.container.initTaggedLinesStore();
              this.TaggedLinesStore=this.container.TaggedLinesStore;
               const tasks=get(this.TaggedLinesStore);
              logger.info(`000451 ${JSON.stringify(tasks)}`,tasks);
            } catch (error) {
              console.error("Error in fetchTaggedLines: ", error);
            }}
          }
        async updatePropertiesConfigStore(){
          await this.container.updatePropertiesConfig();
          this.propertyConfigsStore.set(this.container.propertyConfigs);
        }
        updateViewConfig(){
          try {
            this.viewConfigStore.update(viewConfig => {
              // Update the columns in the viewConfig
              viewConfig.columns = get(this.columnsStore);
        
              // Update the filters in the viewConfig
              viewConfig.filters = [this.filterConfig];
        
              // Update the sorts in the viewConfig
              viewConfig.sorts = [get(this.orderBy)];
        
              // Update the groupBy in the viewConfig
              viewConfig.groupby = [get(this.groupBy)];
        
              // Update the selectedFolder in the viewConfig
              viewConfig.selectedFolder = get(this.selectedFolderStore);
        
              // Update the selectedProperty in the viewConfig
              viewConfig.selectedProperty = get(this.currentPropertyStore);
        
         
              // Update the displayProperties in the viewConfig
  
        
              return viewConfig;
            });
          }
          catch (error) {}
        }
    
        // Triggers save view action
        triggerSaveView(toggleProperties: boolean, toggleTags: boolean, toggleTaggedLineBullet: boolean, toggleFolders: boolean, collapseAllHeaders: boolean) {
          try {
            this.updateViewConfig();
            this.viewConfigStore.update(viewConfig => {
            
              // Create the displayProperties object
              const displayProperties: TogglesConfig = {
                toggleProperties,
                toggleTags,
                toggleTaggedLineBullet,
                toggleFolders,
                collapseAllHeaders,
              };
        
              // Update the displayProperties in the viewConfig
              viewConfig.toggles = displayProperties;
        
              return viewConfig;
            });
        
            // Get the updated viewConfig
            const updatedViewConfig = get(this.viewConfigStore);
        
            // Call the saveView method of the container with the updated viewConfig
            this.container.saveView(updatedViewConfig);
          } catch (error) {
            console.error("Error in triggerSaveView: ", error);
          }
        }
    
        // Triggers add column action
        async triggerAddColumn() {
            try {
              const newColumn = await this.container.addColumn();
              if (newColumn) {
                // Update the columns store
                this.columnsStore.update(columns => [...columns, newColumn]);
        
                // Update the viewConfig store
                this.viewConfigStore.update(config => ({
                  ...config,
                  columns: [...config.columns, newColumn]
                }));
        
                logger.info("New column added successfully:", newColumn);
              }
            } catch (error) {
              console.error("Error in triggerAddColumn: ", error);
            }
          }
        
    
        // Triggers load action
        triggerLoad() {
          this.plugin.loadKanbanView();
        }
    
        // Triggers new view action
        triggerNewView() {
            // Implement the new view functionality if needed
        }
    
        // Triggers order by action
        async triggerOrderBy() {
            new OrderByModal(this.plugin.app, this.propertyConfigsStore, this.orderBy, () => this.applyOrderBy()).open();
          }
        
          applyOrderBy() {
            this.updateViewConfig();
            const orderConfig = get(this.orderBy);
            const configs = get(this.propertyConfigsStore);
            
            this.TaggedLinesStore.update(TaggedLines => {
              return [...TaggedLines].sort((a, b) => {
                let aValue = this.getTaggedLinePropertyValue(a, orderConfig.property, configs);
                let bValue = this.getTaggedLinePropertyValue(b, orderConfig.property, configs);
        
                if (orderConfig.type === 'count') {
                  // Count TaggedLines for each unique value
                  const counts = TaggedLines.reduce((acc, TaggedLine) => {
                    const value = this.getTaggedLinePropertyValue(TaggedLine, orderConfig.property, configs);
                    acc[value] = (acc[value] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  aValue = counts[aValue] || 0;
                  bValue = counts[bValue] || 0;
                }
        
                if (aValue < bValue) return orderConfig.order === 'asc' ? -1 : 1;
                if (aValue > bValue) return orderConfig.order === 'asc' ? 1 : -1;
                return 0;
              });
            });
          }
          private getTaggedLinePropertyValue(TaggedLine: TaggedLine, property: string, configs: PropertyConfig[]): any {
            const config = configs.find(c => c.name === property);
            if (config) {
              return TaggedLine.dynamicProperties[property];
            }
            // Fallback for built-in properties
            switch (property) {
              case 'description': return TaggedLine.description;
              case 'status': return TaggedLine.status;
              case 'priority': return TaggedLine.priority;
              default: return undefined;
            }
          }
        
        
        // Filter
        triggerFilter() {

        }
        applyFilter(filterConfig: FilterConfig) {
          this.filterConfig = filterConfig;
          this.updateTaggedLinesDerivedStores();
        }
        evaluateExpressionTree(node: ExpressionNode | null, TaggedLine: TaggedLine): boolean {
          if (node === null) {
            // If the expression tree is empty, consider all TaggedLines as matching
            return true;
          }
      
          if (node.type === 'condition') {
            if (node.filter.type === 'tag') {
              return node.filter.presence === TaggedLine.tags.includes(node.filter.tag);
            } else if (node.filter.type === 'property') {
              return node.filter.values.includes(TaggedLine.dynamicProperties[node.filter.property]);
            }
          } else if (node.type === 'operator') {
            const leftResult = node.left ? this.evaluateExpressionTree(node.left, TaggedLine) : false;
            const rightResult = node.right ? this.evaluateExpressionTree(node.right, TaggedLine) : false;
            if (node.operator === 'AND') {
              return leftResult && rightResult;
            } else if (node.operator === 'OR') {
              return leftResult || rightResult;
            }
          }
          return false;
        }
      
        // Function to filter TaggedLines based on the expression tree
        filterTaggedLines(expressionTree: ExpressionNode | null): TaggedLine[] {
          return this.TaggedLines.filter(TaggedLine => this.evaluateExpressionTree(expressionTree, TaggedLine));
        }
      
        async triggerGroupBy() {
            new GroupByModal(this.plugin.app, this.propertyConfigsStore, this.groupBy, () => this.applyGroupBy()).open();
          }
          applyGroupBy() {
      
            const groupConfig = get(this.groupBy);
            const columns = get(this.columnsStore);
            const TaggedLinesByColumn = get(this.TaggedLinesByColumnStore);
            const propertyConfigs = get(this.propertyConfigsStore);
        
            const groupedTaggedLinesInsideColumns: Record<string, GroupedTaggedLines[]> = {};
        
            columns.forEach(column => {
              const columnTaggedLines = TaggedLinesByColumn[column.id] || [];
              groupedTaggedLinesInsideColumns[column.id] = this.groupTaggedLinesInsideColumn(columnTaggedLines, groupConfig, propertyConfigs);
            });

            this.groupedTaggedLinesInsideColumnsStore.set(groupedTaggedLinesInsideColumns);
            this.isGroupingActive.set(true);
          }
        
          private groupTaggedLinesInsideColumn(TaggedLines: TaggedLine[], groupConfig: GroupByConfig, propertyConfigs: PropertyConfig[]): GroupedTaggedLines[] {
            const groupedTaggedLines: Record<string, TaggedLine[]> = {};
        
            TaggedLines.forEach(TaggedLine => {
              let groupKeys: string[] = ['Other'];
        
              switch (groupConfig.type) {
                case 'propertyValues':
                case 'properties':
                  const properties = groupConfig.includeAll 
                    ? propertyConfigs.map(c => c.name) 
                    : (groupConfig.properties || []);
                  groupKeys = properties.map(prop => {
                    const value = this.getTaggedLinePropertyValueForTaggedLine(TaggedLine, prop);
                    return groupConfig.type === 'propertyValues' && value !== undefined
                      ? `${prop}: ${value}`
                      : value !== undefined ? prop : 'Other';
                  }).filter(key => key !== 'Other');
                  break;
                case 'tags':
                  const tags = groupConfig.includeAll ? TaggedLine.tags : (groupConfig.tags || []);
                  groupKeys = TaggedLine.tags.filter(tag => tags.includes(tag));
                  break;
              }
        
              if (groupKeys.length === 0) {
                groupKeys = ['Other'];
              }
        
              groupKeys.forEach(key => {
                if (!groupedTaggedLines[key]) {
                  groupedTaggedLines[key] = [];
                }
                groupedTaggedLines[key].push(TaggedLine);
              });
            });
        
            return Object.entries(groupedTaggedLines).map(([groupName, TaggedLines]) => ({
              groupName,
              TaggedLines
            }));
          }
        
          private getTaggedLinePropertyValueForTaggedLine(TaggedLine: TaggedLine, property: string): any {
            if (property === 'status') return TaggedLine.status;
            if (property === 'priority') return TaggedLine.priority;
            return TaggedLine.dynamicProperties?.[property];
          }
        
    
        // Triggers filter by action
        triggerFilterBy() {
            try {
                this.container.filterColumns();
            } catch (error) {
                console.error("Error in triggerFilterBy: ", error);
            }
        }

      public async triggerOpenPropertySelection() :Promise<void> {
            logger.info("trigger open selection modal");
            try {
              const newSelectedProperty = await this.container.selectProperty();
              if (newSelectedProperty) {
                this.currentPropertyStore.set(newSelectedProperty);
        
                // Update viewConfig
                this.viewConfigStore.update(config => ({
                  ...config,
                  selectedProperty: newSelectedProperty
                }));
                
                logger.info("Property changed to:", newSelectedProperty);
                await this.rebuildColumns();
              }
            } catch (error) {
              console.error("Error in triggerOpenPropertySelection: ", error);
            }
          }
        
          async rebuildColumns() {
            const propertyConfigs = get(this.propertyConfigsStore);
            const currentProperty = get(this.currentPropertyStore);
            const propertyConfig = propertyConfigs.find(property => property.name === currentProperty);
        
            if (!propertyConfig) {
                console.error(`Property config not found for ${currentProperty}`);
                return;
            }
        
            const newColumns: ColumnConfig[] = propertyConfig.values.map(value => ({
                id: value,
                key: value,
                name: value,
                syntax: 'defaultSyntax', // Set appropriate default or dynamic value
                width: 200, // Set appropriate default or dynamic value
            }));
        
            // Add the "no_property" column to the newColumns array
            newColumns.push({
                id: 'no_property',
                key: 'no_property',
                name: 'No Property',
                syntax: 'defaultSyntax',
                width: 200,
            });
        
            this.columnsStore.set(newColumns);
        
            // Update viewConfig with new columns
            this.viewConfigStore.update(config => ({
                ...config,
                columns: newColumns
            }));
        this.updateTaggedLinesDerivedStores();
        }
    

          async updateTaggedLinesDerivedStores() {
              try {
                
                  // Update TaggedLinesByColumnStore
                  let groupedTaggedLines:Record<string, TaggedLine[]>=this.updateTaggedLinesByColumnStore();
                  // Update groupedTaggedLinesInsideColumnsStore
                  this.updateGroupedTaggedLinesByColumnStore(groupedTaggedLines);
              } catch (error) {
                  console.error("Error in updateTaggedLinesStores: ", error);
              }
          }
          updateTaggedLinesByColumnStore(){
            const TaggedLines = get(this.TaggedLinesStore);
            const columns = get(this.columnsStore);
            const currentProperty = get(this.currentPropertyStore);
            const groupedTaggedLines = this.groupTaggedLinesByColumn(TaggedLines, columns, currentProperty);
           
            this.TaggedLinesByColumnStore.set(groupedTaggedLines);
                        
            logger.info(`00044 ${JSON.stringify(columns)}`);
            logger.info(`00044 ${JSON.stringify(currentProperty)}`);
            return groupedTaggedLines;

          }
          updateGroupedTaggedLinesByColumnStore(groupedTaggedLines: Record<string, TaggedLine[]>) {
            const groupConfig = get(this.groupBy);
            const propertyConfigs = get(this.propertyConfigsStore);
        
            const groupedTaggedLinesInsideColumns: Record<string, GroupedTaggedLines[]> = {};
        
            for (const columnId in groupedTaggedLines) {
                if (Object.prototype.hasOwnProperty.call(groupedTaggedLines, columnId)) {
                    const TaggedLines = groupedTaggedLines[columnId];
                    if (TaggedLines) {
                        groupedTaggedLinesInsideColumns[columnId] = this.groupTaggedLinesInsideColumn(
                            TaggedLines,
                            groupConfig,
                            propertyConfigs
                        );
                    } else {
                        groupedTaggedLinesInsideColumns[columnId] = []; // or handle this case as appropriate
                    }
                }
            }
        
            this.groupedTaggedLinesInsideColumnsStore.set(groupedTaggedLinesInsideColumns);
        }
    }
    

