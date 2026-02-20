"use client";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DropAnimation,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface DraggableGridProps {
    items: string[];
    onOrderChange: (items: string[]) => void;
    renderItem: (id: string) => React.ReactNode;
    className?: string;
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: "0.5",
            },
        },
    }),
};

export function DraggableGrid({ items, onOrderChange, renderItem, className }: DraggableGridProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeKey = String(active.id);
        const overKey = over?.id !== undefined ? String(over.id) : null;

        if (overKey && activeKey !== overKey) {
            const oldIndex = items.indexOf(activeKey);
            const newIndex = items.indexOf(overKey);
            onOrderChange(arrayMove(items, oldIndex, newIndex));
        }

        setActiveId(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
                    {items.map((id) => (
                        <SortableItem key={id} id={id}>
                            {renderItem(id)}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
            <DragOverlay dropAnimation={dropAnimation}>
                {activeId ? (
                    <div className="opacity-80 scale-105">
                        {renderItem(activeId)}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn("touch-none", isDragging && "opacity-0")}
        >
            {children}
        </div>
    );
}
