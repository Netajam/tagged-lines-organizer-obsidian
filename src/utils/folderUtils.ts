import { TFolder, Vault } from 'obsidian';

/**
 * Fetches all folders in the Obsidian vault.
 * @param vault The Obsidian vault to fetch folders from.
 * @returns A Promise that resolves to an array of folder paths.
 */
export async function fetchAllFolders(vault: Vault): Promise<string[]> {
  const folders: string[] = [];

  const collectFolders = (folder: TFolder, path: string = '') => {
    const folderPath = path ? `${path}/${folder.name}` : folder.name;
    
    if (!folder.isRoot()) {
      folders.push(folderPath);
    }

    folder.children.forEach(child => {
      if (child instanceof TFolder) {   
        collectFolders(child, folderPath);
      }
    });
  };

  collectFolders(vault.getRoot());

  // Sort folders alphabetically
  folders.sort((a, b) => a.localeCompare(b));

  return folders;
}

/**
 * Checks if a given path is a valid folder in the vault.
 * @param vault The Obsidian vault to check against.
 * @param path The folder path to validate.
 * @returns A boolean indicating whether the path is a valid folder.
 */
export function isValidFolder(vault: Vault, path: string): boolean {
  const abstractFile = vault.getAbstractFileByPath(path);
  return abstractFile instanceof TFolder;
}

// You can add more folder-related utility functions here as needed