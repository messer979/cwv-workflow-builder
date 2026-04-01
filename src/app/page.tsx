"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import type { Scenario } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ─── Color assignment for data type badges ───────────────────────────────────

const BADGE_COLORS = [
  "#1d4ed8", "#b91c1c", "#047857", "#92400e", "#6d28d9",
  "#be185d", "#0e7490", "#c2410c", "#0f766e", "#4338ca",
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
  const hydrated = useStore((s) => s._hydrated);
  const hydrate = useStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Warehouse Workflow Builder</h1>
        <DataTypesDrawer />
      </header>

      <div className="px-6 py-6 space-y-8">
        <CategoriesAndScenarios />
        <WorkflowsSection />
      </div>
    </div>
  );
}

// ─── Data Types Drawer ───────────────────────────────────────────────────────

function DataTypesDrawer() {
  const allKnown = useStore((s) => s.getAllKnownDataTypes)();
  const scenarios = useStore((s) => s.scenarios);
  const renameDataType = useStore((s) => s.renameDataType);
  const deleteDataType = useStore((s) => s.deleteDataType);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (name: string) => {
    setEditingName(name);
    setEditValue(name);
  };

  const commitEdit = () => {
    if (editingName && editValue.trim() && editValue.trim() !== editingName) {
      renameDataType(editingName, editValue.trim());
    }
    setEditingName(null);
    setEditValue("");
  };

  // Count usage for each data type
  const usageCount = (name: string) => {
    let count = 0;
    for (const s of scenarios) {
      if (s.inputs.includes(name)) count++;
      if (s.outputs.includes(name)) count++;
    }
    return count;
  };

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="sm" className="h-7 text-xs" />}
      >
        Data Types ({allKnown.length})
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Data Types</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-3">
            These are derived from scenario inputs/outputs. Renaming or deleting here propagates to all scenarios.
          </p>
          {allKnown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data types yet. Add inputs/outputs to scenarios.
            </p>
          ) : (
            <div className="space-y-1">
              {allKnown.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorFor(name) }}
                  />
                  {editingName === name ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") { setEditingName(null); setEditValue(""); }
                      }}
                      onBlur={commitEdit}
                      className="h-6 text-xs flex-1"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-sm flex-1 cursor-pointer"
                      onClick={() => startEdit(name)}
                    >
                      {name}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {usageCount(name)} use{usageCount(name) !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingName !== name && (
                      <button
                        onClick={() => startEdit(name)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Rename
                      </button>
                    )}
                    <button
                      onClick={() => deleteDataType(name)}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Categories & Scenarios ──────────────────────────────────────────────────

function CategoriesAndScenarios() {
  const { categories, addCategory, reorderCategories } = useStore();
  const [catName, setCatName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAdd = () => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setCatName("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const ids = categories.map((c) => c.id);
    ids.splice(oldIndex, 1);
    ids.splice(newIndex, 0, active.id as string);
    reorderCategories(ids);
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold">Categories & Scenarios</h2>
        <div className="flex gap-2 flex-1">
          <Input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New category..."
            className="max-w-[200px] h-7 text-xs"
          />
          <Button onClick={handleAdd} size="sm" className="h-7 text-xs">
            Add
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No categories yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <SortableCategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortableCategoryCard({ category }: { category: { id: string; name: string } }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <CategoryCard category={category} dragListeners={listeners} />
    </div>
  );
}

function CategoryCard({
  category,
  dragListeners,
}: {
  category: { id: string; name: string };
  dragListeners?: Record<string, unknown>;
}) {
  const { scenarios, removeCategory } = useStore();
  const [adding, setAdding] = useState(false);
  const catScenarios = scenarios.filter((s) => s.categoryId === category.id);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-1.5">
          <span
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...dragListeners}
          >
            &#x2630;
          </span>
          {category.name}
        </CardTitle>
        <CardAction>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px]"
              onClick={() => setAdding(true)}
            >
              +
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-destructive"
              onClick={() => removeCategory(category.id)}
            >
              x
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {catScenarios.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-1">
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
      </CardContent>
    </Card>
  );
}

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const { removeScenario, updateScenario } = useStore();
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-md border p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        {editing ? (
          <Input
            value={scenario.name}
            onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
            className="h-6 text-xs font-medium w-auto flex-1 mr-2"
          />
        ) : (
          <span className="text-xs font-medium">{scenario.name}</span>
        )}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setEditing(!editing)}
            className="text-[10px] text-primary hover:underline"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            onClick={() => removeScenario(scenario.id)}
            className="text-[10px] text-destructive hover:underline"
          >
            x
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap gap-0.5 flex-1 min-w-0">
          {scenario.inputs.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">No inputs</span>
          ) : (
            scenario.inputs.map((name) => (
              <DataBadge key={name} name={name} />
            ))
          )}
        </div>
        <span className="text-muted-foreground text-base shrink-0">&rarr;</span>
        <div className="flex flex-wrap gap-0.5 flex-1 min-w-0">
          {scenario.outputs.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">No outputs</span>
          ) : (
            scenario.outputs.map((name) => (
              <DataBadge key={name} name={name} />
            ))
          )}
        </div>
      </div>

      {editing && (
        <div className="pt-1.5 border-t space-y-1.5">
          <div>
            <label className="text-[10px] text-muted-foreground">Inputs</label>
            <TagInput
              values={scenario.inputs}
              onChange={(inputs) => updateScenario(scenario.id, { inputs })}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Outputs</label>
            <TagInput
              values={scenario.outputs}
              onChange={(outputs) => updateScenario(scenario.id, { outputs })}
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Steps</label>
            <StepsEditor
              steps={scenario.steps ?? []}
              onChange={(steps) => updateScenario(scenario.id, { steps })}
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
  const [steps, setSteps] = useState<string[]>([]);

  const save = () => {
    if (!name.trim()) return;
    addScenario(name.trim(), categoryId, inputs, outputs, steps);
    onDone();
  };

  return (
    <div className="rounded-md border border-dashed border-primary/40 p-2.5 bg-primary/5 space-y-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Scenario name..."
        className="h-7 text-xs"
        autoFocus
      />
      <div>
        <label className="text-[10px] text-muted-foreground">Inputs</label>
        <TagInput values={inputs} onChange={setInputs} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Outputs</label>
        <TagInput values={outputs} onChange={setOutputs} />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Steps</label>
        <StepsEditor steps={steps} onChange={setSteps} />
      </div>
      <div className="flex gap-1.5 justify-end">
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" className="h-6 text-[10px]" onClick={save} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

// ─── Data Badge ──────────────────────────────────────────────────────────────

function DataBadge({ name }: { name: string }) {
  return (
    <Badge
      variant="secondary"
      className="h-5 px-2 text-[11px] font-semibold text-white border-0"
      style={{ backgroundColor: colorFor(name) }}
    >
      {name}
    </Badge>
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
      <div className="flex flex-wrap gap-1 p-1 rounded-md border bg-background min-h-[28px] items-center">
        {values.map((v) => (
          <Badge
            key={v}
            className="h-5 px-2 text-[11px] font-semibold text-white gap-0.5 border-0"
            style={{ backgroundColor: colorFor(v) }}
          >
            {v}
            <button
              onClick={() => remove(v)}
              className="text-white/70 hover:text-white ml-0.5"
            >
              x
            </button>
          </Badge>
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
          placeholder={values.length === 0 ? "Type + Enter..." : ""}
          className="flex-1 min-w-[80px] px-1 text-[11px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => add(s)}
              className="w-full text-left px-2 py-1 text-[11px] hover:bg-accent transition-colors flex items-center gap-1.5"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
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

// ─── Steps Editor ────────────────────────────────────────────────────────────

function StepsEditor({
  steps,
  onChange,
}: {
  steps: string[];
  onChange: (steps: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onChange([...steps, trimmed]);
    setInput("");
  };

  const remove = (idx: number) => {
    onChange(steps.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: "up" | "down") => {
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;
    const next = [...steps];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {steps.length > 0 && (
        <ol className="space-y-0.5">
          {steps.map((step, idx) => (
            <li key={idx} className="flex items-center gap-1 group">
              <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                {idx + 1}.
              </span>
              <span className="text-[11px] flex-1">{step}</span>
              <div className="flex gap-px opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => move(idx, "up")}
                  disabled={idx === 0}
                  className="w-4 h-4 text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  &uarr;
                </button>
                <button
                  onClick={() => move(idx, "down")}
                  disabled={idx === steps.length - 1}
                  className="w-4 h-4 text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  &darr;
                </button>
                <button
                  onClick={() => remove(idx)}
                  className="w-4 h-4 text-[9px] text-destructive hover:text-destructive/80"
                >
                  x
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-1">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a step..."
          className="h-6 text-[11px] flex-1"
        />
        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={add} disabled={!input.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ─── Workflows Section ───────────────────────────────────────────────────────

import type { Workflow, WorkflowNode, WorkflowEdge } from "@/types";

function WorkflowsSection() {
  const { workflows, addWorkflow } = useStore();
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim() || "New Workflow";
    addWorkflow(name);
    setNewName("");
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold">Workflows</h2>
        <div className="flex gap-2 flex-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Workflow name..."
            className="max-w-[200px] h-7 text-xs"
          />
          <Button onClick={handleCreate} size="sm" className="h-7 text-xs">
            Create
          </Button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No workflows yet.
        </p>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Graph helpers ───────────────────────────────────────────────────────────

function buildLayers(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  getScenario: (id: string) => Scenario | undefined,
): WorkflowNode[][] {
  if (nodes.length === 0) return [];

  // Longest-path layering: each node goes in the layer after ALL its predecessors
  const depth = new Map<string, number>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const incoming = edges.filter((e) => e.to === id);
    if (incoming.length === 0) {
      depth.set(id, 0);
      return 0;
    }
    const d = Math.max(...incoming.map((e) => getDepth(e.from))) + 1;
    depth.set(id, d);
    return d;
  }

  for (const n of nodes) getDepth(n.id);

  const maxDepth = Math.max(...Array.from(depth.values()), 0);
  const layers: WorkflowNode[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    layers.push(nodes.filter((n) => depth.get(n.id) === d));
  }

  // Add orphans (nodes with no edges at all)
  const hasEdge = new Set([...edges.map((e) => e.from), ...edges.map((e) => e.to)]);
  const orphans = nodes.filter((n) => !hasEdge.has(n.id) && !depth.has(n.id));
  if (orphans.length > 0) layers.push(orphans);

  return layers;
}

function validateGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  getScenario: (id: string) => Scenario | undefined,
  getCategory: (id: string) => { id: string; name: string } | undefined,
): string[] {
  const errors: string[] = [];
  const seenCategories = new Map<string, string>(); // categoryId -> node name

  for (const node of nodes) {
    const sc = getScenario(node.scenarioId);
    if (!sc) continue;

    // Duplicate category check
    if (seenCategories.has(sc.categoryId)) {
      const cat = getCategory(sc.categoryId);
      errors.push(`Duplicate category "${cat?.name}": "${seenCategories.get(sc.categoryId)}" and "${sc.name}"`);
    }
    seenCategories.set(sc.categoryId, sc.name);

    // Input satisfaction: gather outputs from all predecessors
    const predecessorIds = edges.filter((e) => e.to === node.id).map((e) => e.from);
    if (predecessorIds.length === 0 && edges.some((e) => e.from === node.id || e.to === node.id)) {
      // Root node in a connected graph — external inputs are fine
      continue;
    }
    if (predecessorIds.length === 0) continue; // Isolated node

    const available = new Set<string>();
    const visited = new Set<string>();
    const queue = [...predecessorIds];
    while (queue.length > 0) {
      const pid = queue.shift()!;
      if (visited.has(pid)) continue;
      visited.add(pid);
      const psc = getScenario(nodes.find((n) => n.id === pid)?.scenarioId ?? "");
      if (psc) psc.outputs.forEach((o) => available.add(o));
      // Also traverse further ancestors
      edges.filter((e) => e.to === pid).forEach((e) => queue.push(e.from));
    }

    const missing = sc.inputs.filter((inp) => !available.has(inp));
    if (missing.length > 0) {
      errors.push(`"${sc.name}": Missing inputs from predecessors: ${missing.join(", ")}`);
    }
  }

  return errors;
}

function getAvailableOutputs(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  getScenario: (id: string) => Scenario | undefined,
): Set<string> {
  const all = new Set<string>();
  for (const n of nodes) {
    const sc = getScenario(n.scenarioId);
    if (sc) sc.outputs.forEach((o) => all.add(o));
  }
  return all;
}

// ─── Workflow Card ───────────────────────────────────────────────────────────

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const {
    scenarios,
    categories,
    removeWorkflow,
    addWorkflowNode,
    removeWorkflowNode,
    addWorkflowEdge,
    removeWorkflowEdge,
  } = useStore();
  const [editing, setEditing] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);

  const nodes = workflow.nodes ?? [];
  const edges = workflow.edges ?? [];

  const getScenario = (id: string) => scenarios.find((s) => s.id === id);
  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const errors = validateGraph(nodes, edges, getScenario, getCategory);
  const isValid = errors.length === 0;
  const layers = buildLayers(nodes, edges, getScenario);

  // Which scenarios can be added
  const usedCategoryIds = new Set(
    nodes.map((n) => getScenario(n.scenarioId)?.categoryId).filter(Boolean) as string[]
  );
  const available = getAvailableOutputs(nodes, edges, getScenario);

  const getAddable = () => {
    return scenarios.map((sc) => {
      if (usedCategoryIds.has(sc.categoryId)) {
        return { scenario: sc, reason: `Already has "${getCategory(sc.categoryId)?.name}"` };
      }
      if (nodes.length > 0) {
        const missing = sc.inputs.filter((inp) => !available.has(inp));
        // Allow adding if at least some inputs could be satisfied, or if it's a root
        const hasNoIncomingNeeds = sc.inputs.length === 0;
        if (missing.length > 0 && !hasNoIncomingNeeds) {
          return { scenario: sc, reason: `Missing: ${missing.join(", ")}` };
        }
      }
      return { scenario: sc, reason: undefined };
    });
  };

  const addable = getAddable();

  const handleAddNode = (scenarioId: string) => {
    const nodeId = addWorkflowNode(workflow.id, scenarioId);
    // Auto-connect: find nodes whose outputs satisfy this scenario's inputs
    const sc = getScenario(scenarioId);
    if (sc && nodes.length > 0) {
      for (const existing of nodes) {
        const esc = getScenario(existing.scenarioId);
        if (esc && sc.inputs.some((inp) => esc.outputs.includes(inp))) {
          addWorkflowEdge(workflow.id, existing.id, nodeId);
        }
      }
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (!editing) return;
    if (connectFrom === null) {
      setConnectFrom(nodeId);
    } else if (connectFrom === nodeId) {
      setConnectFrom(null);
    } else {
      // Check if edge already exists
      const exists = edges.some((e) => e.from === connectFrom && e.to === nodeId);
      if (exists) {
        removeWorkflowEdge(workflow.id, connectFrom, nodeId);
      } else {
        addWorkflowEdge(workflow.id, connectFrom, nodeId);
      }
      setConnectFrom(null);
    }
  };

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">{workflow.name}</CardTitle>
          {nodes.length > 0 && (
            <Badge variant={isValid ? "secondary" : "destructive"} className="h-4 text-[9px]">
              {isValid ? "Valid" : "Invalid"}
            </Badge>
          )}
        </div>
        <CardAction>
          <div className="flex gap-1">
            <Button
              variant={editing ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => { setEditing(!editing); setConnectFrom(null); }}
            >
              {editing ? "Done" : "Edit"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-destructive"
              onClick={() => removeWorkflow(workflow.id)}
            >
              x
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {errors.length > 0 && (
          <div className="mb-3 p-2 rounded-md bg-destructive/10 text-destructive text-[11px]">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        {nodes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No steps yet. Click Edit to add scenarios.
          </p>
        ) : (
          <GraphMap
            nodes={nodes}
            edges={edges}
            layers={layers}
            getScenario={getScenario}
            getCategory={getCategory}
            editing={editing}
            connectFrom={connectFrom}
            onNodeClick={handleNodeClick}
            onRemoveNode={(nodeId) => removeWorkflowNode(workflow.id, nodeId)}
          />
        )}

        {editing && connectFrom && (
          <div className="mb-2 p-2 rounded-md bg-primary/10 text-primary text-[11px]">
            Click another node to connect from &quot;{getScenario(nodes.find((n) => n.id === connectFrom)?.scenarioId ?? "")?.name}&quot;.
            <button onClick={() => setConnectFrom(null)} className="ml-2 underline">Cancel</button>
          </div>
        )}

        {editing && (
          <div className="border-t pt-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
              Add Scenario:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {addable.map(({ scenario, reason }) => {
                const cat = getCategory(scenario.categoryId);
                return (
                  <button
                    key={scenario.id}
                    onClick={() => !reason && handleAddNode(scenario.id)}
                    disabled={!!reason}
                    title={reason || `Add "${scenario.name}"`}
                    className={`px-2 py-1 rounded text-[10px] border text-left transition-colors ${
                      reason
                        ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                        : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground block">{cat?.name}</span>
                    {scenario.name}
                    {reason && (
                      <span className="block text-[9px] text-destructive mt-0.5">{reason}</span>
                    )}
                  </button>
                );
              })}
              {scenarios.length === 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Create scenarios first above.
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Graph Map Visualization ─────────────────────────────────────────────────

function GraphMap({
  nodes,
  edges,
  layers,
  getScenario,
  getCategory,
  editing,
  connectFrom,
  onNodeClick,
  onRemoveNode,
}: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  layers: WorkflowNode[][];
  getScenario: (id: string) => Scenario | undefined;
  getCategory: (id: string) => { id: string; name: string } | undefined;
  editing: boolean;
  connectFrom: string | null;
  onNodeClick: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
}) {
  // Compute positions for each node
  const NODE_W = 140;
  const NODE_H = 60;
  const GAP_X = 80;
  const GAP_Y = 20;

  const positions = new Map<string, { x: number; y: number }>();

  let x = 0;
  for (const layer of layers) {
    const totalH = layer.length * NODE_H + (layer.length - 1) * GAP_Y;
    let y = -totalH / 2;
    for (const node of layer) {
      positions.set(node.id, { x, y });
      y += NODE_H + GAP_Y;
    }
    x += NODE_W + GAP_X;
  }

  // Calculate SVG bounds
  const allPos = Array.from(positions.values());
  if (allPos.length === 0) return null;

  const PAD = 100;
  const minX = Math.min(...allPos.map((p) => p.x)) - PAD;
  const minY = Math.min(...allPos.map((p) => p.y)) - PAD;
  const maxX = Math.max(...allPos.map((p) => p.x)) + NODE_W + PAD;
  const maxY = Math.max(...allPos.map((p) => p.y)) + NODE_H + PAD;
  const svgW = maxX - minX;
  const svgH = maxY - minY;

  // Determine external inputs (root nodes' inputs) and final outputs (leaf nodes' outputs)
  const hasIncoming = new Set(edges.map((e) => e.to));
  const hasOutgoing = new Set(edges.map((e) => e.from));
  const rootNodes = nodes.filter((n) => !hasIncoming.has(n.id));
  const leafNodes = nodes.filter((n) => !hasOutgoing.has(n.id));

  return (
    <div className="mb-3 p-3 bg-muted/30 border rounded-lg overflow-hidden">
      <svg
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        className="w-full"
        style={{ minHeight: 120, maxHeight: 600 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const fromPos = positions.get(edge.from);
          const toPos = positions.get(edge.to);
          if (!fromPos || !toPos) return null;

          const x1 = fromPos.x + NODE_W;
          const y1 = fromPos.y + NODE_H / 2;
          const x2 = toPos.x;
          const y2 = toPos.y + NODE_H / 2;
          const cx1 = x1 + (x2 - x1) * 0.4;
          const cx2 = x2 - (x2 - x1) * 0.4;

          // Find data flowing on this edge
          const fromSc = getScenario(nodes.find((n) => n.id === edge.from)?.scenarioId ?? "");
          const toSc = getScenario(nodes.find((n) => n.id === edge.to)?.scenarioId ?? "");
          const dataFlow = fromSc && toSc
            ? fromSc.outputs.filter((o) => toSc.inputs.includes(o))
            : [];

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          return (
            <g key={i}>
              <path
                d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                fill="none"
                className="stroke-muted-foreground/30"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {dataFlow.map((name, di) => (
                <g key={name} transform={`translate(${midX}, ${midY + di * 16 - (dataFlow.length - 1) * 8})`}>
                  <rect
                    x={-name.length * 4.0 - 8}
                    y={-8}
                    width={name.length * 8.0 + 16}
                    height={16}
                    rx="8"
                    fill={colorFor(name)}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white text-[9px] font-semibold"
                    style={{ pointerEvents: "none" }}
                  >
                    {name}
                  </text>
                </g>
              ))}
            </g>
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="fill-muted-foreground/30" />
          </marker>
        </defs>

        {/* External inputs for root nodes */}
        {rootNodes.map((node) => {
          const pos = positions.get(node.id);
          const sc = getScenario(node.scenarioId);
          if (!pos || !sc || sc.inputs.length === 0) return null;
          return sc.inputs.map((name, i) => {
            const bx = pos.x - 50;
            const by = pos.y + NODE_H / 2 + (i - (sc.inputs.length - 1) / 2) * 18;
            return (
              <g key={`ext-${node.id}-${name}`}>
                <rect x={bx - name.length * 4.0 - 12} y={by - 9} width={name.length * 8.0 + 24} height={18} rx="4"
                  className="stroke-muted-foreground/30 fill-background" strokeWidth="1" strokeDasharray="3 2" />
                <text x={bx} y={by} textAnchor="middle" dominantBaseline="central"
                  className="fill-muted-foreground text-[9px]">{name}</text>
              </g>
            );
          });
        })}

        {/* Final outputs for leaf nodes */}
        {leafNodes.map((node) => {
          const pos = positions.get(node.id);
          const sc = getScenario(node.scenarioId);
          if (!pos || !sc || sc.outputs.length === 0) return null;
          return sc.outputs.map((name, i) => {
            const bx = pos.x + NODE_W + 50;
            const by = pos.y + NODE_H / 2 + (i - (sc.outputs.length - 1) / 2) * 18;
            return (
              <g key={`out-${node.id}-${name}`}>
                <line x1={pos.x + NODE_W} y1={pos.y + NODE_H / 2} x2={bx - name.length * 4.0 - 12} y2={by}
                  className="stroke-green-500/40" strokeWidth="1.5" />
                <rect x={bx - name.length * 4.0 - 12} y={by - 9} width={name.length * 8.0 + 24} height={18} rx="4"
                  className="fill-green-500/5" stroke="rgba(34,197,94,0.4)" strokeWidth="1" strokeDasharray="3 2" />
                <text x={bx} y={by} textAnchor="middle" dominantBaseline="central"
                  className="text-[9px]" fill="rgb(22,163,74)">{name}</text>
              </g>
            );
          });
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const sc = getScenario(node.scenarioId);
          const cat = sc ? getCategory(sc.categoryId) : null;
          if (!sc) return null;

          const isSelected = connectFrom === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => editing && onNodeClick(node.id)}
              className={editing ? "cursor-pointer" : ""}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx="8"
                className={`fill-background ${
                  isSelected
                    ? "stroke-primary stroke-[3]"
                    : "stroke-primary/40 stroke-2"
                }`}
              />
              <text x={NODE_W / 2} y={20} textAnchor="middle" className="fill-muted-foreground text-[9px] uppercase tracking-wider">
                {cat?.name}
              </text>
              <text x={NODE_W / 2} y={38} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {sc.name}
              </text>
              {editing && (
                <g
                  onClick={(e) => { e.stopPropagation(); onRemoveNode(node.id); }}
                  className="cursor-pointer"
                >
                  <circle cx={NODE_W - 4} cy={4} r={8} className="fill-destructive/10 hover:fill-destructive/20" />
                  <text x={NODE_W - 4} y={5} textAnchor="middle" dominantBaseline="central" className="fill-destructive text-[9px]">x</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
