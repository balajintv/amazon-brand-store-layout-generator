import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

interface DropZoneProps {
  onDrop: (module: any, position?: number) => void;
  isEmpty: boolean;
  className?: string;
  insertPosition?: number;
}

const DropZone: React.FC<DropZoneProps> = ({
  onDrop,
  isEmpty,
  className = '',
  insertPosition
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${insertPosition ?? 'empty'}`,
  });

  const getDropZoneClass = () => {
    const baseClass = className;

    if (isEmpty) {
      return `${baseClass} ${
        isOver
          ? 'border-amazon-orange bg-orange-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
      } border-2 border-dashed rounded-lg transition-colors`;
    }

    return `${baseClass} ${
      isOver
        ? 'border-amazon-orange bg-orange-50'
        : 'border-transparent hover:border-gray-300'
    } border-2 border-dashed rounded transition-colors`;
  };

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={getDropZoneClass()}
      >
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isOver ? 'bg-amazon-orange text-white' : 'bg-gray-200 text-gray-400'
          } transition-colors`}>
            <Plus size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Start Building Your Layout
          </h3>
          <p className="text-gray-500 max-w-md">
            Drag sections from the module library on the left to create your brand store layout.
            You can reorder sections by dragging them up or down.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={getDropZoneClass()}
    >
      {isOver ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-amazon-orange font-medium">
            <Plus size={16} />
            <span className="text-sm">Drop section here</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-gray-400">
            <Plus size={12} />
            <span className="text-xs">Add section</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;