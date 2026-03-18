'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Task,
  Topic,
  TaskStatus,
  STATUS_COLUMNS,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from '@/lib/types';
import { relativeTime } from '@/lib/utils';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  tasks: Task[];
  topics: Topic[];
  onArchive?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onReorder?: (tasks: Task[]) => void;
}

// ─── CopyButton ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
        </svg>
      )}
    </button>
  );
}

// ─── ActionInstructionsPanel ─────────────────────────────────────────────────

function ActionInstructionsPanel({ instructions }: { instructions: string }) {
  const segments: { type: 'text' | 'code'; content: string }[] = [];
  const parts = instructions.split(/```/);

  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      const trimmed = part.trim();
      if (trimmed) {
        segments.push({ type: 'text', content: trimmed });
      }
    } else {
      const lines = part.split('\n');
      const code = (lines[0]?.match(/^\w+$/) ? lines.slice(1) : lines).join('\n').trim();
      if (code) {
        segments.push({ type: 'code', content: code });
      }
    }
  });

  return (
    <div className="mt-2 ml-[14px] rounded-lg border border-gray-700/60 bg-gray-900 overflow-hidden">
      <div className="p-3 space-y-2.5">
        {segments.map((seg, i) =>
          seg.type === 'text' ? (
            <p key={i} className="text-[11px] text-gray-400 leading-relaxed">
              {seg.content}
            </p>
          ) : (
            <div key={i} className="relative group/code">
              <pre className="bg-gray-950 rounded-md p-2.5 pr-9 text-[11px] font-mono text-gray-200 leading-relaxed overflow-x-auto border border-gray-800">
                <code>{seg.content}</code>
              </pre>
              <CopyButton text={seg.content} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── TaskCard (static, used for DragOverlay) ─────────────────────────────────

interface TaskCardProps {
  task: Task;
  topicMap: Map<number, Topic>;
  isExpanded: boolean;
  onToggleActions: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  isDragOverlay?: boolean;
}

function TaskCard({ task, topicMap, isExpanded, onToggleActions, onArchive, isDragOverlay }: TaskCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border bg-white dark:bg-gray-900/40 transition-colors group ${
        isDragOverlay
          ? 'border-violet-500/60 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/20 rotate-[2deg] scale-105'
          : 'border-gray-200 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700'
      }`}
    >
      {/* Priority + Title */}
      <div className="flex items-start gap-2 mb-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 ${PRIORITY_COLORS[task.priority]}`}
          title={task.priority.toUpperCase()}
        />
        <h4 className="text-[13px] font-medium leading-snug text-gray-900 dark:text-gray-100 flex-1">
          {task.title}
        </h4>
        {task.actionInstructions && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleActions(task.id); }}
            className={`shrink-0 p-1 rounded transition-colors ${
              isExpanded
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30 opacity-0 group-hover:opacity-100'
            }`}
            title="Action instructions"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        {onArchive && (
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
            className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-300 hover:bg-gray-700/30 opacity-0 group-hover:opacity-100 transition-all"
            title="Archive task"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0v10l-8 4m8-14l-8-4-8 4m0 0v10l8 4" />
            </svg>
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-500 dark:text-gray-500 line-clamp-2 mb-2 ml-[14px] leading-relaxed">
        {task.description}
      </p>

      {/* Timestamp */}
      <p className="text-[10px] text-gray-400 dark:text-gray-600 ml-[14px]">
        {relativeTime(task.updatedAt)}
      </p>

      {/* Telegram deep link for waiting tasks */}
      {task.status === 'waiting' && topicMap.get(task.topic)?.telegramUrl && (
        <a
          href={topicMap.get(task.topic)!.telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 ml-[14px] text-[11px] font-medium text-amber-500 hover:text-amber-400 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Reply in Telegram →
        </a>
      )}

      {/* Action Instructions Panel */}
      {task.actionInstructions && isExpanded && (
        <ActionInstructionsPanel instructions={task.actionInstructions} />
      )}
    </div>
  );
}

// ─── SortableTaskCard (wraps TaskCard with dnd-kit sortable) ─────────────────

interface SortableTaskCardProps {
  task: Task;
  topicMap: Map<number, Topic>;
  isExpanded: boolean;
  onToggleActions: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  isDragging?: boolean;
}

function SortableTaskCard({ task, topicMap, isExpanded, onToggleActions, onArchive }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card touch-none ${isDragging ? 'opacity-30 scale-[0.98]' : ''}`}
    >
      <TaskCard
        task={task}
        topicMap={topicMap}
        isExpanded={isExpanded}
        onToggleActions={onToggleActions}
        onArchive={onArchive}
      />
    </div>
  );
}

// ─── DroppableColumn ─────────────────────────────────────────────────────────

interface DroppableColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  topicMap: Map<number, Topic>;
  expandedActions: Set<string>;
  onToggleActions: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  isOver: boolean;
}

function DroppableColumn({
  status,
  label,
  tasks: columnTasks,
  topicMap,
  expandedActions,
  onToggleActions,
  onArchive,
  isOver,
}: DroppableColumnProps) {
  const { setNodeRef } = useSortable({
    id: `column-${status}`,
    data: { type: 'column', status },
    disabled: true,
  });

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${STATUS_COLORS[status]}`}>
          {label}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-600 tabular-nums">
          {columnTasks.length}
        </span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[100px] rounded-lg p-1 -m-1 transition-all duration-200 ${
          isOver
            ? 'bg-violet-500/5 ring-2 ring-violet-500/20 ring-inset'
            : ''
        }`}
      >
        <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {columnTasks.length === 0 && (
            <div className={`flex-1 flex items-center justify-center rounded-lg border border-dashed min-h-[72px] transition-colors duration-200 ${
              isOver
                ? 'border-violet-500/40 bg-violet-500/5'
                : 'border-gray-200 dark:border-gray-800'
            }`}>
              <span className={`text-[11px] transition-colors ${
                isOver ? 'text-violet-400' : 'text-gray-400 dark:text-gray-600'
              }`}>
                {isOver ? 'Drop here' : 'No tasks'}
              </span>
            </div>
          )}
          {columnTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              topicMap={topicMap}
              isExpanded={expandedActions.has(task.id)}
              onToggleActions={onToggleActions}
              onArchive={onArchive}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── KanbanBoard (main) ─────────────────────────────────────────────────────

const DEFAULT_EXPANDED_COLUMNS: TaskStatus[] = ['in-progress', 'waiting'];

export default function KanbanBoard({ tasks, topics, onArchive, onStatusChange, onReorder }: Props) {
  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics]);
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<TaskStatus>>(() => {
    const collapsed = new Set<TaskStatus>();
    for (const col of STATUS_COLUMNS) {
      if (!DEFAULT_EXPANDED_COLUMNS.includes(col.key)) {
        collapsed.add(col.key);
      }
    }
    return collapsed;
  });

  const toggleColumn = useCallback((status: TaskStatus) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleActions = useCallback((taskId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // Sort tasks by priority within each column
  const sortedTasksByColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    const priorityOrder = { p1: 0, p2: 1, p3: 2 };

    for (const col of STATUS_COLUMNS) {
      const colTasks = tasks
        .filter(t => t.status === col.key)
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      map.set(col.key, colTasks);
    }
    return map;
  }, [tasks]);

  // Sensors — activate after 5px movement to allow clicks on buttons
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Find which column a task or column-id belongs to
  const findColumnForId = useCallback(
    (id: string): TaskStatus | null => {
      // Check if it's a column ID
      if (id.startsWith('column-')) {
        return id.replace('column-', '') as TaskStatus;
      }
      // Find which column contains this task
      const entries = Array.from(sortedTasksByColumn.entries());
      for (let i = 0; i < entries.length; i++) {
        const [status, colTasks] = entries[i];
        if (colTasks.some(t => t.id === id)) return status;
      }
      return null;
    },
    [sortedTasksByColumn]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const task = tasks.find(t => t.id === active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverColumnId(null);
        return;
      }
      const col = findColumnForId(String(over.id));
      setOverColumnId(col ? `column-${col}` : null);
    },
    [findColumnForId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverColumnId(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const sourceColumn = findColumnForId(activeId);
      const destColumn = findColumnForId(overId);

      if (!sourceColumn || !destColumn) return;

      if (sourceColumn !== destColumn) {
        // Moved to a different column — change status
        onStatusChange?.(activeId, destColumn);
      } else {
        // Same column — reorder
        const colTasks = sortedTasksByColumn.get(sourceColumn);
        if (!colTasks) return;

        const oldIndex = colTasks.findIndex(t => t.id === activeId);
        const newIndex = colTasks.findIndex(t => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(colTasks, oldIndex, newIndex);
          // Build full reordered task list
          const allTasks: Task[] = [];
          for (const col of STATUS_COLUMNS) {
            if (col.key === sourceColumn) {
              allTasks.push(...reordered);
            } else {
              allTasks.push(...(sortedTasksByColumn.get(col.key) || []));
            }
          }
          onReorder?.(allTasks);
        }
      }
    },
    [findColumnForId, onStatusChange, onReorder, sortedTasksByColumn]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
    >
      {/* Desktop: grid layout */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATUS_COLUMNS.map((col) => (
          <DroppableColumn
            key={col.key}
            status={col.key}
            label={col.label}
            tasks={sortedTasksByColumn.get(col.key) || []}
            topicMap={topicMap}
            expandedActions={expandedActions}
            onToggleActions={toggleActions}
            onArchive={onArchive}
            isOver={overColumnId === `column-${col.key}`}
          />
        ))}
      </div>

      {/* Mobile: accordion layout */}
      <div className="md:hidden space-y-2">
        {STATUS_COLUMNS.map((col) => {
          const colTasks = sortedTasksByColumn.get(col.key) || [];
          const isCollapsed = collapsedColumns.has(col.key);
          return (
            <div key={col.key} className="rounded-lg border border-gray-200 dark:border-gray-800/80 overflow-hidden">
              <button
                onClick={() => toggleColumn(col.key)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${STATUS_COLORS[col.key]}`}>
                    {col.label}
                  </span>
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-600 tabular-nums">
                  {colTasks.length}
                </span>
              </button>
              {!isCollapsed && (
                <div className="p-2 space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-800 min-h-[48px]">
                      <span className="text-[11px] text-gray-400 dark:text-gray-600">No tasks</span>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        topicMap={topicMap}
                        isExpanded={expandedActions.has(task.id)}
                        onToggleActions={toggleActions}
                        onArchive={onArchive}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Drag Overlay — renders above everything, follows cursor */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
          <div className="w-[220px]">
            <TaskCard
              task={activeTask}
              topicMap={topicMap}
              isExpanded={false}
              onToggleActions={() => {}}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
