export interface DataType {
  id: string;
  name: string;
  color: string;
}

export interface Scenario {
  id: string;
  name: string;
  categoryId: string;
  inputs: string[];   // DataType IDs
  outputs: string[];  // DataType IDs
}

export interface Category {
  id: string;
  name: string;
}

export interface WorkflowStep {
  scenarioId: string;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export interface AppState {
  dataTypes: DataType[];
  categories: Category[];
  scenarios: Scenario[];
  workflows: Workflow[];
}
