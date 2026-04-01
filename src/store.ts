import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AppState, Category, DataType, Scenario, Workflow, WorkflowStep } from "@/types";

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Seed data based on the original warehouse concept ───────────────────────

const CAT_PO_CREATION = "cat_po_creation";
const CAT_ASN_CREATION = "cat_asn_creation";
const CAT_YARD_MGMT = "cat_yard_mgmt";
const CAT_RECEIVING = "cat_receiving";
const CAT_PUTAWAY = "cat_putaway";
const CAT_WAVE_PLANNING = "cat_wave_planning";
const CAT_ORDER_CREATION = "cat_order_creation";
const CAT_PICKING = "cat_picking";
const CAT_PACKING = "cat_packing";
const CAT_LOADING = "cat_loading";
const CAT_SHIPMENT_CLOSE = "cat_shipment_close";
const CAT_CYCLE_COUNT = "cat_cyclecount";

const SEED_CATEGORIES: Category[] = [
  { id: CAT_PO_CREATION, name: "Purchase Order Creation" },
  { id: CAT_ASN_CREATION, name: "ASN Creation" },
  { id: CAT_YARD_MGMT, name: "Yard Management" },
  { id: CAT_RECEIVING, name: "Receiving" },
  { id: CAT_PUTAWAY, name: "Putaway" },
  { id: CAT_CYCLE_COUNT, name: "Cycle Counting" },
  { id: CAT_ORDER_CREATION, name: "Order Creation" },
  { id: CAT_WAVE_PLANNING, name: "Wave Planning" },
  { id: CAT_PICKING, name: "Picking" },
  { id: CAT_PACKING, name: "Packing" },
  { id: CAT_LOADING, name: "Loading" },
  { id: CAT_SHIPMENT_CLOSE, name: "Shipment Close" },
];

const SEED_SCENARIOS: Scenario[] = [
  {
    id: "sc_po_create",
    name: "Create Purchase Order",
    categoryId: CAT_PO_CREATION,
    inputs: ["Vendor", "Item"],
    outputs: ["Purchase Order"],
    steps: [],
  },
  {
    id: "sc_asn_create",
    name: "Create ASN",
    categoryId: CAT_ASN_CREATION,
    inputs: ["Purchase Order"],
    outputs: ["ASN"],
    steps: [],
  },
  {
    id: "sc_yard_checkin",
    name: "Yard Check-In",
    categoryId: CAT_YARD_MGMT,
    inputs: ["ASN"],
    outputs: ["Yard Location", "Trailer"],
    steps: [],
  },
  {
    id: "sc_recv_pallets",
    name: "Receive Pallets",
    categoryId: CAT_RECEIVING,
    inputs: ["Purchase Order", "ASN"],
    outputs: ["LPN"],
    steps: [],
  },
  {
    id: "sc_recv_cases",
    name: "Receive Cases",
    categoryId: CAT_RECEIVING,
    inputs: ["Purchase Order", "ASN"],
    outputs: ["LPN"],
    steps: [],
  },
  {
    id: "sc_putaway_pallets",
    name: "Putaway Pallets",
    categoryId: CAT_PUTAWAY,
    inputs: ["LPN"],
    outputs: ["Located Inventory"],
    steps: [],
  },
  {
    id: "sc_putaway_cases",
    name: "Putaway Cases",
    categoryId: CAT_PUTAWAY,
    inputs: ["LPN"],
    outputs: ["Located Inventory"],
    steps: [],
  },
  {
    id: "sc_cycle_count",
    name: "Cycle Count",
    categoryId: CAT_CYCLE_COUNT,
    inputs: ["Location", "Located Inventory"],
    outputs: ["Verified Inventory"],
    steps: [],
  },
  {
    id: "sc_order_create",
    name: "Create Order",
    categoryId: CAT_ORDER_CREATION,
    inputs: ["Item", "Located Inventory"],
    outputs: ["Order"],
    steps: [],
  },
  {
    id: "sc_wave_plan",
    name: "Plan Wave",
    categoryId: CAT_WAVE_PLANNING,
    inputs: ["Order"],
    outputs: ["Wave", "Pick Task"],
    steps: [],
  },
  {
    id: "sc_pick_discrete",
    name: "Discrete Picking",
    categoryId: CAT_PICKING,
    inputs: ["Pick Task", "Located Inventory"],
    outputs: ["Picked Inventory"],
    steps: [],
  },
  {
    id: "sc_pick_batch",
    name: "Batch Picking",
    categoryId: CAT_PICKING,
    inputs: ["Pick Task", "Located Inventory"],
    outputs: ["Picked Inventory"],
    steps: [],
  },
  {
    id: "sc_packing",
    name: "Pack Order",
    categoryId: CAT_PACKING,
    inputs: ["Picked Inventory", "Order"],
    outputs: ["Packed Shipment"],
    steps: [],
  },
  {
    id: "sc_loading",
    name: "Load Trailer",
    categoryId: CAT_LOADING,
    inputs: ["Packed Shipment", "Trailer"],
    outputs: ["Loaded Trailer"],
    steps: [],
  },
  {
    id: "sc_shipment_close",
    name: "Close Shipment",
    categoryId: CAT_SHIPMENT_CLOSE,
    inputs: ["Loaded Trailer"],
    outputs: ["Closed Shipment"],
    steps: [],
  },
];

