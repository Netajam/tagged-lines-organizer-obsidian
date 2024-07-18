import { App, Modal, Notice, Setting } from 'obsidian';
import type { PropertyConfig } from 'src/types';

export class AddColumnSelectionModal extends Modal {
  private result: string;
  private customValue: string = '';

  constructor(
    app: App,
    private availableValues: string[],
    private propertyConfig: PropertyConfig,
    private onSubmit: (result: string) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Add New Column' });

    new Setting(contentEl)
      .setName('Select existing value')
      .addDropdown(dropdown => 
        dropdown
          .addOptions({ '': 'Select a value', ...Object.fromEntries(this.availableValues.map(v => [v, v])) })
          .onChange(value => {
            this.result = value;
          })
      );

    new Setting(contentEl)
      .setName('Or enter a new value')
      .addText(text => 
        text
          .setPlaceholder('Enter custom value')
          .onChange(value => {
            this.customValue = value;
          })
      );

    new Setting(contentEl)
      .addButton(btn => 
        btn
          .setButtonText('Add Column')
          .setCta()
          .onClick(() => {
            const finalValue = this.customValue || this.result;
            if (finalValue) {
              this.onSubmit(finalValue);
              // If it's a new value, add it to the property config
              if (!this.availableValues.includes(finalValue)) {
                this.propertyConfig.values.push(finalValue);
              }
              this.close();
            } else {
              new Notice('Please select or enter a value');
            }
          })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}