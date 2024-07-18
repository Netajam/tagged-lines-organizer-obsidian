import { App, TFile,TFolder } from 'obsidian';
import type { TaggedLine as Line, Priority, PropertyConfig, TaggedLine } from './types';
import { logger } from './utils/logger';
import type TaggedLineOrganizerPlugin from './main';

export class TaggedLinesExtractor {
   tagToSearch: string;
   app:App;

  constructor( app: App, tagToSearch: string) {
    this.tagToSearch = tagToSearch;
    this.app=app;
  }
  async extractTaggedLinesFromFolder(folderPath: string): Promise<Line[]> {
    logger.info(`Extracting TaggedLines from folder: ${folderPath}`);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      console.warn(`${folderPath} is not a valid folder`);
      return [];
    }

    const TaggedLines: Line[] = [];
    await this.traverseFolder(folder, TaggedLines);
    logger.info(`Total TaggedLines extracted: ${TaggedLines.length}`);
    return TaggedLines;
  }

  private async traverseFolder(folder: TFolder, TaggedLines: Line[]): Promise<void> {
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === 'md') {
        try {
          const fileTaggedLines = await this.extractLinesTaggedFromFile(child,true);
          TaggedLines.push(...fileTaggedLines);
        } catch (error) {
          console.error(`Error extracting TaggedLines from ${child.path}:`, error);
        }
      } else if (child instanceof TFolder) {
        await this.traverseFolder(child, TaggedLines);
      }
    }
  }

  async extractLinesTaggedFromFile(file: TFile,extractCheckBox:boolean): Promise<Line[]> {
    logger.info(`Extracting lines from file: ${file.path}`);
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const extractedTaggedLines: Line[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === null || line=== undefined) {
        logger.info("Value is null or undefined");
       
      } else {
        const isCheckboxLine = this.isTaskLine(line);
        const isTaggedLine = this.isTaggedLine(line);

      if (this.isTaggedLine(line)) {
        const TaggedLine = this.parseTaggedLine(line, file.path, i + 1);
        if (TaggedLine) extractedTaggedLines.push(TaggedLine);
      }}
    }

    logger.info(`Line extracted from ${file.path}:`, extractedTaggedLines);
    return extractedTaggedLines;
  }

   isTaggedLine(line: string): boolean {
    // Trim the line and convert to lowercase for case-insensitive matching
    const trimmedLine = line.trim().toLowerCase();
    const lowercaseTag = this.tagToSearch.toLowerCase();

    // Check if the trimmed line includes the hashtag
    return trimmedLine.includes(lowercaseTag);
  }
   isTaskLine(line: string): boolean {
    return line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]');
  }

  private parseTaggedLine(line: string, filePath: string, lineNumber: number): Line | null {
    const statusMatch = line.match(/- \[([ x])\]/);
    if (!statusMatch) return null; // This is not a TaggedLine line
  
    const status = statusMatch[1] === 'x' ? 'Done' : 'To Do';
  
    const descriptionMatch = line.match(/- \[[ x]\]\s*(.+)/);
    if (!descriptionMatch) return null;
  
    let description = descriptionMatch[1];
    if (description!= null)
     {

     
    const TaggedLine: Line = {
      id: `${filePath}-${lineNumber}`,
      description: '',
      status,
      tags: [],
      priority: 'normal', // Default priority
      filePath,
      lineNumber,
      dynamicProperties: {}
    };
  
    // Parse tags
    const tagMatches = description.match(/#(\w+)/g);
    if (tagMatches) {
      TaggedLine.tags = tagMatches.map(tag => tag.slice(1)); // Remove the # symbol
      // Remove tags from description
      description = description.replace(/#\w+/g, '').trim();
    }
  
    // Clean and set description after removing tags
    TaggedLine.description = this.cleanTaggedLineDescription(description);
  
    // Parse priority
    const priorityMatch = description.match(/\[priority::\s*(lowest|low|normal|medium|high|highest)\]/);
    if (priorityMatch) {
      TaggedLine.priority = priorityMatch[1] as Priority;
    }
  
    // Parse additional properties
    const propertyMatches = description.matchAll(/\[(\w+)::(.*?)\]/g);
    for (const match of propertyMatches) {
      const [_, property, value] = match;
      if (property && value) {
        TaggedLine.dynamicProperties[property] = value.trim();
      }
    }
  
    return TaggedLine;}
    else {
      return null;
    }
  }

  private cleanTaggedLineDescription(description: string): string {
    // Remove priority metadata
    description = description.replace(/\[priority::\s*\w+\]/g, '');
    // Remove other metadata patterns
    description = description.replace(/\[[^\]]+::[^\]]+\]/g, '');
    // Trim any leading or trailing whitespace
    return description.trim();
  }
  async updateTaskLineStatus(TaggedLine: TaggedLine, newStatus: 'To Do' | 'Done'): Promise<void> {
   try{
    const file = this.app.vault.getAbstractFileByPath(TaggedLine.filePath);
    logger.info("00081");
    if (file instanceof TFile) {
      const content = await this.app.vault.read(file);
      const lines = content.split('\n');
      const lineToUpdate= lines[TaggedLine.lineNumber - 1];
      
      let updatedLine: string;
      if (newStatus === 'To Do') {
        updatedLine = lineToUpdate.replace(/- \[[xX]\]/, '- [ ]');
      } else {
        updatedLine = lineToUpdate.replace(/- \[ \]/, '- [x]');
      }
      
      lines[TaggedLine.lineNumber - 1] = updatedLine;
      await this.app.vault.modify(file, lines.join('\n'));
    }}
    catch (error){ console.error('Updating status of line in file failed',error);}
  }


  async getAllTagedLines(): Promise<Line[]> {
    const files = this.app.vault.getMarkdownFiles();
    const allLines: Line[] = [];

    for (const file of files) {
      const fileTaggedLines = await this.extractLinesTaggedFromFile(file);
      allLines.push(...fileTaggedLines);
    }

    return allLines;
  }

  async updateTaggedLinePriority(TaggedLine: Line, newPriority: Priority): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(TaggedLine.filePath);
    if (file instanceof TFile) {
        const content = await this.app.vault.read(file);
        const lines = content.split('\n');
        const TaggedLine = lines[TaggedLine.lineNumber - 1];

        if (TaggedLine) {
            let updatedLine: string;

            // Define regex pattern to match priority metadata
            const priorityRegex = /\[priority::\s*(lowest|low|normal|medium|high|highest)?\]/;

            // Check if priority metadata exists in the TaggedLine line
            if (priorityRegex.test(TaggedLine)) {
                // Replace existing priority metadata
                updatedLine = TaggedLine.replace(
                    priorityRegex,
                    `[priority:: ${newPriority}]`
                );
            } else {
                // If no priority metadata exists, append it
                updatedLine = `[priority:: ${newPriority}] ${TaggedLine}`;
            }

            lines[TaggedLine.lineNumber - 1] = updatedLine;
            await this.app.vault.modify(file, lines.join('\n'));
        }
    }
}

  
getAvailableProperties(TaggedLines: Line[]): PropertyConfig[] {
  const propertyConfigs: PropertyConfig[] = [];
  const propertyMap = new Map<string, Set<string>>();

  for (const TaggedLine of TaggedLines) {
    for (const [key, value] of Object.entries(TaggedLine.dynamicProperties)) {
      if (!propertyMap.has(key)) {
        propertyMap.set(key, new Set());
      }
      propertyMap.get(key)!.add(value);
    }
  }

  for (const [name, values] of propertyMap.entries()) {
    propertyConfigs.push({ name, values: Array.from(values) });
  }

  return propertyConfigs;
}

}