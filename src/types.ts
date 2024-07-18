import  {  SvelteComponent } from 'svelte';
import type { Writable } from 'svelte/store';
import type { KanbanContainer } from './KanbanContainer';

export interface PluginSettings {
overallSettings: TaggedLineOrganizerSettings;
viewConfig:ViewConfig;
}
export interface TaggedLineOrganizerSettings {
  lineTag: string;
  priorityFormat: string;
  defaultKanbanFolder: string;
  defaultFilePrefix:string;
  defaultViewSaveFolder: string;
  defaultKanbanProperty: string;
  checkBoxLines: boolean;
}
export interface ViewConfig {
  id: string;
  name: string;
  type: 'kanban' | 'table';
  columns: ColumnConfig[];
  filters: FilterConfig[];
  sorts: OrderByConfig[];
  groupby: GroupByConfig[];
  selectedFolder: string; 
  selectedProperty:string;
  toggles: TogglesConfig;
  lineTag: string;
  checkBoxLines: boolean;

}
export interface TogglesConfig {
  toggleProperties:boolean;
  toggleTags:boolean;
  toggleTaggedLineBullet:boolean;
  toggleFolders:boolean;
  collapseAllHeaders:boolean;
}

export interface ColumnConfig {
  id: string;
  key: string;
  name: string;
  syntax: string;
  values?: string[] | undefined;
  width: number
}
export type FilterCondition = {
  type: 'tag' | 'property';
  tag?: string;
  property?: string;
  values?: string[];
  presence: boolean;
};


export type LogicalOperator = 'AND' | 'OR';

export type ExpressionNode = {
  type: 'condition' | 'operator';
  filter?: FilterCondition;
  operator?: LogicalOperator;
  left?: ExpressionNode;
  right?: ExpressionNode;
};

export type FilterConfig = {
  expressionTree: ExpressionNode | null;
};
export interface TagFilter {
  type: 'tag';
  tag: string;
  presence: boolean;
}
export interface OrderByConfig {
  order: 'asc' | 'desc';
  type: 'value' | 'count';
}

export interface PropertyFilter {
  type: 'property';
  property: string;
  values: string[];
  presence: boolean;
}
export type ConditionFilter = TagFilter | PropertyFilter;

export interface GroupByConfig {
  type: 'propertyValues' | 'properties' | 'tags'| 'none';
  properties?: string[]; 
  tags?: string[]; 
  includeAll?: boolean; 
}
export interface GroupedTaggedLines {
  groupName: string;
  TaggedLines: TaggedLine[];
}

export interface PropertyConfig {
  name: string;
  values: string[];
}

export type Priority = 'lowest' | 'low' | 'normal' | 'medium' | 'high' | 'highest';


export interface TaggedLine {
  id: string;
  description: string;
  status: 'To Do' | 'Done';
  tags: string[];
  priority: Priority;
  dynamicProperties: { [key: string]: any };
  filePath: string;
  lineNumber: number;
}

export interface KanbanViewProps {
  container: KanbanContainer;
  initialViewConfig: ViewConfig;
  TaggedLinesStore: Writable<TaggedLine[]>;
  currentProperty: string | null;

}

export class KanbanViewComponent extends SvelteComponent<KanbanViewProps> {}

export type KanbanViewConstructor = new (options: {
  target: HTMLElement;
  props: KanbanViewProps;
}) => KanbanViewComponent;
