import type { TaggedLine, ViewConfig, KanbanViewComponent, PropertyConfig, ColumnConfig } from './types';
import type { Writable } from 'svelte/store';

export  interface KanbanContainerInterface {
  component: KanbanViewComponent | null;
  initialViewConfig:ViewConfig;
  TaggedLinesStore: Writable<TaggedLine[]>;
  propertyConfigs: PropertyConfig[];
  currentProperty: string;
  getViewType(): string;
  getDisplayText(): string;
  getViewConfig(): ViewConfig;
  initTaggedLinesStore(): Promise<void>;
  getTaggedLines(): TaggedLine[];
  updateTaggedLineStore(updatedTaggedLine: TaggedLine): void;
  getTaggedLinesForColumn(columnId: string): TaggedLine[];
  saveView(viewConfig:ViewConfig): Promise<void>;
  addColumn(): Promise<ColumnConfig | null>;
  sortColumns(): void;
  filterColumns(): void;
  selectProperty(): Promise<string| null> ;
  getFolders(): string[];
  updatePropertiesConfig(): Promise<void>;

}