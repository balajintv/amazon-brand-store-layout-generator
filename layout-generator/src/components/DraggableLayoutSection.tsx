import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Settings } from 'lucide-react';
import { LayoutSection, ViewMode } from '../types';
import { moduleService } from '../services/moduleService';

interface DraggableLayoutSectionProps {
  section: LayoutSection;
  viewMode: ViewMode;
  onRemove: () => void;
  onDuplicate: () => void;
}

const DraggableLayoutSection: React.FC<DraggableLayoutSectionProps> = ({
  section,
  viewMode,
  onRemove,
  onDuplicate
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imageUrl = moduleService.getImageUrl(section.module.cropped_files.medium);
  const { width, height } = section.module.cropped_files.dimensions.original;

  const formatType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getImageStyle = () => {
    const baseStyle = "w-full object-cover rounded";

    // Adjust height based on view mode and aspect ratio
    const aspectRatio = width / height;

    if (viewMode === 'mobile') {
      if (aspectRatio > 2) return `${baseStyle} h-24`; // Wide sections shorter on mobile
      if (aspectRatio < 0.8) return `${baseStyle} h-64`; // Tall sections
      return `${baseStyle} h-32`; // Standard sections
    }


    // Desktop
    if (aspectRatio > 2) return `${baseStyle} h-40`;
    if (aspectRatio < 0.8) return `${baseStyle} h-96`;
    return `${baseStyle} h-64`;
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg"
      >
        <div className="h-32 flex items-center justify-center text-gray-400">
          Moving {formatType(section.module.type)}...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-white border border-gray-200 hover:border-amazon-orange transition-colors"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Drag Handle & Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-black bg-opacity-10 flex items-start justify-between p-2 z-10">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center gap-1 bg-white bg-opacity-90 rounded px-2 py-1 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} className="text-gray-600" />
            <span className="text-xs font-medium text-gray-700">
              {formatType(section.module.type)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 bg-white bg-opacity-90 rounded hover:bg-opacity-100 transition-colors"
              title="Settings"
            >
              <Settings size={14} className="text-gray-600" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-1 bg-white bg-opacity-90 rounded hover:bg-opacity-100 transition-colors"
              title="Duplicate"
            >
              <Copy size={14} className="text-green-600" />
            </button>
            <button
              onClick={onRemove}
              className="p-1 bg-white bg-opacity-90 rounded hover:bg-opacity-100 transition-colors"
              title="Remove"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          </div>
        </div>
      )}

      {/* Section Image */}
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={section.module.name}
          className={getImageStyle()}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNjY2MiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiLz48L3N2Zz4=';
          }}
        />

        {/* Section Info Overlay (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
          <div className="text-white">
            <h3 className="text-sm font-medium">{formatType(section.module.type)}</h3>
            <p className="text-xs opacity-75">
              {width}×{height} • {section.module.source_file.replace('Screenshot ', '').replace('.png', '').substring(0, 30)}...
            </p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg rounded-b-lg p-3 z-20">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Section Settings</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width</label>
              <select className="w-full text-xs border border-gray-300 rounded px-2 py-1">
                <option value="auto">Auto</option>
                <option value="full">Full Width</option>
                <option value="container">Container</option>
                <option value="narrow">Narrow</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Spacing</label>
              <select className="w-full text-xs border border-gray-300 rounded px-2 py-1">
                <option value="normal">Normal</option>
                <option value="tight">Tight</option>
                <option value="loose">Loose</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 text-xs py-1 px-2 bg-amazon-orange text-white rounded hover:bg-opacity-80"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableLayoutSection;