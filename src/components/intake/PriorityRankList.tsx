"use client";

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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PRIORITY_LABELS } from "@/lib/intake/options";

function SortableRow({
  id,
  index,
  label,
}: {
  id: string;
  index: number;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm dark:border-gray-600 dark:bg-gray-800"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          index === 0 ? "bg-amber-500 dark:bg-amber-600" : "bg-teal-700 dark:bg-teal-600"
        }`}
      >
        {index + 1}
      </span>
      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
      <button
        type="button"
        className="touch-none text-gray-500 hover:text-teal-800 dark:text-gray-400 dark:hover:text-teal-300"
        {...attributes}
        {...listeners}
        aria-label="Glisser pour réordonner"
      >
        <GripVertical className="h-5 w-5" />
      </button>
    </div>
  );
}

type Props = {
  ids: string[];
  onChange: (next: string[]) => void;
  /** When set, overrides default French `PRIORITY_LABELS`. */
  getItemLabel?: (id: string) => string;
};

export function PriorityRankList({ ids, onChange, getItemLabel }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ids.map((id, index) => (
            <SortableRow
              key={id}
              id={id}
              index={index}
              label={getItemLabel?.(id) ?? PRIORITY_LABELS[id as keyof typeof PRIORITY_LABELS] ?? id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
