import { App, Modal, Setting } from 'obsidian';
import { writable, get, Writable, Readable } from 'svelte/store';
import type { TaggedLine, PropertyConfig, ColumnConfig } from './types';
export class GroupByModal extends Modal {
    private selectedProperties: string[] = [];
    private selectedTags: string[] = [];
  
    constructor(
      app: App,
      private propertyConfigs: Readable<PropertyConfig[]>,
      private groupByStore: Writable<GroupByConfig>,
      private onApply: () => void
    ) {
      super(app);
    }
  
    onOpen() {
      const { contentEl } = this;
      const currentConfig = get(this.groupByStore);
      const configs = get(this.propertyConfigs);
  
      contentEl.empty();
      contentEl.createEl('h2', { text: 'Group TaggedLines By' });
  
      new Setting(contentEl)
        .setName('Group By Type')
        .addDropdown(dropdown => {
          dropdown
            .addOptions({
              'propertyValues': 'Property Values',
              'properties': 'Properties',
              'tags': 'Tags'
            })
            .setValue(currentConfig.type)
            .onChange(value => {
              this.groupByStore.update(config => ({ ...config, type: value as GroupByConfig['type'] }));
              this.updateModalContent(value as GroupByConfig['type']);
            });
        });
  
      this.updateModalContent(currentConfig.type);
  
      new Setting(contentEl)
        .addButton(btn => 
          btn
            .setButtonText('Apply')
            .setCta()
            .onClick(() => {
              this.updateGroupByStore();
              this.close();
              this.onApply();
            })
        );
    }
  
    private updateModalContent(type: GroupByConfig['type']) {
      const contentEl = this.contentEl;
      const configsDiv = contentEl.createDiv('group-by-configs');
      configsDiv.empty();
  
      switch (type) {
        case 'propertyValues':
        case 'properties':
          this.createPropertySelectionUI(configsDiv, type);
          break;
        case 'tags':
          this.createTagSelectionUI(configsDiv);
          break;
      }
    }
  
    private createPropertySelectionUI(container: HTMLElement, type: 'propertyValues' | 'properties') {
      const configs = get(this.propertyConfigs);
      
      new Setting(container)
        .setName('Select Properties')
        .setDesc('Choose properties to group by')
        .addDropdown(dropdown => {
          configs.forEach(config => {
            dropdown.addOption(config.name, config.name);
          });
          dropdown.onChange(value => {
            if (!this.selectedProperties.includes(value)) {
              this.selectedProperties.push(value);
              this.updateSelectedPropertiesList(container);
            }
          });
        });
  
      new Setting(container)
        .setName('Include All Properties')
        .addToggle(toggle => {
          toggle.setValue(get(this.groupByStore).includeAll || false)
            .onChange(value => {
              this.groupByStore.update(config => ({ ...config, includeAll: value }));
            });
        });
  
      this.updateSelectedPropertiesList(container);
    }
  
    private updateSelectedPropertiesList(container: HTMLElement) {
      const listEl = container.querySelector('.selected-properties') || container.createEl('ul', { cls: 'selected-properties' });
      listEl.empty();
      this.selectedProperties.forEach(prop => {
        const li = listEl.createEl('li');
        li.setText(prop);
        li.createEl('button', { text: 'X' }).onclick = () => {
          this.selectedProperties = this.selectedProperties.filter(p => p !== prop);
          this.updateSelectedPropertiesList(container);
        };
      });
    }
  
    private createTagSelectionUI(container: HTMLElement) {
      // Implement tag selection UI here
      // This would be similar to the property selection UI, but for tags
    }
  
    private updateGroupByStore() {
      this.groupByStore.update(config => ({
        ...config,
        properties: this.selectedProperties,
        tags: this.selectedTags
      }));
    }
  
    onClose() {
      const { contentEl } = this;
      contentEl.empty();
    }
  }