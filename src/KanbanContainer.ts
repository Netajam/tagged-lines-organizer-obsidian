import {WorkspaceLeaf, ItemView, TFile, Notice,TFolder, View,getAllTags, type CachedMetadata} from 'obsidian';
import {VIEW_TYPE_KANBAN} from './main';
import TaggedLineOrganizerPlugin from './main';
import type { TaggedLine, ViewConfig, KanbanViewComponent,PropertyConfig,KanbanViewProps, KanbanViewConstructor, ColumnConfig } from './types';
import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import KanbanView from './KanbanView/view/KanbanView.svelte';
import { TaggedLinesExtractor } from './TaggedLineExtractor';
import type { KanbanContainerInterface } from './KanbanContainerInterface';
import { PropertySelectionModal } from './utils/propUtils';
import { AddColumnSelectionModal } from './utils/columnUtils';
import { fetchAllFolders } from './utils/folderUtils';
import { Vault } from 'obsidian';
import { logger } from './utils/logger';





export class KanbanContainer extends ItemView implements KanbanContainerInterface {
   plugin: TaggedLineOrganizerPlugin;
   tagToSearch: string;
   TaggedLinesStore: Writable<TaggedLine[]>;
   TaggedLines: TaggedLine[];
   propertyConfigs: PropertyConfig[];
  initialViewConfig: ViewConfig;
   currentViewConfig: ViewConfig;
  component: KanbanViewComponent | null;
   currentProperty: string;
   folders: string[];
   TaggedLineExtractor: TaggedLinesExtractor;
   allTags:string[]|null=[];

  constructor(leaf: WorkspaceLeaf, plugin: TaggedLineOrganizerPlugin, initialViewConfig: ViewConfig) {
    super(leaf);

    this.plugin = plugin;
    this.tagToSearch = plugin.pluginSettings.overallSettings.lineTag;
    this.TaggedLinesStore = writable([]);
    this.TaggedLines = [];
    this.propertyConfigs = [{name: "priority", values: ["lowest"]}];
    this.initialViewConfig = initialViewConfig;
    this.currentViewConfig = initialViewConfig;
    this.component = null;
    this.currentProperty = 'priority';
    this.folders = [];
    this.TaggedLineExtractor = new TaggedLinesExtractor(this.app, this.tagToSearch);
    this.allTags;
    logger.info("0010", initialViewConfig);

    leaf.setViewState({
      type: VIEW_TYPE_KANBAN,
      active: true,
    });
  }

