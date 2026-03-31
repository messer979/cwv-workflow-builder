"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AppState,
  Category,
  Scenario,
  DataType,
  Workflow,
  WorkflowStep,
} from "@/types";

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_STATE: AppState = {
  dataTypes: [],
  categories: [],
  scenarios: [],
  workflows: [],
};

export default function Home() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "scenarios" | "workflows">("data");
  const [saving, setSaving] = useState(false);

  // Load state on mount
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.dataTypes) setState(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Auto-save state whenever it changes (after initial load)
  const saveState = useCallback(
    async (s: AppState) => {
      setSaving(true);
      await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      }).catch(() => {});
      setSaving(false);
    },
    []
  );

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded, saveState]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">
          Warehouse Workflow Builder
        </h1>
        <span className="text-xs text-zinc-400">
          {saving ? "Saving..." : "Saved"}
        </span>
      </header>

      <nav className="flex border-b border-zinc-200 bg-white px-6">
        {(["data", "scenarios", "workflows"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab === "data"
              ? "Data Types"
              : tab === "scenarios"
              ? "Categories & Scenarios"
              : "Workflows"}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-auto bg-zinc-50 p-6">
        {activeTab === "data" && (
          <DataTypesPanel
            dataTypes={state.dataTypes}
            onChange={(dataTypes) => setState((s) => ({ ...s, dataTypes }))}
          />
        )}
        {activeTab === "scenarios" && (
          <ScenariosPanel
            state={state}
            onChange={(update) => setState((s) => ({ ...s, ...update }))}
          />
        )}
        {activeTab === "workflows" && (
          <WorkflowsPanel
            state={state}
            onChange={(workflows) => setState((s) => ({ ...s, workflows }))}
          />
        )}
      </main>
    </div>
  );
}

// ─── Data Types Panel ────────────────────────────────────────────────────────

