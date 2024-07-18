import { App, Modal,TFile } from 'obsidian';

export class FileSelectionModal extends Modal {
    constructor(app: App, private files: TFile[], private onChoose: (file: TFile) => void) {
      super(app);
    }
  
    onOpen() {
      const {contentEl} = this;
      contentEl.empty();
      contentEl.createEl("h2", {text: "Select a Kanban View to load"});
  
      const ul = contentEl.createEl("ul");
      this.files.forEach(file => {
        const li = ul.createEl("li");
        li.createEl("a", {text: file.name, href: "#"})
          .addEventListener("click", (event) => {
                 this.onChoose(file);
            this.close();
          });
      });
    }
  
    onClose() {
      const { contentEl } = this;
      contentEl.empty();
    }
  }