interface Actions {
  // Categories
  addCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  reorderCategories: (ids: string[]) => void;

  // Scenarios
  addScenario: (
    name: string,
    categoryId: string,
    inputs: string[],
    outputs: string[],
    steps?: string[]
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

  // Graph-based workflow actions
  addWorkflowNode: (workflowId: string, scenarioId: string) => string;
  removeWorkflowNode: (workflowId: string, nodeId: string) => void;
  addWorkflowEdge: (workflowId: string, from: string, to: string) => void;
  removeWorkflowEdge: (workflowId: string, from: string, to: string) => void;

  // Hydration
  _hydrated: boolean;
  hydrate: () => Promise<void>;

  // Helpers
  getAllKnownDataTypes: () => string[];
}

export const useStore = create<AppState & Actions>()(
  subscribeWithSelector(
    (set, get) => ({
      dataTypes: [],
      categories: SEED_CATEGORIES,
      scenarios: SEED_SCENARIOS,
      workflows: [],
      _hydrated: false,

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

      reorderCategories: (ids) => {
        const state = get();
        const map = new Map(state.categories.map((c) => [c.id, c]));
        set({ categories: ids.map((id) => map.get(id)!).filter(Boolean) });
      },

      addScenario: (name, categoryId, inputs, outputs, steps = []) => {
        const state = get();
        set({
          scenarios: [
            ...state.scenarios,
            { id: genId(), name, categoryId, inputs, outputs, steps },
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

      addWorkflowNode: (workflowId, scenarioId) => {
        const state = get();
        const nodeId = genId();
        set({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  nodes: [...(w.nodes ?? []), { id: nodeId, scenarioId }],
                }
              : w
          ),
        });
        return nodeId;
      },

      removeWorkflowNode: (workflowId, nodeId) => {
        const state = get();
        set({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  nodes: (w.nodes ?? []).filter((n) => n.id !== nodeId),
                  edges: (w.edges ?? []).filter(
                    (e) => e.from !== nodeId && e.to !== nodeId
                  ),
                }
              : w
          ),
        });
      },

      addWorkflowEdge: (workflowId, from, to) => {
        const state = get();
        set({
          workflows: state.workflows.map((w) => {
            if (w.id !== workflowId) return w;
            const edges = w.edges ?? [];
            if (edges.some((e) => e.from === from && e.to === to)) return w;
            return { ...w, edges: [...edges, { from, to }] };
          }),
        });
      },

      removeWorkflowEdge: (workflowId, from, to) => {
        const state = get();
        set({
          workflows: state.workflows.map((w) =>
            w.id === workflowId
              ? {
                  ...w,
                  edges: (w.edges ?? []).filter(
                    (e) => !(e.from === from && e.to === to)
                  ),
                }
              : w
          ),
        });
      },

      hydrate: async () => {
        const applyData = (data: Record<string, unknown>) => {
          if (data && Array.isArray(data.categories) && data.categories.length > 0) {
            set({
              dataTypes: (data.dataTypes as DataType[]) ?? [],
              categories: data.categories as Category[],
              scenarios: (data.scenarios as Scenario[]) ?? [],
              workflows: (data.workflows as Workflow[]) ?? [],
              _hydrated: true,
            });
            return true;
          }
          return false;
        };

        if (IS_PRODUCTION && typeof window !== "undefined") {
          // Production: try localStorage first
          try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
              const data = JSON.parse(raw);
              if (applyData(data)) return;
            }
          } catch {}
        }

        // Fall back to API (dev always uses this; prod uses it on first load)
        try {
          const res = await fetch("/api/state");
          const data = await res.json();
          if (applyData(data)) {
            // In production, seed localStorage from the API response
            if (IS_PRODUCTION && typeof window !== "undefined") {
              try {
                localStorage.setItem(LS_KEY, JSON.stringify(statePayload(get())));
              } catch {}
            }
            return;
          }
        } catch {}

        // No saved state anywhere — use seed defaults and persist them
        set({ _hydrated: true });
        saveState(get());
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
  ),
);

// ─── Persistence helpers ────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const LS_KEY = "cwv-concept-state";

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function statePayload(state: AppState) {
  return {
    dataTypes: state.dataTypes,
    categories: state.categories,
    scenarios: state.scenarios,
    workflows: state.workflows,
  };
}

function saveState(state: AppState) {
  if (IS_PRODUCTION) {
    // Production: persist to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(statePayload(state)));
      } catch {}
    }
  } else {
    // Development: persist via the API route (writes JSON file)
    fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statePayload(state), null, 2),
    }).catch(() => {});
  }
}

// Debounced auto-save: fires 300ms after last change
useStore.subscribe(
  (state) => ({
    dataTypes: state.dataTypes,
    categories: state.categories,
    scenarios: state.scenarios,
    workflows: state.workflows,
  }),
  (slice) => {
    const state = useStore.getState();
    if (!state._hydrated) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveState(slice), 300);
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
);
