"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Reorderable list: drag the handle (mouse or touch), use the keyboard on the handle
 * (Space, then arrows), or the up/down buttons.
 */
export function SortableList<T>({
  items,
  getId,
  onChange,
  render,
  label,
}: {
  items: T[]
  getId: (item: T, index: number) => string
  onChange: (next: T[]) => void
  render: (item: T, index: number) => ReactNode
  label: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(getId)
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    onChange(arrayMove(items, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))))
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    onChange(arrayMove(items, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="flex flex-col gap-2">
          {items.map((item, i) => (
            <Row key={ids[i]} id={ids[i]} index={i} count={items.length} onMove={move}>
              {render(item, i)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function Row({
  id,
  index,
  count,
  onMove,
  children,
}: {
  id: string
  index: number
  count: number
  onMove: (from: number, to: number) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-stretch gap-2", isDragging && "relative z-10 opacity-90")}
    >
      <div className="flex flex-none flex-col items-center gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder item ${index + 1}`}
          className="flex h-11 w-9 cursor-grab touch-none items-center justify-center rounded-[8px] text-dust hover:bg-lift hover:text-paper active:cursor-grabbing"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label="Move up"
          className="flex size-9 items-center justify-center rounded-[8px] text-dust hover:bg-lift hover:text-paper disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(index, index + 1)}
          disabled={index === count - 1}
          aria-label="Move down"
          className="flex size-9 items-center justify-center rounded-[8px] text-dust hover:bg-lift hover:text-paper disabled:opacity-30"
        >
          ↓
        </button>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}
