// TaggedLineUtils.ts

import { App, TFile, MarkdownView } from 'obsidian';
import type { TaggedLine, Priority } from '../types';
import type { Writable } from 'svelte/store';
import { logger } from './logger';

export async function openTaggedLineInVault(app: App, TaggedLine: TaggedLine): Promise<void> {
    const file = app.vault.getAbstractFileByPath(TaggedLine.filePath);
    if (file instanceof TFile) {
        const leaf = app.workspace.splitActiveLeaf();
        await leaf.openFile(file);
        const view = leaf.view;

        // Check if the view is a MarkdownView
        if (view instanceof MarkdownView) {
            const editor = view.editor;
            if (editor) {
                // Set the cursor position
                editor.setCursor({ line: TaggedLine.lineNumber - 1, ch: 6 });
                editor.focus();

                // Scroll to the line
                const line = TaggedLine.lineNumber - 1;
                const char = 6; // Adjust as needed or set to 0 to scroll to the start of the line
                editor.scrollIntoView({ from: { line, ch: char }, to: { line, ch: char } },true);
            }
        }
    }
}
export async function updateTaggedLineDescription(
    app: App, 
    TaggedLine: TaggedLine, 
    newDescription: string, 
    TaggedLinesStore: Writable<TaggedLine[]>
): Promise<void> {
    const file = app.vault.getAbstractFileByPath(TaggedLine.filePath);
    if (!(file instanceof TFile)) {
        console.error('File not found:', TaggedLine.filePath);
        return;
    }

    try {
        const content = await app.vault.read(file);
        const lines = content.split('\n');
        const lineToUpdate = lines[TaggedLine.lineNumber - 1];

        if (lineToUpdate) {
            // Parse the TaggedLine line
            const statusMatch = lineToUpdate.match(/^(\s*-\s*\[.\])/);
            const status = statusMatch ? statusMatch[1] : '';

            // Remove status from the line for easier parsing
            let remainingLine = lineToUpdate.replace(/^\s*-\s*\[.\]\s*/, '').trim();

            // Extract tags and properties
            const tagsAndProps = remainingLine.match(/(#\w+|\[.*?::.*?\])/g) || [];
            
            // Remove tags and properties from the remaining line to get the old description
            tagsAndProps.forEach(item => {
                remainingLine = remainingLine.replace(item, '').trim();
            });

            // Construct the updated line
            const updatedLine = [
                status,
                newDescription.trim(),
                ...tagsAndProps
            ].filter(Boolean).join(' ').trim();

            lines[TaggedLine.lineNumber - 1] = updatedLine;
            await app.vault.modify(file, lines.join('\n'));

            // Update the TaggedLine in the store
            const updatedTaggedLine = { ...TaggedLine, description: newDescription.trim() };
            TaggedLinesStore.update(TaggedLines => 
                TaggedLines.map(t => t.id === updatedTaggedLine.id ? updatedTaggedLine : t)
            );

            logger.info('TaggedLine description updated successfully');
        } else {
            console.error('TaggedLine line not found');
        }
    } catch (error) {
        console.error('Error updating TaggedLine description:', error);
    }
}

export async function updateTaggedLinePriorityInFile(
    app: App,
    TaggedLine: TaggedLine, 
    newPriority: Priority, 
): Promise<void> {
    const file = app.vault.getAbstractFileByPath(TaggedLine.filePath);
    if (file instanceof TFile) {
        const content = await app.vault.read(file);
        const lines = content.split('\n');
        const taggedLineString = lines[TaggedLine.lineNumber - 1];
        
        if (taggedLineString) {
            const priorityRegex = /\[priority::\s*(lowest|low|normal|medium|high|highest)?\]/;
            let updatedLine: string;
            
            if (priorityRegex.test(taggedLineString)) {
                updatedLine = taggedLineString.replace(
                    priorityRegex,
                    `[priority:: ${newPriority}]`
                );
            } else {
                updatedLine = `${taggedLineString} [priority:: ${newPriority}] `;
            }
            
            lines[TaggedLine.lineNumber - 1] = updatedLine;
            await app.vault.modify(file, lines.join('\n'));

        }
    }
    
}

export async function updateTaggedLinePropertyInFile(
    app: App,
    taggedLine: TaggedLine, 
    propertyName: string,
    newValue: string,
): Promise<string|undefined> {
    logger.info(`Updating TaggedLine property: ${propertyName} to ${newValue} for TaggedLine:`, taggedLine);

    const file = getFileOfTaggedLine(app,taggedLine);
    if (!file) {
        console.error('File not found:', taggedLine.filePath);
        return;
    }

    try {
        const content = await app.vault.read(file);
        const lines = content.split('\n');
        
        if (taggedLine.lineNumber <= 0 || taggedLine.lineNumber > lines.length) {
            console.error('Invalid line number:', taggedLine.lineNumber);
            return;
        }

        let taggedLineString = lines[taggedLine.lineNumber - 1];
        let updatedLineString:string;
        const propertyRegex = new RegExp(`\\[${propertyName}::\\s*([^\\]]*)\\]`);
        
      
        if(taggedLineString){
        if (propertyRegex.test(taggedLineString)) {
            logger.info('Property found in TaggedLine line. Updating...');
            updatedLineString = taggedLineString.replace(propertyRegex, `[${propertyName}:: ${newValue}]`);
        } else {
            logger.info('Property not found in TaggedLine line. Adding...');
            updatedLineString = `${taggedLineString} [${propertyName}:: ${newValue}] `;
        }
        
        logger.info('Updated TaggedLine line:'+ updatedLineString);

        if (updatedLineString !== taggedLineString) {
            lines[taggedLine.lineNumber - 1] = updatedLineString;
            await app.vault.modify(file, lines.join('\n'));
            logger.info('File updated successfully');
            return updatedLineString;
        } else {
            logger.info('No changes made to the file');
            return;
        }
    }
    return ;
   
    } catch (error) {
        console.error('Error updating TaggedLine property:', error);
        return;
    }
}
 export async function updateTaggedLineStatus( app:App,
    taggedLine: TaggedLine): Promise<void> {

        try{
        const file = getFileOfTaggedLine(app,taggedLine);
        if (!file) {
            console.error('File not found:', taggedLine.filePath);
            return;
        }
    
        try {
            const content = await app.vault.read(file);
            const lines = content.split('\n');
            
            if (taggedLine.lineNumber <= 0 || taggedLine.lineNumber > lines.length) {
                console.error('Invalid line number:', taggedLine.lineNumber);
                return;
            }
    
            let taggedLineString = lines[taggedLine.lineNumber - 1];
            let updatedLineString:string;
       if (taggedLine.status === 'Done') {
        updatedLineString = taggedLineString.replace(/- \[[xX]\]/, '- [ ]');
       } else {
        updatedLineString = taggedLineString.replace(/- \[ \]/, '- [x]');
       }
       
       lines[taggedLine.lineNumber - 1] = updatedLineString;
       await app.vault.modify(file, lines.join('\n'));
     }
     catch (error){ console.error('Updating status of line in file failed',error);}
    }
catch (error){ console.error('Updating status of line in file failed',error);}}
 function getFileOfTaggedLine(app: App,
    taggedLine: TaggedLine): TFile | undefined{
        const file = app.vault.getAbstractFileByPath(taggedLine.filePath);

        if (!(file instanceof TFile)) {
            console.error('File not found:', taggedLine.filePath);
            return;
        }
        else{
            return file;

        }
}