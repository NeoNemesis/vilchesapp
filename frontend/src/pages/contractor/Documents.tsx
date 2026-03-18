import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DocumentIcon, 
  ArrowDownTrayIcon, 
  EyeIcon,
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  FilmIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { Project } from '../../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
  projectId: string;
  project: {
    title: string;
    address: string;
  };
  category: 'drawing' | 'specification' | 'contract' | 'report' | 'image' | 'other';
}


const Documents: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['contractor-projects-for-docs'],
    queryFn: api.getMyProjects
  });

  // Extrahera alla bilder från projekt och rapporter
  const documents = useMemo(() => {
    if (!Array.isArray(projects)) return [];
    
    const allDocuments: Document[] = [];
    
    projects.forEach((project: any) => {
      // Projektbilder
      if (project.images && Array.isArray(project.images)) {
        project.images.forEach((image: any) => {
          allDocuments.push({
            id: image.id,
            filename: image.filename,
            originalName: image.originalName,
            mimeType: image.mimeType || 'image/jpeg',
            size: image.size || 0,
            url: image.url,
            uploadedAt: image.uploadedAt,
            projectId: project.id,
            project: {
              title: project.title,
              address: project.address
            },
            category: 'image'
          });
        });
      }
      
      // Rapportbilder
      if (project.reports && Array.isArray(project.reports)) {
        project.reports.forEach((report: any) => {
          if (report.images && Array.isArray(report.images)) {
            report.images.forEach((image: any) => {
              allDocuments.push({
                id: `report-${image.id}`,
                filename: image.filename,
                originalName: image.originalName,
                mimeType: image.mimeType || 'image/jpeg',
                size: image.size || 0,
                url: image.url,
                uploadedAt: image.uploadedAt,
                projectId: project.id,
                project: {
                  title: project.title,
                  address: project.address
                },
                category: 'report'
              });
            });
          }
        });
      }
    });
    
    return allDocuments;
  }, [projects]);

  const categories = [
    { value: 'all', label: 'Alla dokument', icon: DocumentIcon },
    { value: 'image', label: 'Projektbilder', icon: PhotoIcon },
    { value: 'report', label: 'Rapportbilder', icon: DocumentArrowDownIcon },
    { value: 'other', label: 'Övrigt', icon: FolderIcon }
  ];

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return PhotoIcon;
    if (mimeType.startsWith('video/')) return FilmIcon;
    if (mimeType.includes('pdf')) return DocumentIcon;
    return DocumentTextIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'drawing': return 'bg-blue-100 text-blue-800';
      case 'specification': return 'bg-green-100 text-green-800';
      case 'contract': return 'bg-purple-100 text-purple-800';
      case 'report': return 'bg-orange-100 text-orange-800';
      case 'image': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = Array.isArray(documents) ? documents.filter((doc: Document) => {
    if (!doc) return false;
    try {
      const matchesSearch = (doc.originalName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (doc.project?.title?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesProject = selectedProject === 'all' || doc.projectId === selectedProject;
      
      return matchesSearch && matchesCategory && matchesProject;
    } catch (error) {
      console.warn('Fel vid filtrering av dokument:', doc, error);
      return false;
    }
  }) : [];

  const handleDownload = async (doc: Document) => {
    try {
      // Använd direkt fetch för blob-nedladdning med cookies
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/documents/${doc.id}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handlePreview = (doc: Document) => {
    // Öppna dokument i ny flik för förhandsgranskning
    window.open(`/api/documents/${doc.id}/preview`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <DocumentIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dokumenthantering</h1>
              <p className="text-gray-600">Ritningar, specifikationer och projektdokument</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Sök dokument..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div className="relative">
            <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Alla projekt</option>
              {projects.map((project: Project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((document: Document) => {
          const FileIcon = getFileIcon(document.mimeType);
          
          return (
            <div key={document.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Document Preview */}
              <div className="h-32 bg-gray-100 flex items-center justify-center">
                {document.mimeType.startsWith('image/') ? (
                  <img
                    src={document.url}
                    alt={document.originalName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileIcon className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {/* Document Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate flex-1">
                    {document.originalName}
                  </h3>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(document.category)}`}>
                    {categories.find(c => c.value === document.category)?.label || 'Övrigt'}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div>Projekt: {document.project.title}</div>
                  <div>Storlek: {formatFileSize(document.size)}</div>
                  <div>
                    Uppladdad: {format(new Date(document.uploadedAt), 'd MMM yyyy', { locale: sv })}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handlePreview(document)}
                    className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Förhandsgranska
                  </button>
                  
                  <button
                    onClick={() => handleDownload(document)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    Ladda ner
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <DocumentIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Inga dokument hittades</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory !== 'all' || selectedProject !== 'all'
              ? 'Prova att ändra dina sökfilter för att hitta fler dokument.'
              : 'Det finns inga dokument tillgängliga för dina projekt än.'}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{Array.isArray(documents) ? documents.length : 0}</div>
            <div className="text-sm text-gray-600">Totalt dokument</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Array.isArray(documents) ? documents.filter((d: Document) => d.category === 'drawing').length : 0}
            </div>
            <div className="text-sm text-gray-600">Ritningar</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {Array.isArray(documents) ? documents.filter((d: Document) => d.category === 'specification').length : 0}
            </div>
            <div className="text-sm text-gray-600">Specifikationer</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {Array.isArray(documents) ? documents.filter((d: Document) => d.category === 'report').length : 0}
            </div>
            <div className="text-sm text-gray-600">Rapporter</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;
