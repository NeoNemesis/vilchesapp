import React, { useState } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Project, Contractor } from '../types';

interface ProjectModalProps {
  project?: Project;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  contractors: Contractor[];
  isSubmitting?: boolean;
  onDeleteImage?: (imageId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, isOpen, onClose, onSubmit, contractors, isSubmitting = false, onDeleteImage }) => {
  console.log('ProjectModal rendered, isOpen:', isOpen, 'project:', project?.title);

  const [formData, setFormData] = useState({
    title: project?.title || '',
    description: project?.description || '',
    clientName: project?.clientName || '',
    clientEmail: project?.clientEmail || '',
    clientPhone: project?.clientPhone || '',
    address: project?.address || '',
    priority: project?.priority || 'NORMAL',
    estimatedHours: project?.estimatedHours || '',
    deadline: project?.deadline ? project.deadline.split('T')[0] : '',
    estimatedCost: project?.estimatedCost || '',
    assignedToId: project?.assignedToId || '',
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Uppdatera formData när project ändras
  React.useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || '',
        description: project.description || '',
        clientName: project.clientName || '',
        clientEmail: project.clientEmail || '',
        clientPhone: project.clientPhone || '',
        address: project.address || '',
        priority: project.priority || 'NORMAL',
        estimatedHours: project.estimatedHours || '',
        estimatedCost: project.estimatedCost || '',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        assignedToId: project.assignedToId || '',
      });
    } else {
      // Reset för nytt projekt
      setFormData({
        title: '',
        description: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        address: '',
        priority: 'NORMAL',
        estimatedHours: '',
        estimatedCost: '',
        deadline: '',
        assignedToId: '',
      });
    }
  }, [project]);

  // Reset bilder när modalen öppnas/stängs
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedImages([]);
      setImagePreviews([]);
    }
  }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Begränsa till max 5 bilder
    const maxImages = 5;
    const totalImages = selectedImages.length + files.length;

    if (totalImages > maxImages) {
      toast.error(`Du kan bara ladda upp max ${maxImages} bilder`);
      return;
    }

    // Kontrollera filstorlek (max 5MB per bild)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      toast.error('Vissa bilder är för stora. Max storlek är 5MB per bild.');
      return;
    }

    // Lägg till nya bilder
    setSelectedImages(prev => [...prev, ...files]);

    // Skapa previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours.toString()) : undefined,
      estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost.toString()) : undefined,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      assignedToId: formData.assignedToId || undefined,
      images: selectedImages, // Lägg till bilder
    };

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <h3 className="text-lg font-semibold text-white">
              {project ? 'Redigera Projekt' : 'Nytt Projekt'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projekttitel *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="t.ex. Badrumsrenovering Vasastan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beskrivning *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Beskriv vad som ska göras..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kundens namn *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Förnamn Efternamn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-post *
                </label>
                <input
                  type="email"
                  required
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="kund@exempel.se"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="070-123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adress *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Gatuadress, Stad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioritet
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Låg</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Hög</option>
                  <option value="URGENT">Brådskande</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (SEK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="t.ex. 25000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tilldela till
                </label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Välj entreprenör --</option>
                  {contractors.filter(c => c.isActive).map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} {contractor.company ? `(${contractor.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bilduppladdning */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bilder (valfritt)
              </label>

              <div className="space-y-4">
                {/* Befintliga bilder (om projektet har bilder) */}
                {project && project.images && project.images.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Befintliga bilder</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {project.images.map((image: any) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.base64Data ? `data:${image.mimeType};base64,${image.base64Data}` : `/api/projects/image/${image.filename}`}
                            alt={image.originalName}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          {onDeleteImage && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Är du säker på att du vill radera denna bild?')) {
                                  onDeleteImage(image.id);
                                }
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload knapp */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klicka för att ladda upp</span> eller dra och släpp
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG (max 5MB, max 5 bilder)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </label>
                </div>

                {/* Nya bilder previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg transition-all ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:to-blue-800'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {project ? 'Uppdaterar...' : 'Skapar...'}
                  </span>
                ) : (
                  project ? 'Uppdatera' : 'Skapa Projekt'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
