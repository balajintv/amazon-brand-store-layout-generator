import React from 'react';
import { ModuleSection } from '../types';
import { moduleService } from '../services/moduleService';

interface ModuleCardProps {
  module: ModuleSection;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, viewMode, onClick }) => {
  const imageUrl = moduleService.getImageUrl(module.cropped_files.thumbnail);
  const { width, height } = module.cropped_files.dimensions.original;

  const formatType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDimensions = (w: number, h: number) => {
    return `${w}×${h}`;
  };

  const getAspectRatio = (w: number, h: number) => {
    const ratio = w / h;
    if (ratio > 2) return 'Wide';
    if (ratio < 0.5) return 'Tall';
    return 'Standard';
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="flex items-center p-3 border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-shadow bg-white"
      >
        <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={module.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNjY2MiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiLz48L3N2Zz4=';
            }}
          />
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {formatType(module.type)}
            </h3>
            <span className="text-xs text-gray-500 ml-2">
              {formatDimensions(width, height)}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-1">
            {module.source_file.replace('Screenshot ', '').replace('.png', '')}
          </p>
          <div className="flex items-center mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {getAspectRatio(width, height)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg cursor-pointer transition-shadow"
    >
      <div className="aspect-video bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={module.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNjY2MiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiLz48L3N2Zz4=';
          }}
        />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {formatType(module.type)}
          </h3>
          <span className="text-xs text-gray-500">
            {formatDimensions(width, height)}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mb-2">
          {module.source_file.replace('Screenshot ', '').replace('.png', '')}
        </p>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {getAspectRatio(width, height)}
          </span>
          <span className="text-xs text-gray-400">
            ID: {module.unique_id.split('_')[1]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModuleCard;