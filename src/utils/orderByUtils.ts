import { App, Modal, Setting } from 'obsidian';
import { writable, get } from 'svelte/store';
import type { TaggedLine, PropertyConfig, OrderByConfig } from '../types';
import type { Writable, Readable } from 'svelte/store';

export class OrderByModal extends Modal {
    constructor(
      app: App,
      private propertyConfigs: Readable<PropertyConfig[]>,
      private orderByStore: Writable<OrderByConfig>,
      private onApply: () => void
    ) {
      super(app);
    }
  
    onOpen() {
      const { contentEl } = this;
      const currentConfig = get(this.orderByStore);
      const configs = get(this.propertyConfigs);
  
      contentEl.createEl('h2', { text: 'Order TaggedLines' });
  
      new Setting(contentEl)
        .setName('Property')
        .addDropdown(dropdown => {
          const options = {
            'description': 'Description',
            'status': 'Status',
            'priority': 'Priority',
            ...Object.fromEntries(configs.map(pc => [pc.name, pc.name]))
          };
          dropdown
            .addOptions(options)
            .setValue(currentConfig.property)
            .onChange(value => {
              this.orderByStore.update(config => ({ ...config, property: value }));
            });
        });
  
      new Setting(contentEl)
        .setName('Order')
        .addDropdown(dropdown => 
          dropdown
            .addOptions({ 'asc': 'Ascending', 'desc': 'Descending' })
            .setValue(currentConfig.order)
            .onChange(value => {
              this.orderByStore.update(config => ({ ...config, order: value as 'asc' | 'desc' }));
            })
        );
  
      new Setting(contentEl)
        .setName('Type')
        .addDropdown(dropdown => 
          dropdown
            .addOptions({ 'value': 'By Value', 'count': 'By TaggedLine Count' })
            .setValue(currentConfig.type)
            .onChange(value => {
              this.orderByStore.update(config => ({ ...config, type: value as 'value' | 'count' }));
            })
        );
  
      new Setting(contentEl)
        .addButton(btn => 
          btn
            .setButtonText('Apply')
            .setCta()
            .onClick(() => {
              this.close();
              this.onApply();
            })
        );
    }
  
    onClose() {
      const { contentEl } = this;
      contentEl.empty();
    }
  }