function DataTypesPanel({
  dataTypes,
  onChange,
}: {
  dataTypes: DataType[];
  onChange: (dt: DataType[]) => void;
}) {
  const [name, setName] = useState("");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (dataTypes.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) return;
    const color = COLORS[dataTypes.length % COLORS.length];
    onChange([...dataTypes, { id: genId(), name: trimmed, color }]);
    setName("");
  };

  const remove = (id: string) => {
    onChange(dataTypes.filter((d) => d.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Data Types</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Define the types of data that flow between scenarios (e.g., Purchase Order, LPN, Located Inventory).
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="e.g. Purchase Order, LPN, Located Inventory..."
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={add}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>

        {dataTypes.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">
            No data types yet. Add some above to get started.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dataTypes.map((dt) => (
              <span
                key={dt.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: dt.color }}
              >
                {dt.name}
                <button
                  onClick={() => remove(dt.id)}
                  className="ml-1 hover:text-zinc-200 text-white/70"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scenarios Panel ─────────────────────────────────────────────────────────

function ScenariosPanel({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (update: Partial<AppState>) => void;
}) {
  const [catName, setCatName] = useState("");
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [newScenario, setNewScenario] = useState<{
    name: string;
    categoryId: string;
    inputs: string[];
    outputs: string[];
  } | null>(null);

  const addCategory = () => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    if (state.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    onChange({ categories: [...state.categories, { id: genId(), name: trimmed }] });
    setCatName("");
  };

  const removeCategory = (id: string) => {
    onChange({
      categories: state.categories.filter((c) => c.id !== id),
      scenarios: state.scenarios.filter((s) => s.categoryId !== id),
    });
  };

  const startNewScenario = (categoryId: string) => {
    setNewScenario({ name: "", categoryId, inputs: [], outputs: [] });
    setEditingScenario(null);
  };

  const saveNewScenario = () => {
    if (!newScenario || !newScenario.name.trim()) return;
    onChange({
      scenarios: [
        ...state.scenarios,
        {
          id: genId(),
          name: newScenario.name.trim(),
          categoryId: newScenario.categoryId,
          inputs: newScenario.inputs,
          outputs: newScenario.outputs,
        },
      ],
    });
    setNewScenario(null);
  };

  const removeScenario = (id: string) => {
    onChange({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      workflows: state.workflows.map((w) => ({
        ...w,
        steps: w.steps.filter((st) => st.scenarioId !== id),
      })),
    });
  };

  const updateScenario = (id: string, update: Partial<Scenario>) => {
    onChange({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, ...update } : s
      ),
    });
  };

  const getDataType = (id: string) =>
    state.dataTypes.find((d) => d.id === id);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Categories</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Group related scenarios. Scenarios in the same category are alternate
          flavors (e.g., Receive Cases vs Receive Pallets).
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="e.g. Receiving, Putaway, Cycle Counting..."
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addCategory}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Category
          </button>
        </div>

        {state.categories.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-4">
            No categories yet.{" "}
            {state.dataTypes.length === 0 && "Start by adding Data Types first."}
          </p>
        )}
      </div>

      {state.categories.map((cat) => {
        const catScenarios = state.scenarios.filter(
          (s) => s.categoryId === cat.id
        );
        return (
          <div
            key={cat.id}
            className="bg-white rounded-lg border border-zinc-200 p-6 mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-zinc-800">{cat.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => startNewScenario(cat.id)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  + Scenario
                </button>
                <button
                  onClick={() => removeCategory(cat.id)}
                  className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {catScenarios.length === 0 &&
              !(newScenario && newScenario.categoryId === cat.id) && (
                <p className="text-sm text-zinc-400 text-center py-4">
                  No scenarios in this category yet.
                </p>
              )}

            <div className="space-y-3">
              {catScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  dataTypes={state.dataTypes}
                  getDataType={getDataType}
                  isEditing={editingScenario === scenario.id}
                  onEdit={() =>
                    setEditingScenario(
                      editingScenario === scenario.id ? null : scenario.id
                    )
                  }
                  onUpdate={(u) => updateScenario(scenario.id, u)}
                  onRemove={() => removeScenario(scenario.id)}
                />
              ))}

              {newScenario && newScenario.categoryId === cat.id && (
                <div className="border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/50">
                  <input
                    type="text"
                    value={newScenario.name}
                    onChange={(e) =>
                      setNewScenario({ ...newScenario, name: e.target.value })
                    }
                    placeholder="Scenario name..."
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-600 mb-1 block">
                        Inputs
                      </label>
                      <MultiSelect
                        options={state.dataTypes}
                        selected={newScenario.inputs}
                        onChange={(inputs) =>
                          setNewScenario({ ...newScenario, inputs })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-600 mb-1 block">
                        Outputs
                      </label>
                      <MultiSelect
                        options={state.dataTypes}
                        selected={newScenario.outputs}
                        onChange={(outputs) =>
                          setNewScenario({ ...newScenario, outputs })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setNewScenario(null)}
                      className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNewScenario}
                      disabled={!newScenario.name.trim()}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      Save Scenario
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScenarioCard({
  scenario,
  dataTypes,
  getDataType,
  isEditing,
  onEdit,
  onUpdate,
  onRemove,
}: {
  scenario: Scenario;
  dataTypes: DataType[];
  getDataType: (id: string) => DataType | undefined;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (u: Partial<Scenario>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-zinc-800">{scenario.name}</h4>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <span className="text-xs font-medium text-zinc-500 block mb-1">
            Inputs
          </span>
          <div className="flex flex-wrap gap-1">
            {scenario.inputs.length === 0 ? (
              <span className="text-xs text-zinc-400">None</span>
            ) : (
              scenario.inputs.map((id) => {
                const dt = getDataType(id);
                return dt ? (
                  <DataTypeBadge key={id} dataType={dt} />
                ) : null;
              })
            )}
          </div>
        </div>
        <div className="text-zinc-300 flex items-center text-lg">
          &rarr;
        </div>
        <div className="flex-1">
          <span className="text-xs font-medium text-zinc-500 block mb-1">
            Outputs
          </span>
          <div className="flex flex-wrap gap-1">
            {scenario.outputs.length === 0 ? (
              <span className="text-xs text-zinc-400">None</span>
            ) : (
              scenario.outputs.map((id) => {
                const dt = getDataType(id);
                return dt ? (
                  <DataTypeBadge key={id} dataType={dt} />
                ) : null;
              })
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1 block">
              Inputs
            </label>
            <MultiSelect
              options={dataTypes}
              selected={scenario.inputs}
              onChange={(inputs) => onUpdate({ inputs })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1 block">
              Outputs
            </label>
            <MultiSelect
              options={dataTypes}
              selected={scenario.outputs}
              onChange={(outputs) => onUpdate({ outputs })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DataTypeBadge({ dataType }: { dataType: DataType }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: dataType.color }}
    >
      {dataType.name}
    </span>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: DataType[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {options.length === 0 ? (
        <span className="text-xs text-zinc-400">
          Add data types first
        </span>
      ) : (
        options.map((dt) => (
          <button
            key={dt.id}
            onClick={() => toggle(dt.id)}
            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: selected.includes(dt.id)
                ? dt.color
                : "transparent",
              color: selected.includes(dt.id) ? "white" : dt.color,
              border: `1.5px solid ${dt.color}`,
            }}
          >
            {dt.name}
          </button>
        ))
      )}
    </div>
  );
}

// ─── Workflows Panel ─────────────────────────────────────────────────────────

function WorkflowsPanel({
  state,
  onChange,
}: {
  state: AppState;
  onChange: (workflows: Workflow[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const getScenario = (id: string) =>
    state.scenarios.find((s) => s.id === id);
  const getCategory = (id: string) =>
    state.categories.find((c) => c.id === id);
  const getDataType = (id: string) =>
    state.dataTypes.find((d) => d.id === id);

  const createWorkflow = () => {
    const name = newName.trim() || "New Workflow";
    const wf: Workflow = { id: genId(), name, steps: [] };
    onChange([...state.workflows, wf]);
    setEditingId(wf.id);
    setNewName("");
  };

  const deleteWorkflow = async (id: string) => {
    onChange(state.workflows.filter((w) => w.id !== id));
    await fetch("/api/workflows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const updateWorkflow = (id: string, update: Partial<Workflow>) => {
    onChange(
      state.workflows.map((w) => (w.id === id ? { ...w, ...update } : w))
    );
  };

  const exportWorkflow = async (wf: Workflow) => {
    const enriched = {
      ...wf,
      steps: wf.steps.map((st) => {
        const sc = getScenario(st.scenarioId);
        const cat = sc ? getCategory(sc.categoryId) : null;
        return {
          ...st,
          scenarioName: sc?.name,
          categoryName: cat?.name,
          inputs: sc?.inputs.map((id) => getDataType(id)?.name).filter(Boolean),
          outputs: sc?.outputs.map((id) => getDataType(id)?.name).filter(Boolean),
        };
      }),
    };
    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched),
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Workflows</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Chain scenarios together. Each step&#39;s inputs must be satisfied by
          the outputs of previous steps (or be the first step&#39;s external inputs).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createWorkflow()}
            placeholder="Workflow name..."
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createWorkflow}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      </div>

      {state.workflows.map((wf) => (
        <WorkflowCard
          key={wf.id}
          workflow={wf}
          state={state}
          isEditing={editingId === wf.id}
          onToggleEdit={() =>
            setEditingId(editingId === wf.id ? null : wf.id)
          }
          onUpdate={(u) => updateWorkflow(wf.id, u)}
          onDelete={() => deleteWorkflow(wf.id)}
          onExport={() => exportWorkflow(wf)}
          getScenario={getScenario}
          getCategory={getCategory}
          getDataType={getDataType}
        />
      ))}

      {state.workflows.length === 0 && (
        <p className="text-sm text-zinc-400 text-center py-8">
          No workflows yet. Create one above.
        </p>
      )}
    </div>
  );
}

function WorkflowCard({
  workflow,
  state,
  isEditing,
  onToggleEdit,
  onUpdate,
  onDelete,
  onExport,
  getScenario,
  getCategory,
  getDataType,
}: {
  workflow: Workflow;
  state: AppState;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (u: Partial<Workflow>) => void;
  onDelete: () => void;
  onExport: () => void;
  getScenario: (id: string) => Scenario | undefined;
  getCategory: (id: string) => Category | undefined;
  getDataType: (id: string) => DataType | undefined;
}) {
  const [exportStatus, setExportStatus] = useState<string>("");

  // Compute available outputs at each step
  const getAvailableOutputsAt = (stepIndex: number): string[] => {
    const outputs: string[] = [];
    for (let i = 0; i < stepIndex; i++) {
      const sc = getScenario(workflow.steps[i].scenarioId);
      if (sc) outputs.push(...sc.outputs);
    }
    return outputs;
  };

  // Validate a candidate scenario at a given position
  const canAddScenarioAt = (
    scenarioId: string,
    position: number
  ): { valid: boolean; reason?: string } => {
    const scenario = getScenario(scenarioId);
    if (!scenario) return { valid: false, reason: "Scenario not found" };

    // Check: no two scenarios from the same category
    const existingCategoryIds = workflow.steps
      .map((st) => getScenario(st.scenarioId)?.categoryId)
      .filter(Boolean);
    if (existingCategoryIds.includes(scenario.categoryId)) {
      const cat = getCategory(scenario.categoryId);
      return {
        valid: false,
        reason: `Already has a scenario from "${cat?.name}" category`,
      };
    }

    // Check: if first step, any scenario is fine (it gets external inputs)
    if (position === 0 && workflow.steps.length === 0) {
      return { valid: true };
    }

    // Check: inputs must be satisfied by accumulated outputs of prior steps
    const availableOutputs = getAvailableOutputsAt(position);

    // For the first step, all inputs are considered "external" - no restriction
    if (position === 0) return { valid: true };

    const unsatisfied = scenario.inputs.filter(
      (inp) => !availableOutputs.includes(inp)
    );
    if (unsatisfied.length > 0) {
      const names = unsatisfied
        .map((id) => getDataType(id)?.name || "Unknown")
        .join(", ");
      return {
        valid: false,
        reason: `Missing required inputs: ${names}`,
      };
    }

    return { valid: true };
  };

  // Get all scenarios that can be validly added
  const getAddableScenarios = (): { scenario: Scenario; reason?: string }[] => {
    const position = workflow.steps.length;
    return state.scenarios.map((sc) => {
      const result = canAddScenarioAt(sc.id, position);
      return { scenario: sc, reason: result.valid ? undefined : result.reason };
    });
  };

  const addStep = (scenarioId: string) => {
    const newStep: WorkflowStep = {
      scenarioId,
      order: workflow.steps.length,
    };
    onUpdate({ steps: [...workflow.steps, newStep] });
  };

  const removeStep = (index: number) => {
    const newSteps = workflow.steps
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i }));
    onUpdate({ steps: newSteps });
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...workflow.steps];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newSteps.length) return;
    [newSteps[index], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[index]];
    const reordered = newSteps.map((s, i) => ({ ...s, order: i }));

    // Validate the new ordering
    const valid = validateWorkflow(reordered);
    if (!valid.valid) return; // Don't allow invalid reordering
    onUpdate({ steps: reordered });
  };

  const validateWorkflow = (
    steps: WorkflowStep[]
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const seenCategories = new Set<string>();
    const availableOutputs: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const sc = getScenario(steps[i].scenarioId);
      if (!sc) continue;

      if (seenCategories.has(sc.categoryId)) {
        const cat = getCategory(sc.categoryId);
        errors.push(
          `Step ${i + 1}: Duplicate category "${cat?.name}"`
        );
      }
      seenCategories.add(sc.categoryId);

      if (i > 0) {
        const unsatisfied = sc.inputs.filter(
          (inp) => !availableOutputs.includes(inp)
        );
        if (unsatisfied.length > 0) {
          const names = unsatisfied
            .map((id) => getDataType(id)?.name || "?")
            .join(", ");
          errors.push(
            `Step ${i + 1} ("${sc.name}"): Missing inputs: ${names}`
          );
        }
      }

      availableOutputs.push(...sc.outputs);
    }

    return { valid: errors.length === 0, errors };
  };

  const validation = validateWorkflow(workflow.steps);
  const addable = getAddableScenarios();

  const handleExport = async () => {
    if (!validation.valid) return;
    setExportStatus("Saving...");
    await onExport();
    setExportStatus("Saved!");
    setTimeout(() => setExportStatus(""), 2000);
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-md font-semibold text-zinc-800">
            {workflow.name}
          </h3>
          {!validation.valid && (
            <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
              Invalid
            </span>
          )}
          {validation.valid && workflow.steps.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
              Valid
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {exportStatus && (
            <span className="text-xs text-green-600">{exportStatus}</span>
          )}
          <button
            onClick={handleExport}
            disabled={!validation.valid || workflow.steps.length === 0}
            className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Save to Disk
          </button>
          <button
            onClick={onToggleEdit}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Validation errors */}
      {!validation.valid && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs font-medium text-red-700 mb-1">
            Validation Issues:
          </p>
          {validation.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Steps visualization */}
      {workflow.steps.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-4 mb-4">
          No steps yet. Add scenarios below.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {workflow.steps.map((step, idx) => {
            const sc = getScenario(step.scenarioId);
            const cat = sc ? getCategory(sc.categoryId) : null;
            if (!sc) return null;
            return (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && (
                  <span className="text-zinc-300 text-lg">&rarr;</span>
                )}
                <div className="border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 relative group">
                  <div className="text-xs text-zinc-500 mb-0.5">
                    {cat?.name}
                  </div>
                  <div className="text-sm font-medium text-zinc-800">
                    {sc.name}
                  </div>
                  <div className="flex gap-3 mt-1">
                    <div className="flex flex-wrap gap-0.5">
                      {sc.inputs.map((id) => {
                        const dt = getDataType(id);
                        return dt ? (
                          <span
                            key={id}
                            className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: dt.color }}
                          >
                            {dt.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <span className="text-zinc-300 text-xs">&rarr;</span>
                    <div className="flex flex-wrap gap-0.5">
                      {sc.outputs.map((id) => {
                        const dt = getDataType(id);
                        return dt ? (
                          <span
                            key={id}
                            className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: dt.color }}
                          >
                            {dt.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveStep(idx, "up")}
                        disabled={idx === 0}
                        className="w-5 h-5 bg-zinc-200 text-zinc-600 rounded text-xs hover:bg-zinc-300 disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      <button
                        onClick={() => moveStep(idx, "down")}
                        disabled={idx === workflow.steps.length - 1}
                        className="w-5 h-5 bg-zinc-200 text-zinc-600 rounded text-xs hover:bg-zinc-300 disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                      <button
                        onClick={() => removeStep(idx)}
                        className="w-5 h-5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                      >
                        x
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add scenario controls */}
      {isEditing && (
        <div className="border-t border-zinc-100 pt-4">
          <p className="text-xs font-medium text-zinc-600 mb-2">
            Add Scenario:
          </p>
          <div className="flex flex-wrap gap-2">
            {addable.map(({ scenario, reason }) => {
              const cat = getCategory(scenario.categoryId);
              return (
                <button
                  key={scenario.id}
                  onClick={() => !reason && addStep(scenario.id)}
                  disabled={!!reason}
                  title={reason || `Add "${scenario.name}" to workflow`}
                  className={`px-3 py-2 rounded-md text-xs border transition-colors ${
                    reason
                      ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                  }`}
                >
                  <span className="text-[10px] text-zinc-400 block">
                    {cat?.name}
                  </span>
                  {scenario.name}
                  {reason && (
                    <span className="block text-[10px] text-red-400 mt-0.5">
                      {reason}
                    </span>
                  )}
                </button>
              );
            })}
            {state.scenarios.length === 0 && (
              <span className="text-xs text-zinc-400">
                Create scenarios first in the Categories & Scenarios tab.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
