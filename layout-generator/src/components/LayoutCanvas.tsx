import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Download, Eye } from 'lucide-react';
import { LayoutSection, ModuleSection, ViewMode } from '../types';
import { moduleService } from '../services/moduleService';
import DraggableLayoutSection from './DraggableLayoutSection';
import DropZone from './DropZone';

interface LayoutCanvasProps {
  layout: LayoutSection[];
  onLayoutChange: (layout: LayoutSection[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onExport: () => void;
  onPreview: () => void;
}

const LayoutCanvas: React.FC<LayoutCanvasProps> = ({
  layout,
  onLayoutChange,
  viewMode,
  onViewModeChange,
  onExport,
  onPreview
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedModule, setDraggedModule] = useState<ModuleSection | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Find the module being dragged
    const section = layout.find(section => section.id === active.id);
    if (section) {
      setDraggedModule(section.module);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setDraggedModule(null);
      return;
    }

    // Handle reordering within the layout
    if (active.id !== over.id) {
      const oldIndex = layout.findIndex(section => section.id === active.id);
      const newIndex = layout.findIndex(section => section.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newLayout = arrayMove(layout, oldIndex, newIndex);
        // Update positions
        const updatedLayout = newLayout.map((section, index) => ({
          ...section,
          position: index
        }));
        onLayoutChange(updatedLayout);
      }
    }

    setActiveId(null);
    setDraggedModule(null);
  };

  const removeSection = (sectionId: string) => {
    const newLayout = layout
      .filter(section => section.id !== sectionId)
      .map((section, index) => ({
        ...section,
        position: index
      }));
    onLayoutChange(newLayout);
  };

  const duplicateSection = (sectionId: string) => {
    const section = layout.find(s => s.id === sectionId);
    if (!section) return;

    const newSection: LayoutSection = {
      ...section,
      id: `${section.module.unique_id}_${Date.now()}`,
      position: section.position + 1
    };

    const newLayout = [
      ...layout.slice(0, section.position + 1),
      newSection,
      ...layout.slice(section.position + 1)
    ].map((section, index) => ({
      ...section,
      position: index
    }));

    onLayoutChange(newLayout);
  };

  const getCanvasClass = () => {
    const baseClass = "bg-white rounded-lg shadow-sm border transition-all duration-300 mx-auto";

    switch (viewMode) {
      case 'mobile':
        return `${baseClass} w-80 min-h-screen`;
      case 'desktop':
      default:
        return `${baseClass} w-full min-h-screen`;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Canvas Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-amazon-blue">Layout Canvas</h2>
          <span className="text-sm text-gray-500">
            {layout.length} section{layout.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            {(['mobile', 'desktop'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-3 py-1 text-sm capitalize ${
                  viewMode === mode
                    ? 'bg-amazon-orange text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={onPreview}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Eye size={16} />
            Preview
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 bg-amazon-orange text-white rounded-lg hover:bg-opacity-80"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={getCanvasClass()}>
            {layout.length === 0 ? (
              <DropZone
                onDrop={() => {}}
                isEmpty={true}
                className="min-h-96 m-8"
              />
            ) : (
              <SortableContext
                items={layout.map(section => section.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0">
                  {layout.map((section, index) => (
                    <div key={section.id} className="relative group">
                      <DraggableLayoutSection
                        section={section}
                        viewMode={viewMode}
                        onRemove={() => removeSection(section.id)}
                        onDuplicate={() => duplicateSection(section.id)}
                      />

                      {/* Add section button between items */}
                      {index < layout.length - 1 && (
                        <div className="relative h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropZone
                            onDrop={() => {}}
                            isEmpty={false}
                            className="absolute inset-0 h-8 -my-2"
                            insertPosition={index + 1}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Drop zone at the end */}
                  <DropZone
                    onDrop={() => {}}
                    isEmpty={false}
                    className="h-16 m-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500"
                    insertPosition={layout.length}
                  />
                </div>
              </SortableContext>
            )}
          </div>

          <DragOverlay>
            {activeId && draggedModule ? (
              <div className="bg-white border-2 border-amazon-orange rounded-lg p-2 shadow-lg">
                <img
                  src={moduleService.getImageUrl(draggedModule.cropped_files.thumbnail)}
                  alt={draggedModule.name}
                  className="w-32 h-20 object-cover rounded"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default LayoutCanvas;