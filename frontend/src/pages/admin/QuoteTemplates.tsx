import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { ProjectMainCategory } from '../../types';

const CATEGORY_LABELS: Record<ProjectMainCategory, string> = {
  MALNING_TAPETSERING: 'Måleri & Tapetsering',
  SNICKERIARBETEN: 'Snickeriarbeten',
  TOTALRENOVERING: 'Totalrenovering',
  MOBELMONTERING: 'Möbelmontering',
  VATRUM: 'Våtrum/Badrum',
  KOK: 'Kök',
  FASADMALNING: 'Fasadmålning',
  ALTAN_TRADACK: 'Altan & Trädäck',
  GARDEROB: 'Garderob',
  TAPETSERING: 'Tapetsering',
  TAK: 'Tak',
  MALNING: 'Målning',
  SNICKERI: 'Snickeri',
  EL: 'El',
  VVS: 'VVS',
  MURNING: 'Murning',
  KOMBINERAT: 'Kombinerat projekt',
};

interface QuoteTemplate {
  id: string;
  name: string;
  description?: string;
  mainCategory: ProjectMainCategory;
  timesUsed: number;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  includeVat?: boolean;
  vatRate?: number;
}

const QuoteTemplates: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<ProjectMainCategory | 'ALL'>('ALL');

  // Hämta alla mallar
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['quote-templates', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') {
        params.append('mainCategory', selectedCategory);
      }
      const response = await api.get(`/quotes/templates/list?${params}`);
      return response.data as QuoteTemplate[];
    },
  });

  // Ta bort mall
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast.success('Mall borttagen!');
    },
    onError: () => {
      toast.error('Kunde inte ta bort mall');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Är du säker på att du vill ta bort mallen "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    // Navigera till ny offert med template-parameter
    navigate(`/admin/quotes/new?template=${templateId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Offertmallar</h1>
            <p className="mt-1 sm:mt-2 text-sm text-gray-600">
              Snabbskapa offerter från färdiga mallar
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/quotes/new')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Skapa från ny offert
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategori
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as ProjectMainCategory | 'ALL')}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">Alla kategorier</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laddar mallar...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <DocumentDuplicateIcon className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Inga mallar</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedCategory !== 'ALL'
              ? 'Inga mallar för denna kategori'
              : 'Skapa en offert och spara som mall'}
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/admin/quotes/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <PlusIcon className="h-5 w-5" />
              Skapa första mallen
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentDuplicateIcon className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                      {CATEGORY_LABELS[template.mainCategory]}
                    </span>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      template.includeVat
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.includeVat ? 'Inkl. moms' : 'Exkl. moms'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(template.id, template.name)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Description */}
              {template.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <SparklesIcon className="h-4 w-4" />
                  <span>Använd {template.timesUsed} gånger</span>
                </div>
                {template.lastUsedAt && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{new Date(template.lastUsedAt).toLocaleDateString('sv-SE')}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleUseTemplate(template.id)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Använd mall
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <DocumentDuplicateIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Hur fungerar offertmallar?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Skapa en offert med vanliga arbeten och material</li>
              <li>• Spara som mall genom att bocka i "Spara som mall" när du sparar offerten</li>
              <li>• Nästa gång behöver du bara välja mallen och justera värden!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      {templates.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              Totalt <span className="font-semibold text-indigo-900">{templates.length}</span> mallar
              {selectedCategory !== 'ALL' && ` i ${CATEGORY_LABELS[selectedCategory]}`}
            </span>
            <span className="text-gray-600">
              Totalt{' '}
              <span className="font-semibold text-indigo-900">
                {templates.reduce((sum, t) => sum + t.timesUsed, 0)}
              </span>{' '}
              användningar
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteTemplates;
