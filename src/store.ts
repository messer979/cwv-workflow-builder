import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppState, Category, Scenario, Workflow, WorkflowStep } from "@/types";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Seed data based on the original warehouse concept ───────────────────────

const CAT_RECEIVING = "cat_receiving";
const CAT_PUTAWAY = "cat_putaway";
const CAT_CYCLE_COUNT = "cat_cyclecount";

const SEED_CATEGORIES: Category[] = [
  { id: CAT_RECEIVING, name: "Receiving" },
  { id: CAT_PUTAWAY, name: "Putaway" },
  { id: CAT_CYCLE_COUNT, name: "Cycle Counting" },
];

const SEED_SCENARIOS: Scenario[] = [
  {
    id: "sc_recv_pallets",
    name: "Receive Pallets",
    categoryId: CAT_RECEIVING,
    inputs: ["Purchase Order", "ASN"],
    outputs: ["LPN"],
  },
  {
    id: "sc_recv_cases",
    name: "Receive Cases",
    categoryId: CAT_RECEIVING,
    inputs: ["Purchase Order", "ASN"],
    outputs: ["LPN"],
  },
  {
    id: "sc_putaway_pallets",
    name: "Putaway Pallets",
    categoryId: CAT_PUTAWAY,
    inputs: ["LPN"],
    outputs: ["Located Inventory"],
  },
  {
    id: "sc_putaway_cases",
    name: "Putaway Cases",
    categoryId: CAT_PUTAWAY,
    inputs: ["LPN"],
    outputs: ["Located Inventory"],
  },
  {
    id: "sc_cycle_count",
    name: "Cycle Count",
    categoryId: CAT_CYCLE_COUNT,
    inputs: ["Location", "Located Inventory"],
    outputs: ["Verified Inventory"],
  },
];

interface Actions {
  // Categories
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;

  // Scenarios
  addScenario: (
    name: string,
    categoryId: string,
    inputs: string[],
    outputs: string[]
  ) => void;
  updateScenario: (id: string, update: Partial<Scenario>) => void;
  removeScenario: (id: string) => void;

  // Workflows
  addWorkflow: (name: string) => string;
  removeWorkflow: (id: string) => void;
  addWorkflowStep: (workflowId: string, scenarioId: string) => void;
  removeWorkflowStep: (workflowId: string, stepIndex: number) => void;
  moveWorkflowStep: (
    workflowId: string,
    stepIndex: number,
    direction: "up" | "down"
  ) => void;
  updateWorkflowName: (id: string, name: string) => void;

  // Helpers
  getAllKnownDataTypes: () => string[];
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      dataTypes: [],
      categories: SEED_CATEGORIES,
      scenarios: SEED_SCENARIOS,
      workflows: [],

      addCategory: (name) => {
        const state = get();
        if (
          state.categories.some(
            (c) => c.name.toLowerCase() === name.toLowerCase()
          )
        )
          return;
        set({
          categories: [
            ...state.categories,
            { id: genId(), name },
          ],
        });
      },

      removeCategory: (id) => {
        const state = get();
        set({
          categories: state.categories.filter((c) => c.id !== id),
          scenarios: state.scenarios.filter((s) => s.categoryId !== id),
        });
      },

      addScenario: (name, categoryId, inputs, outputs) => {
        const state = get();
        set({
          scenarios: [
            ...state.scenarios,
            { id: genId(), name, categoryId, inputs, outputs },
          ],
        });
      },

      updateScenario: (id, update) => {
        const state = get();
        set({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, ...update } : s
          ),
        });
      },

      removeScenario: (id) => {
        const state = get();
        set({
          scenarios: state.scenarios.filter((s) => s.id !== id),
          workflows: state.workflows.map((w) => ({
            ...w,
            steps: w.steps
              .filter((st) => st.scenarioId !== id)
              .map((st, i) => ({ ...st, order: i })),
          })),
        });
      },

      addWorkflow: (name) => {
        const state = get();
        const id = genId();
        set({
          workflows: [...state.workflows, { id, name, steps: [] }],
        });
        return id;
      },

      removeWorkflow: (id) => {
        const state = get();
        set({
          workflows: state.workflows.filter((w) => w.id !== id),
        });
      },

      addWorkflowStep: (workflowId, scenarioId) => {
        const state = get();
        set({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  steps: [
                    ...w.steps,
                    { scenarioId, order: w.steps.length },
                  ],
                }
              : w
          ),
        });
      },

      removeWorkflowStep: (workflowId, stepIndex) => {
        const state = get();
        set({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  steps: w.steps
                    .filter((_, i) => i !== stepIndex)
                    .map((s, i) => ({ ...s, order: i })),
                }
              : w
          ),
        });
      },

      moveWorkflowStep: (workflowId, stepIndex, direction) => {
        const state = get();
        const wf = state.workflows.find((w) => w.id === workflowId);
        if (!wf) return;
        const newSteps = [...wf.steps];
        const swapIdx =
          direction === "up" ? stepIndex - 1 : stepIndex + 1;
        if (swapIdx < 0 || swapIdx >= newSteps.length) return;
        [newSteps[stepIndex], newSteps[swapIdx]] = [
          newSteps[swapIdx],
          newSteps[stepIndex],
        ];
        set({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? { ...w, steps: newSteps.map((s, i) => ({ ...s, order: i })) }
              : w
          ),
        });
      },

      updateWorkflowName: (id, name) => {
        const state = get();
        set({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, name } : w
          ),
        });
      },

      getAllKnownDataTypes: () => {
        const state = get();
        const all = new Set<string>();
        for (const s of state.scenarios) {
          for (const i of s.inputs) all.add(i);
          for (const o of s.outputs) all.add(o);
        }
        return Array.from(all).sort();
      },
    }),
    {
      name: "cwv-workflow-builder",
    }
  )
);