  async onOpen() {
    try {
      // Feed any missing values in initialViewConfigs
      this.initialViewConfig=await this.feedViewConfig();
      // Fetching all the TaggedLine from the Folder
      await this.initTaggedLinesStore();

      // Fetching all the properties associated to the TaggedLines
      await this.updatePropertiesConfig();
      //Building the columns
      this.buildColumnsFromSelectedProperty();
      // Folder
      await this.initializeFolders();
    const cache=this.app.metadataCache.getCache("");
    if(cache!=null){this.allTags=getAllTags(cache);}


      const props: KanbanViewProps = {
        container: this,
        initialViewConfig: this.initialViewConfig,
        TaggedLinesStore:this.TaggedLinesStore,
        currentProperty: this.initialViewConfig.selectedProperty
        };
        const KanbanViewConstructor = KanbanView as unknown as KanbanViewConstructor;
        this.component = new KanbanViewConstructor({
          target: this.contentEl,
          props: props
        });
      logger.info("Svelte component initialized");
    
    } catch (error) {
      console.error("Error initializing KanbanView:", error);
    }
  }
  getViewType() {
    return VIEW_TYPE_KANBAN;
  }
  getDisplayText() {
    return "TaggedLine Kanban";
  }
    getViewConfig(): ViewConfig {
    return this.initialViewConfig;
  }
  feedViewConfig(): ViewConfig {
    logger.info('00013:InitialViewConfig filled with missing values', this.initialViewConfig);    
    // Complete potential Missings values in initialViewConfig
    if (this.initialViewConfig) {
      return {
        ...this.initialViewConfig,
        id: this.initialViewConfig.id || this.plugin.pluginSettings.viewConfig.id,
        name: this.initialViewConfig.name || this.plugin.pluginSettings.viewConfig.name,
        type: this.initialViewConfig.type || 'kanban',
        filters: this.initialViewConfig.filters || [],
        sorts: this.initialViewConfig.sorts || [],
        groupby: this.initialViewConfig.groupby || [],
        selectedFolder: this.initialViewConfig.selectedFolder || this.plugin.pluginSettings.overallSettings.defaultKanbanFolder,
        selectedProperty: this.initialViewConfig.selectedProperty ||  this.plugin.pluginSettings.overallSettings.defaultKanbanProperty,
        toggles: this.initialViewConfig.toggles||this.plugin.pluginSettings.viewConfig.toggles,
        lineTag: this.initialViewConfig.lineTag || this.plugin.pluginSettings.viewConfig.lineTag,
        checkboxLines: this.initialViewConfig.checkboxLines || this.plugin.pluginSettings.viewConfig.checkboxLines
      };
    }
    else{
    // If the initial viewConfig doesn't exist, return the default values from the pluginSettigns
    return {
      id: this.plugin.pluginSettings.viewConfig.id,
      name: this.plugin.pluginSettings.viewConfig.name,
      type: 'kanban',
      columns: [],
      filters: [],
      sorts: [],
      groupby: [],
      selectedFolder: this.plugin.pluginSettings.overallSettings.defaultKanbanFolder,
      selectedProperty: this.plugin.pluginSettings.overallSettings.defaultKanbanProperty,
      toggles: this.plugin.pluginSettings.viewConfig.toggles,
      lineTag: this.plugin.pluginSettings.viewConfig.lineTag,
      checkboxLines: this.plugin.pluginSettings.overallSettings.checkboxLines
    };}

  }
  findPropertyConfigOfSelectedProperty():PropertyConfig|undefined{
  return this.propertyConfigs.find(pc => pc.name === this.initialViewConfig.selectedProperty);
  }
  updateColumns(columns:ColumnConfig[]){
    this.initialViewConfig.columns=columns;
    logger.info(`000144: Columns updated`,columns);
  }
  buildColumnsFromSelectedProperty(){
     let selectedPropertyConfig=this.findPropertyConfigOfSelectedProperty();
    logger.info("00143: selectedPropertyConfig:", selectedPropertyConfig);
    let columns = [];
    if (selectedPropertyConfig) {
      columns = selectedPropertyConfig.values.map(value => ({
        id: value,
        key: value,
        name: value.charAt(0).toUpperCase() + value.slice(1),
        syntax: '',
        width: 200,
      }));
    } else {
      // Fallback to default priority columns if the default property is not found
      columns = ['lowest', 'low', 'normal', 'medium', 'high', 'highest'].map(priority => ({
        id: priority,
        key: priority,
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        syntax: '',
        width: 200,
      }));
    }
    this.updateColumns(columns);
  }
  async initTaggedLinesStore(): Promise<void> {
    logger.info(`00121: Fetching TaggedLines from folder: ${this.initialViewConfig.selectedFolder}`);

    try {
      this.TaggedLines = await this.fetchingTaggedLinesFromFolder(this.initialViewConfig.selectedFolder);
      this.TaggedLinesStore.set(this.TaggedLines);
       logger.info(`00122 Fetched ${this.TaggedLines.length} TaggedLines`);
   
    } catch (error) {
      console.error("Error fetching TaggedLines:", error);
      new Notice("Failed to fetch TaggedLines. Check the console for details.");
    }
  }
  async fetchingTaggedLinesFromFolder(folder:string):Promise<TaggedLine[]>{
    let TaggedLines:TaggedLine[]=[];
    try {
      TaggedLines = await this.TaggedLineExtractor.extractTaggedLinesFromFolder(folder);
      logger.info(`Fetched ${this.TaggedLines.length} TaggedLines`);   
    } catch (error) {
      console.error("Error fetching TaggedLines:", error);
    }
    return TaggedLines;
  }
  getTaggedLines(): TaggedLine[] {
    return this.TaggedLines;
  }
  updateTaggedLineStore(updatedTaggedLine: TaggedLine) {
    this.TaggedLines = this.TaggedLines.map(TaggedLine => 
      TaggedLine.id === updatedTaggedLine.id ? updatedTaggedLine : TaggedLine
    );
    this.TaggedLinesStore.set(this.TaggedLines);
  }
  getTaggedLinesForColumn(columnId: string): TaggedLine[] {
    return this.TaggedLines.filter(TaggedLine => TaggedLine.priority === columnId);
  }
  async saveView(viewConfig:ViewConfig
  ){
    this.plugin.saveCurrentKanbanView()
  }

