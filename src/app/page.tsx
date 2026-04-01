"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import type { Scenario } from "@/types";

// ─── Color assignment for data type badges ───────────────────────────────────

const BADGE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

const colorMap = new Map<string, string>();

function colorFor(name: string): string {
  const key = name.toLowerCase();
  if (!colorMap.has(key)) {
    colorMap.set(key, BADGE_COLORS[colorMap.size % BADGE_COLORS.length]);
  }
  return colorMap.get(key)!;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const store = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-6 py-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Warehouse Workflow Builder
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <CategoriesAndScenarios />
        <WorkflowsSection />
      </div>
    </div>
  );
}

// ─── Categories & Scenarios ──────────────────────────────────────────────────

function CategoriesAndScenarios() {
  const { categories, scenarios, addCategory, removeCategory } = useStore();
  const [catName, setCatName] = useState("");

  const handleAdd = () => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setCatName("");
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Categories & Scenarios
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Scenarios in the same category are alternate flavors &mdash; only one per category can exist in a workflow.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New category name..."
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Category
        </button>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6">
          No categories yet. Add one above to get started.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: { id: string; name: string } }) {
  const { scenarios, removeCategory } = useStore();
  const [adding, setAdding] = useState(false);
  const catScenarios = scenarios.filter((s) => s.categoryId === category.id);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
          {category.name}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setAdding(true)}
            className="px-2 py-1 text-[10px] font-medium bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            +
          </button>
          <button
            onClick={() => removeCategory(category.id)}
            className="px-2 py-1 text-[10px] font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            x
          </button>
        </div>
      </div>

      {catScenarios.length === 0 && !adding && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">
          No scenarios yet.
        </p>
      )}

      <div className="space-y-2">
        {catScenarios.map((sc) => (
          <ScenarioRow key={sc.id} scenario={sc} />
        ))}
        {adding && (
          <NewScenarioForm
            categoryId={category.id}
            onDone={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const { removeScenario, updateScenario } = useStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded p-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-medium text-xs text-zinc-800 dark:text-zinc-200">
          {scenario.name}
        </h4>
        <div className="flex gap-1.5">
          <button
            onClick={() => setEditing(!editing)}
            className="text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            onClick={() => removeScenario(scenario.id)}
            className="text-[10px] text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            x
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap gap-0.5 flex-1">
          {scenario.inputs.length === 0 ? (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">No inputs</span>
          ) : (
            scenario.inputs.map((name) => (
              <Badge key={name} name={name} />
            ))
          )}
        </div>
        <span className="text-zinc-300 dark:text-zinc-600 text-xs">&rarr;</span>
        <div className="flex flex-wrap gap-0.5 flex-1">
          {scenario.outputs.length === 0 ? (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">No outputs</span>
          ) : (
            scenario.outputs.map((name) => (
              <Badge key={name} name={name} />
            ))
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
          <div>
            <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5 block">
              Inputs
            </label>
            <TagInput
              values={scenario.inputs}
              onChange={(inputs) => updateScenario(scenario.id, { inputs })}
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5 block">
              Outputs
            </label>
            <TagInput
              values={scenario.outputs}
              onChange={(outputs) => updateScenario(scenario.id, { outputs })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NewScenarioForm({
  categoryId,
  onDone,
}: {
  categoryId: string;
  onDone: () => void;
}) {
  const { addScenario } = useStore();
  const [name, setName] = useState("");
  const [inputs, setInputs] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);

  const save = () => {
    if (!name.trim()) return;
    addScenario(name.trim(), categoryId, inputs, outputs);
    onDone();
  };

  return (
    <div className="border border-dashed border-blue-300 dark:border-blue-700 rounded p-2.5 bg-blue-50/50 dark:bg-blue-500/5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Scenario name..."
        className="w-full px-2 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded text-xs mb-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <div className="space-y-1.5 mb-2">
        <div>
          <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5 block">
            Inputs
          </label>
          <TagInput values={inputs} onChange={setInputs} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-0.5 block">
            Outputs
          </label>
          <TagInput values={outputs} onChange={setOutputs} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onDone}
          className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!name.trim()}
          className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          Save Scenario
        </button>
      </div>
    </div>
  );
}

// ─── Tag Input with autocomplete ─────────────────────────────────────────────

function TagInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const allKnown = useStore((s) => s.getAllKnownDataTypes)();
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = allKnown.filter(
    (dt) =>
      !values.includes(dt) &&
      dt.toLowerCase().includes(input.toLowerCase())
  );

  const add = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const remove = (val: string) => {
    onChange(values.filter((v) => v !== val));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && input === "" && values.length > 0) {
      remove(values[values.length - 1]);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex flex-wrap gap-1 p-1.5 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 min-h-[36px]">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: colorFor(v) }}
          >
            {v}
            <button
              onClick={() => remove(v)}
              className="text-white/70 hover:text-white"
            >
              x
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? "Type and press Enter..." : ""}
          className="flex-1 min-w-[100px] px-1 py-0.5 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg max-h-40 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => add(s)}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colorFor(s) }}
              />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

function Badge({ name }: { name: string }) {
  return (
    <span
      className="inline-block px-1.5 py-0 rounded-full text-[10px] font-medium text-white leading-4"
      style={{ backgroundColor: colorFor(name) }}
    >
      {name}
    </span>
  );
}

// ─── Workflows Section ───────────────────────────────────────────────────────

function WorkflowsSection() {
  const { workflows, scenarios, categories, addWorkflow } = useStore();
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim() || "New Workflow";
    addWorkflow(name);
    setNewName("");
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        Workflows
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Chain scenarios together. Each step&apos;s inputs must be satisfied by previous step outputs.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Workflow name..."
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
        >
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6">
          No workflows yet.
        </p>
      )}

      <div className="space-y-4">
        {workflows.map((wf) => (
          <WorkflowCard key={wf.id} workflow={wf} />
        ))}
      </div>
    </section>
  );
}

