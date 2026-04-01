export interface DataType {
  id: string;
  name: string;
  color: string;
}

export interface Scenario {
  id: string;
  name: string;
  categoryId: string;
  inputs: string[];   // free-text data type names
  outputs: string[];  // free-text data type names
  steps: string[];    // ordered list of steps within this scenario
}

export interface Category {
  id: string;
  name: string;
}

export interface WorkflowStep {
  scenarioId: string;
  order: number;
}

export interface WorkflowNode {
  id: string;
  scenarioId: string;
}

export interface WorkflowEdge {
  from: string;  // WorkflowNode id, or "start" for entry nodes
  to: string;    // WorkflowNode id
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];       // kept for backwards compat during migration
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface AppState {
  dataTypes: DataType[];
  categories: Category[];
  scenarios: Scenario[];
  workflows: Workflow[];
}
