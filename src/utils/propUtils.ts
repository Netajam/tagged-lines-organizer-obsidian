import { App, Modal, Setting } from 'obsidian';
import type { PropertyConfig } from '../types';
import { logger } from './logger';

export class PropertySelectionModal extends Modal {

  constructor(
    app: App,
    private properties: PropertyConfig[],
    private onChoose: (property: string) => void
  ) {
    super(app);
  }

  onOpen() {
    logger.info("Property selection triggered");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Select a property for Kanban view' });

    this.properties.forEach(prop => {
      new Setting(contentEl)
        .setName(prop.name)
        .addButton(button => button
          .setButtonText('Select')
          .onClick(() => {
            prop.name;
            this.close();
            this.onChoose(prop.name);
          }));
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}