  getFilesFromFolder(folder: TFolder): TFile[] {
    let files: TFile[] = [];
    folder.children.forEach(child => {
      if (child instanceof TFile) {
        files.push(child);
      } else if (child instanceof TFolder) {
        files = files.concat(this.getFilesFromFolder(child));
      }
    });
    return files;
  }



// Folder
async initializeFolders() {
  try {
    this.folders = await fetchAllFolders(this.app.vault);
  } catch (error) {
    console.error('Failed to fetch folders:', error);
    // Handle the error appropriately
  }
}

getFolders(): string[] {
  return this.folders;
}

  async addColumn(): Promise<ColumnConfig | null> {
    logger.info(`562 ${JSON.stringify(this.propertyConfigs)}`);
    const currentPropertyConfig = this.propertyConfigs.find(pc => pc.name === this.currentProperty);
   
    if (!currentPropertyConfig) {
      console.error('Current property config not found');
      return null;
    }

    const availableValues = currentPropertyConfig.values.filter(
      value => !this.initialViewConfig.columns.some(column => column.id === value)
    );

    return new Promise<ColumnConfig>((resolve) => {
      new AddColumnSelectionModal(
        this.app,
        availableValues,
        currentPropertyConfig,
        (selectedValue: string) => {
          const newColumn: ColumnConfig = {
            id: selectedValue,
            key: selectedValue,
            name: selectedValue,
            syntax: '[::]',
            width: 200, // Default width
          };
          resolve(newColumn);
        }
      ).open();
    });
  }



  sortColumns() {
    // Implementation for sorting a column
  }

  filterColumns() {
    // Implementation for filtering a column
  }

 async updatePropertiesConfig():Promise<void>{
 this.propertyConfigs=await this.fetchTaggedLinesProperties();
  logger.info("00142:PropertyConfig" ,this.propertyConfigs);
 }
  async fetchTaggedLinesProperties(): Promise<PropertyConfig[]> {
    let configs: PropertyConfig[] = [
      { name: 'priority', values: ['lowest', 'low', 'normal', 'medium', 'high', 'highest'] },
      { name: 'status', values: ['To Do', 'Done'] }
    ];

    // Add dynamic properties associated to TaggedLines
    let dynamicProps = new Set<string>();
    this.TaggedLines.forEach(TaggedLine => {
      Object.keys(TaggedLine.dynamicProperties).forEach(prop => dynamicProps.add(prop));
    });

    dynamicProps.forEach(prop => {
      let values = new Set<string>();
      this.TaggedLines.forEach(TaggedLine => {
        if (TaggedLine.dynamicProperties[prop]) {
          values.add(TaggedLine.dynamicProperties[prop]);
        }
      });
      configs.push({ name: prop, values: Array.from(values) });
    });
    logger.info("00141:PropertyConfig" ,configs);
    return configs;
  }


  selectProperty(): Promise<string | null> {
    return new Promise((resolve) => {
      new PropertySelectionModal(
        this.app,
        this.propertyConfigs,
        (selectedProperty: string) => {
          resolve(selectedProperty);
        }
      ).open();
    });
  }
  toString(): string {
    return `This is a container object`;
}
}