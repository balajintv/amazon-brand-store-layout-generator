import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import { moduleService } from '../services/moduleService';
import { ModuleSection } from '../types';
import ModuleCard from './ModuleCard';

interface ModuleLibraryProps {
  onModuleSelect: (module: ModuleSection) => void;
  selectedTypes?: string[];
}

const ModuleLibrary: React.FC<ModuleLibraryProps> = ({ onModuleSelect, selectedTypes = [] }) => {
  const [modules, setModules] = useState<ModuleSection[]>([]);
  const [filteredModules, setFilteredModules] = useState<ModuleSection[]>([]);
  const [sectionTypes, setSectionTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterModules();
  }, [modules, searchQuery, selectedType, selectedTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      const catalog = await moduleService.loadCatalog();
      const types = await moduleService.getSectionTypes();

      setModules(catalog.modules);
      setSectionTypes(types);
      setError(null);
    } catch (err) {
      setError('Failed to load module catalog');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterModules = () => {
    let filtered = [...modules];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(module =>
        module.type.toLowerCase().includes(query) ||
        module.name.toLowerCase().includes(query) ||
        module.source_file.toLowerCase().includes(query)
      );
    }

    // Filter by selected type
    if (selectedType !== 'all') {
      filtered = filtered.filter(module => module.type === selectedType);
    }

    // Filter by external selected types
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(module => selectedTypes.includes(module.type));
    }

    setFilteredModules(filtered);
  };

  const getTypeCount = (type: string): number => {
    return modules.filter(module => module.type === type).length;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-orange"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-amazon-orange text-white rounded hover:bg-opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-amazon-blue">Module Library</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-amazon-orange text-white' : 'bg-gray-100'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-amazon-orange text-white' : 'bg-gray-100'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
          >
            <option value="all">All Types ({modules.length})</option>
            {sectionTypes.map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ')} ({getTypeCount(type)})
              </option>
            ))}
          </select>

          {(searchQuery || selectedType !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-sm text-amazon-orange hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-600">
          Showing {filteredModules.length} of {modules.length} modules
        </p>
      </div>

      {/* Module Grid/List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredModules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No modules found</p>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }>
            {filteredModules.map((module) => (
              <ModuleCard
                key={module.unique_id}
                module={module}
                viewMode={viewMode}
                onClick={() => onModuleSelect(module)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleLibrary;