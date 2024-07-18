import { logger } from './utils/logger';
import { Plugin, TFile, Notice, View } from 'obsidian';
import { KanbanContainer } from './KanbanContainer';
import type { PluginSettings, TaggedLineOrganizerSettings, ViewConfig } from './types';
import { SettingTab } from './views/settingTab';
import { FileSelectionModal } from './utils/fileUtils';
import { TaggedLinesExtractor } from './TaggedLineExtractor';

export const VIEW_TYPE_KANBAN = "TaggedLine-organizer-kanban";




export default class TaggedLineOrganizerPlugin extends Plugin {
  private static instance: TaggedLineOrganizerPlugin;
  TaggedLineExtractor: TaggedLinesExtractor| null = null;
  defaultViewConfig: ViewConfig = {
    id: `kanban-${Date.now()}`,
    name: 'Kanban View',
    type: 'kanban',
    columns: [],
    filters: [],
    sorts: [],
    groupby:[],
    toggles: {collapseAllHeaders:false, toggleProperties:true, toggleFolders:true,toggleTags:true,toggleTaggedLineBullet:true},
    selectedFolder: '/',
    selectedProperty: 'priority',
    lineTag:`task`,
    checkBoxLines: true,
  };
  overallSettings: TaggedLineOrganizerSettings = {
    lineTag: 'task',
    priorityFormat: '[priority:: $priority]',
    defaultKanbanFolder: 'Release',
    defaultViewSaveFolder: '/',
    defaultFilePrefix: 'KanbanView',
    defaultKanbanProperty: 'status',
    checkBoxLines: true,
  };
  pluginSettings:PluginSettings={
    overallSettings:this.overallSettings,
    viewConfig:this.defaultViewConfig};

  constructor(app: any, manifest: any) {
    super(app, manifest);
    if (TaggedLineOrganizerPlugin.instance) {
      return TaggedLineOrganizerPlugin.instance;
    }
    TaggedLineOrganizerPlugin.instance = this;
    this.TaggedLineExtractor;
  }

  async onload() {
    logger.setPlugin(this);
    logger.info('0001: Plugin loaded successfully');

    await this.updatePluginSettings();
    this.TaggedLineExtractor= new TaggedLinesExtractor(this.app,this.pluginSettings.overallSettings.lineTag);
    // Main View
    this.registerView(
      VIEW_TYPE_KANBAN,
      (leaf) => new KanbanContainer(leaf, this, this.defaultViewConfig)
    );
    //Commands & Settings Tab
    //Settings Tab
    this.addSettingTab(new SettingTab(this.app, this));
    // Ribbon
    this.addRibbonIcon("folder-kanban", 'Open TaggedLine Kanban', () => {
      this.activateView();
    });
    // Commands
    this.addCommand({
      id: 'open-TaggedLine-kanban',
      name: 'Open TaggedLine Kanban',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'save-kanban-view',
      name: 'Save current kanban view',
      callback: () => this.saveCurrentKanbanView(),
    });

    this.addCommand({
      id: 'load-kanban-view',
      name: 'Load an existing kanban View',
      callback: () => this.loadKanbanView(),
    });

    this.addCommand({
      id: 'new-kanban-view',
      name: 'Create new kanban view',
      callback: () => this.createNewKanbanView(),
    });

  }

  async updatePluginSettings() {
    await this.loadSettings();
    this.updateDefaultViewConfig();
    this.pluginSettings={overallSettings:this.overallSettings,viewConfig:this.defaultViewConfig};
  
    logger.info("0002", this.pluginSettings);
  }
  async loadSettings(){
    this.pluginSettings = Object.assign(await this.loadData());

    logger.info("00021", this.overallSettings);
  }
  updateDefaultViewConfig(){
    this.defaultViewConfig.selectedFolder=this.overallSettings.defaultKanbanFolder;
    this.defaultViewConfig.selectedProperty=this.overallSettings.defaultKanbanProperty;

    logger.info("00022"+this.defaultViewConfig.selectedProperty, this.defaultViewConfig);
  }
  async saveSettings() {
    await this.saveData(this.pluginSettings);
  }
  async activateView() {
    logger.info(`5315`);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_KANBAN);
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_KANBAN)[0];

    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
    }

    workspace.revealLeaf(leaf);
  }
  async createNewKanbanView() {
    logger.info(`5316`);

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({
      type: VIEW_TYPE_KANBAN,
      active: true,
    });
  }

  async saveCurrentKanbanView() {
    const activeView = this.app.workspace.getActiveViewOfType(KanbanContainer);
    if (activeView) {
      const viewConfig = activeView.getViewConfig();
      const fileName = `${this.overallSettings.defaultFilePrefix}-${Date.now()}.md`;
      const filePath = `${this.overallSettings.defaultViewSaveFolder}/${fileName}`;
      const fileProperties = `---
kanban_view: true
---
  
${JSON.stringify(viewConfig, null, 2)}`;

      try {
        await this.app.vault.create(filePath, fileProperties);
        new Notice(`Kanban view saved as ${fileName}`);
      } catch (error) {
        console.error("Failed to save Kanban view:", error);
        new Notice("Failed to save Kanban view");
      }
    }
  }
  async loadKanbanView() {
    logger.info(`5317`);
  
    const files = this.app.vault.getMarkdownFiles();
    const kanbanFiles = [];
  
    for (const file of files) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (frontmatter && frontmatter['kanban_view'] === true) {
        kanbanFiles.push(file);
      }
    }
  
    if (kanbanFiles.length === 0) {
      new Notice("No saved Kanban views found");
      return;
    }
  
    const modal = new FileSelectionModal(this.app, kanbanFiles, async (file: TFile) => {
      try {
        const content = await this.app.vault.read(file);
        const contentParts = content.split('---');
        if (contentParts.length >= 3) {
          const viewConfigJson = contentParts[2].trim();
          const viewConfig = JSON.parse(viewConfigJson) as ViewConfig;
          logger.info(`531 ${JSON.stringify(viewConfig)}`);
          this.defaultViewConfig=viewConfig;
          // Get the current leaf
       
  
          // Set the view state of the leaf to the KanbanContainer view
          const leaf = this.app.workspace.getLeaf('tab');
      
      
          // Create a new KanbanContainer instance with the existing leaf
          new KanbanContainer(leaf,this,viewConfig);
        } else {
          throw new Error("Invalid file format");
        }
      } catch (error) {
        console.error("Failed to load Kanban view:", error);
        new Notice("Failed to load Kanban view");
      }
    });
  
    modal.open();
  }
  static getInstance(app?: any, manifest?: any): TaggedLineOrganizerPlugin {
    if (!TaggedLineOrganizerPlugin.instance && app && manifest) {
      TaggedLineOrganizerPlugin.instance = new TaggedLineOrganizerPlugin(app, manifest);
    }
    return TaggedLineOrganizerPlugin.instance;
  }

}
