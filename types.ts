export interface AppProject {
  id: string;
  name: string;
  description: string;
  version: string;
  platform: 'iOS' | 'Android' | 'Web' | 'Hybrid';
  createdAt: number;
}

export interface BaseItem {
  id: string;
  appId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlanningDoc extends BaseItem {
  content: string; // Markdown content
}

export interface Report extends BaseItem {
  type: 'CodeAnalysis' | 'ProjectAnalysis' | 'Interim' | 'Final' | 'Other';
  summary: string;
  fileName?: string; // Simulated file attachment
}

export interface PromptLog extends BaseItem {
  prompt: string;
  response: string;
  tags: string[];
}

export interface Memo extends BaseItem {
  content: string;
}

export interface Issue extends BaseItem {
  status: 'Open' | 'Resolved' | 'InProgress';
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  solution?: string;
}

export interface Screenshot extends BaseItem {
  imageUrl: string; // For this demo, we'll use placeholder URLs or base64
  description?: string;
}

// Union type for all sub-items
export type AppItem = PlanningDoc | Report | PromptLog | Memo | Issue | Screenshot;