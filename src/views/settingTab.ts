import { App, PluginSettingTab, Setting } from 'obsidian';
import TaggedLineOrganizerPlugin from '../main';

export class SettingTab extends PluginSettingTab {
  plugin: TaggedLineOrganizerPlugin;

  constructor(app: App, plugin: TaggedLineOrganizerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Line Tag')
      .setDesc('The tag used to identify the lines to fetch from your vault')
      .addText(text => text
        .setValue(this.plugin.pluginSettings.overallSettings.lineTag)
        .setValue(this.plugin.pluginSettings.viewConfig.lineTag)
        .onChange(async (value) => {
          this.plugin.pluginSettings.viewConfig.lineTag = value;
          this.plugin.pluginSettings.overallSettings.lineTag = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('Query checkbox lines')
      .setDesc('Toggle this if you want to fetch all the lines that have an assoicated checkbox')
      .addToggle(toggle => toggle
        .setValue(this.plugin.pluginSettings.overallSettings.checkboxLines)
        .onChange(async (value) => {
          this.plugin.pluginSettings.overallSettings.checkboxLines = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('Priority Format')
      .setDesc('The format used for TaggedLine priorities')
      .addText(text => text
        .setValue(this.plugin.pluginSettings.overallSettings.priorityFormat)
        .onChange(async (value) => {
          this.plugin.pluginSettings.overallSettings.priorityFormat = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default Kanban Folder')
      .setDesc('The default folder to load TaggedLines from for Kanban views')
      .addText(text => text
        .setValue(this.plugin.pluginSettings.overallSettings.defaultKanbanFolder)
        .setValue(this.plugin.pluginSettings.viewConfig.selectedFolder)
        .onChange(async (value) => {
          this.plugin.pluginSettings.viewConfig.selectedFolder = value;
          this.plugin.pluginSettings.overallSettings.defaultKanbanFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default View Save Folder')
      .setDesc('The default folder to save Kanban view configurations')
      .addText(text => text
        .setValue(this.plugin.pluginSettings.overallSettings.defaultViewSaveFolder)
        .onChange(async (value) => {
          this.plugin.pluginSettings.overallSettings.defaultViewSaveFolder = value;
          await this.plugin.saveSettings();
        }));
        new Setting(containerEl)
        .setName('File prefix for saving KanbanView')
        .setDesc('The prefix to use to save your KanbanView as a note')
        .addText(text => text
          .setValue(this.plugin.pluginSettings.overallSettings.defaultFilePrefix)
          .onChange(async (value) => {
            this.plugin.pluginSettings.overallSettings.defaultFilePrefix = value;
            await this.plugin.saveSettings();
          }));
  

    new Setting(containerEl)
      .setName('Default Kanban Property')
      .setDesc('The default property to use for Kanban views')
      .addText(text => text
        .setValue(this.plugin.pluginSettings.overallSettings.defaultKanbanProperty)
        .setValue(this.plugin.pluginSettings.viewConfig.selectedProperty)
        .onChange(async (value) => {
          this.plugin.pluginSettings.overallSettings.defaultKanbanProperty = value;
          this.plugin.pluginSettings.viewConfig.selectedProperty=value;
          await this.plugin.saveSettings();
        }));
  }
}