function WorkflowCard({ workflow }: { workflow: { id: string; name: string; steps: { scenarioId: string; order: number }[] } }) {
  const {
    scenarios,
    categories,
    removeWorkflow,
    addWorkflowStep,
    removeWorkflowStep,
    moveWorkflowStep,
  } = useStore();
  const [editing, setEditing] = useState(false);

  const getScenario = (id: string) => scenarios.find((s) => s.id === id);
  const getCategory = (id: string) => categories.find((c) => c.id === id);

  // Validate the workflow
  const validate = () => {
    const errors: string[] = [];
    const seenCategories = new Set<string>();
    const available = new Set<string>();

    for (let i = 0; i < workflow.steps.length; i++) {
      const sc = getScenario(workflow.steps[i].scenarioId);
      if (!sc) continue;

      if (seenCategories.has(sc.categoryId)) {
        const cat = getCategory(sc.categoryId);
        errors.push(`Step ${i + 1}: Duplicate category "${cat?.name}"`);
      }
      seenCategories.add(sc.categoryId);

      if (i > 0) {
        const missing = sc.inputs.filter((inp) => !available.has(inp));
        if (missing.length > 0) {
          errors.push(`Step ${i + 1} ("${sc.name}"): Missing inputs: ${missing.join(", ")}`);
        }
      }

      for (const o of sc.outputs) available.add(o);
    }

    return errors;
  };

  // Which scenarios can be added next
  const getAddable = () => {
    const usedCategoryIds = new Set(
      workflow.steps
        .map((st) => getScenario(st.scenarioId)?.categoryId)
        .filter(Boolean) as string[]
    );

    const available = new Set<string>();
    for (const st of workflow.steps) {
      const sc = getScenario(st.scenarioId);
      if (sc) for (const o of sc.outputs) available.add(o);
    }

    return scenarios.map((sc) => {
      if (usedCategoryIds.has(sc.categoryId)) {
        return { scenario: sc, reason: `Already has "${getCategory(sc.categoryId)?.name}" category` };
      }
      if (workflow.steps.length > 0) {
        const missing = sc.inputs.filter((inp) => !available.has(inp));
        if (missing.length > 0) {
          return { scenario: sc, reason: `Missing: ${missing.join(", ")}` };
        }
      }
      return { scenario: sc, reason: undefined };
    });
  };

  const errors = validate();
  const isValid = errors.length === 0;
  const addable = getAddable();

  const handleExport = async () => {
    const enriched = {
      ...workflow,
      steps: workflow.steps.map((st) => {
        const sc = getScenario(st.scenarioId);
        const cat = sc ? getCategory(sc.categoryId) : null;
        return {
          ...st,
          scenarioName: sc?.name,
          categoryName: cat?.name,
          inputs: sc?.inputs,
          outputs: sc?.outputs,
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
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
            {workflow.name}
          </h3>
          {workflow.steps.length > 0 && (
            isValid ? (
              <span className="text-[10px] px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full font-medium">
                Valid
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full font-medium">
                Invalid
              </span>
            )
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleExport}
            disabled={!isValid || workflow.steps.length === 0}
            className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Save to Disk
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            onClick={() => removeWorkflow(workflow.id)}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-md">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
          ))}
        </div>
      )}

      {workflow.steps.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-3">
          No steps yet. Click Edit to add scenarios.
        </p>
      ) : (
        <>
          {/* Process Map */}
          <ProcessMap steps={workflow.steps} getScenario={getScenario} getCategory={getCategory} />

          {/* Compact step list with edit controls */}
          {editing && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {workflow.steps.map((step, idx) => {
                const sc = getScenario(step.scenarioId);
                const cat = sc ? getCategory(sc.categoryId) : null;
                if (!sc) return null;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {idx > 0 && (
                      <span className="text-zinc-300 dark:text-zinc-600 text-lg">&rarr;</span>
                    )}
                    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 bg-zinc-50 dark:bg-zinc-800 relative group">
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {cat?.name}
                      </div>
                      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {sc.name}
                      </div>
                      <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveWorkflowStep(workflow.id, idx, "up")}
                          disabled={idx === 0}
                          className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded text-xs hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-30"
                        >
                          &larr;
                        </button>
                        <button
                          onClick={() => moveWorkflowStep(workflow.id, idx, "down")}
                          disabled={idx === workflow.steps.length - 1}
                          className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded text-xs hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-30"
                        >
                          &rarr;
                        </button>
                        <button
                          onClick={() => removeWorkflowStep(workflow.id, idx)}
                          className="w-5 h-5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-500/30"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            Add Scenario:
          </p>
          <div className="flex flex-wrap gap-2">
            {addable.map(({ scenario, reason }) => {
              const cat = getCategory(scenario.categoryId);
              return (
                <button
                  key={scenario.id}
                  onClick={() => !reason && addWorkflowStep(workflow.id, scenario.id)}
                  disabled={!!reason}
                  title={reason || `Add "${scenario.name}"`}
                  className={`px-3 py-2 rounded-md text-xs border transition-colors text-left ${
                    reason
                      ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                      : "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 cursor-pointer"
                  }`}
                >
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
                    {cat?.name}
                  </span>
                  {scenario.name}
                  {reason && (
                    <span className="block text-[10px] text-red-400 dark:text-red-500 mt-0.5">
                      {reason}
                    </span>
                  )}
                </button>
              );
            })}
            {scenarios.length === 0 && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Create scenarios first above.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Process Map Visualization ───────────────────────────────────────────────

function ProcessMap({
  steps,
  getScenario,
  getCategory,
}: {
  steps: { scenarioId: string; order: number }[];
  getScenario: (id: string) => Scenario | undefined;
  getCategory: (id: string) => { id: string; name: string } | undefined;
}) {
  const flow: {
    scenario: Scenario;
    category: { id: string; name: string } | undefined;
    externalInputs: string[];
    chainedInputs: string[];
    outputs: string[];
  }[] = [];

  const availableOutputs = new Set<string>();

  for (const step of steps) {
    const sc = getScenario(step.scenarioId);
    if (!sc) continue;
    const cat = getCategory(sc.categoryId);

    const externalInputs = sc.inputs.filter((inp) => !availableOutputs.has(inp));
    const chainedInputs = sc.inputs.filter((inp) => availableOutputs.has(inp));

    flow.push({
      scenario: sc,
      category: cat,
      externalInputs,
      chainedInputs,
      outputs: sc.outputs,
    });

    for (const o of sc.outputs) availableOutputs.add(o);
  }

  if (flow.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max">
        {flow.map((node, idx) => (
          <div key={idx} className="flex items-center">
            {/* External inputs */}
            {node.externalInputs.length > 0 && (
              <>
                <div className="flex flex-col items-center justify-center gap-1 px-3">
                  {node.externalInputs.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorFor(name) }}
                      />
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {name}
                      </span>
                    </div>
                  ))}
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-0.5">
                    External
                  </span>
                </div>
                <div className="flex items-center px-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="text-zinc-300 dark:text-zinc-600">
                    <path d="M5 12h14M14 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </>
            )}

            {/* Chained data arrow between steps */}
            {idx > 0 && (
              <div className="flex flex-col items-center justify-center px-1">
                <div className="flex flex-col items-center gap-0.5 mb-1">
                  {node.chainedInputs.map((name) => (
                    <span
                      key={name}
                      className="text-[9px] px-1.5 py-0.5 rounded-full text-white whitespace-nowrap"
                      style={{ backgroundColor: colorFor(name) }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <svg width="32" height="24" viewBox="0 0 32 24" className="text-zinc-300 dark:text-zinc-600">
                  <path d="M2 12h28M24 7l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}

            {/* Process box */}
            <div className="border-2 border-blue-400 dark:border-blue-500 rounded-lg px-5 py-3 bg-white dark:bg-zinc-900 min-w-[120px] text-center">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">
                {node.category?.name}
              </div>
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {node.scenario.name}
              </div>
            </div>

            {/* Final outputs at end of flow */}
            {idx === flow.length - 1 && node.outputs.length > 0 && (
              <>
                <div className="flex items-center px-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="text-zinc-300 dark:text-zinc-600">
                    <path d="M5 12h14M14 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 px-3">
                  {node.outputs.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-500/5"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorFor(name) }}
                      />
                      <span className="text-[11px] text-green-700 dark:text-green-400 whitespace-nowrap">
                        {name}
                      </span>
                    </div>
                  ))}
                  <span className="text-[9px] uppercase tracking-wider text-green-500 dark:text-green-500 mt-0.5">
                    Final Output
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
