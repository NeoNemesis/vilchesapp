import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

type MaterialCategory =
  | 'KAKEL_KLINKER'
  | 'VVS_PORSLIN'
  | 'VVS_DELAR'
  | 'EL_ARMATURER'
  | 'EL_MATERIAL'
  | 'BYGG_MATERIAL'
  | 'FARG_FINISH'
  | 'GOLVVARME'
  | 'KOK_LUCKOR'
  | 'KOK_BENKSKIVA'
  | 'VITVAROR'
  | 'TRADGARD'
  | 'VERKTYG'
  | 'OVRIGT';

interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  keywords: string[];
  unit: string;
  currentPrice: number;
  supplier?: string;
  supplierArticleNumber?: string;
  supplierUrl?: string;
  typicalUsagePerSqm?: number;
  typicalUsageNote?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  KAKEL_KLINKER: 'Kakel & Klinker',
  VVS_PORSLIN: 'VVS Porslin',
  VVS_DELAR: 'VVS Delar',
  EL_ARMATURER: 'El Armaturer',
  EL_MATERIAL: 'El Material',
  BYGG_MATERIAL: 'Byggmaterial',
  FARG_FINISH: 'Färg & Finish',
  GOLVVARME: 'Golvvärme',
  KOK_LUCKOR: 'Kök Luckor',
  KOK_BENKSKIVA: 'Kök Bänkskiva',
  VITVAROR: 'Vitvaror',
  TRADGARD: 'Trädgård',
  VERKTYG: 'Verktyg',
  OVRIGT: 'Övrigt',
};

const MaterialModal: React.FC<{
  material?: Material;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Material>) => void;
}> = ({ material, isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: material?.name || '',
    category: material?.category || 'BYGG_MATERIAL' as MaterialCategory,
    keywords: material?.keywords?.join(', ') || '',
    unit: material?.unit || 'st',
    currentPrice: material?.currentPrice || 0,
    supplier: material?.supplier || '',
    supplierArticleNumber: material?.supplierArticleNumber || '',
    supplierUrl: material?.supplierUrl || '',
    typicalUsagePerSqm: material?.typicalUsagePerSqm || undefined,
    typicalUsageNote: material?.typicalUsageNote || '',
    isActive: material?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Konvertera keywords från sträng till array
    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    onSubmit({
      ...formData,
      keywords,
      typicalUsagePerSqm: formData.typicalUsagePerSqm || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center sm:p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl sm:rounded-t-xl sticky top-0">
            <h3 className="text-lg font-semibold text-white">
              {material ? 'Redigera Material' : 'Nytt Material'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Grundläggande info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Grundläggande information</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Namn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Kakel Hornbach Premium Grå 60x60"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as MaterialCategory })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enhet *
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="st">Styck (st)</option>
                    <option value="kvm">Kvadratmeter (kvm)</option>
                    <option value="m">Meter (m)</option>
                    <option value="liter">Liter (L)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="förp">Förpackning (förp)</option>
                    <option value="rulle">Rulle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pris (kr) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="450.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nyckelord (separera med komma)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="kakel, hornbach, grå, 60x60, premium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Används för smart sökning i offerter
                </p>
              </div>
            </div>

            {/* Leverantör */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-gray-900">Leverantör (valfritt)</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leverantör
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Hornbach, Bauhaus, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Artikelnummer
                  </label>
                  <input
                    type="text"
                    value={formData.supplierArticleNumber}
                    onChange={(e) => setFormData({ ...formData, supplierArticleNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="ABC123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Länk (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.supplierUrl}
                    onChange={(e) => setFormData({ ...formData, supplierUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Användning */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-gray-900">Typisk användning (valfritt)</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Användning per kvm
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.typicalUsagePerSqm || ''}
                  onChange={(e) => setFormData({ ...formData, typicalUsagePerSqm: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="1.15"
                />
                <p className="text-xs text-gray-500 mt-1">
                  T.ex. 1.15 = 15% spill vid kakelläggning
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Användningsnotering
                </label>
                <textarea
                  value={formData.typicalUsageNote}
                  onChange={(e) => setFormData({ ...formData, typicalUsageNote: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={2}
                  placeholder="Inkluderar 15% spill, 10% extra för mönster"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center border-t pt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Aktivt material (visas i offerter)
              </label>
            </div>

            {/* Knappar */}
            <div className="flex gap-3 justify-end border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                {material ? 'Uppdatera' : 'Skapa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Materials: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  // Hämta alla material
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const response = await api.get(`/quotes/materials/list?${params}`);
      return response.data as Material[];
    },
  });

  // Skapa material
  const createMutation = useMutation({
    mutationFn: (data: Partial<Material>) => api.post('/quotes/materials/create', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material skapat!');
      setShowModal(false);
    },
    onError: () => {
      toast.error('Kunde inte skapa material');
    },
  });

  // Uppdatera material
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Material> }) =>
      api.put(`/quotes/materials/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material uppdaterat!');
      setShowModal(false);
      setEditingMaterial(undefined);
    },
    onError: () => {
      toast.error('Kunde inte uppdatera material');
    },
  });

  // Ta bort material
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quotes/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material borttaget!');
    },
    onError: () => {
      toast.error('Kunde inte ta bort material');
    },
  });

  const handleSubmit = (data: Partial<Material>) => {
    if (editingMaterial) {
      updateMutation.mutate({ id: editingMaterial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort detta material?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewMaterial = () => {
    setEditingMaterial(undefined);
    setShowModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto py-0 sm:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Materialbibliotek</h1>
            <p className="mt-2 text-sm text-gray-600">
              Hantera återanvändbara material för offerter
            </p>
          </div>
          <button
            onClick={handleNewMaterial}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Nytt Material</span>
            <span className="sm:hidden">Nytt</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kategori-filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as MaterialCategory | 'ALL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Alla kategorier</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Sök */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sök
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök på namn eller nyckelord..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Material Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laddar material...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Inga material</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Inga material matchar dina filter'
              : 'Kom igång genom att lägga till ditt första material'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">{material.name}</h3>
                  </div>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded">
                    {CATEGORY_LABELS[material.category]}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(material)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pris:</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    {material.currentPrice.toFixed(2)} kr/{material.unit}
                  </span>
                </div>

                {material.supplier && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Leverantör:</span>
                    <span className="text-gray-900">{material.supplier}</span>
                  </div>
                )}

                {material.typicalUsagePerSqm && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Användning:</span>
                    <span className="text-gray-900">{material.typicalUsagePerSqm}/kvm</span>
                  </div>
                )}

                {material.keywords.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {material.keywords.slice(0, 3).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          <TagIcon className="h-3 w-3" />
                          {keyword}
                        </span>
                      ))}
                      {material.keywords.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{material.keywords.length - 3} till
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!material.isActive && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-red-600 font-medium">Inaktivt</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">
            Totalt <span className="font-semibold text-indigo-900">{materials.length}</span> material
            {selectedCategory !== 'ALL' && ` i ${CATEGORY_LABELS[selectedCategory]}`}
          </span>
        </div>
      </div>

      {/* Modal */}
      <MaterialModal
        material={editingMaterial}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMaterial(undefined);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Materials;
