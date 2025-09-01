import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { 
  PhotoIcon, 
  XMarkIcon, 
  PlusIcon, 
  DocumentIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';

const reportSchema = z.object({
  actionTaken: z.string().min(10, 'Minst 10 tecken krävs'),
  hoursWorked: z.number().min(0.5, 'Minst 0.5 timmar').max(24, 'Max 24 timmar'),
});

interface Material {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

const ReportForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [images, setImages] = useState<File[]>([]);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(reportSchema),
  });

  // Image dropzone
  const onDropImages = useCallback((acceptedFiles: File[]) => {
    setImages(prev => [...prev, ...acceptedFiles].slice(0, 10));
    toast.success(`${acceptedFiles.length} bild(er) tillagd(a)`);
  }, []);

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onDropImages,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 10,
  });

  // Invoice dropzone
  const onDropInvoice = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setInvoice(acceptedFiles[0]);
      toast.success('Faktura tillagd');
    }
  }, []);

  const { getRootProps: getInvoiceRootProps, getInputProps: getInvoiceInputProps } = useDropzone({
    onDrop: onDropInvoice,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
  });

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addMaterial = () => {
    setMaterials([
      ...materials,
      { id: Date.now().toString(), name: '', quantity: 1, price: 0 }
    ]);
  };

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('actionTaken', data.actionTaken);
      formData.append('hoursWorked', data.hoursWorked.toString());
      formData.append('materials', JSON.stringify(materials));
      
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      if (invoice) {
        formData.append('invoice', invoice);
      }
      
      await api.submitReport(id!, formData);
      
      toast.success('Rapport skickad!');
      navigate(`/entrepreneur/orders/${id}`);
    } catch (error) {
      toast.error('Kunde inte skicka rapport');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Skicka rapport</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Action Taken */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utfört arbete *
              </label>
              <textarea
                {...register('actionTaken')}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Beskriv vad som har gjorts..."
              />
              {errors.actionTaken && (
                <p className="mt-1 text-sm text-red-600">{String(errors.actionTaken?.message)}</p>
              )}
            </div>

            {/* Hours Worked */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arbetade timmar *
              </label>
              <input
                type="number"
                step="0.5"
                {...register('hoursWorked', { valueAsNumber: true })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.0"
              />
              {errors.hoursWorked && (
                <p className="mt-1 text-sm text-red-600">{String(errors.hoursWorked?.message)}</p>
              )}
            </div>

            {/* Materials */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Material
                </label>
                <button
                  type="button"
                  onClick={addMaterial}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Lägg till material
                </button>
              </div>
              
              {materials.length > 0 && (
                <div className="space-y-2">
                  {materials.map((material) => (
                    <div key={material.id} className="flex gap-2">
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Materialnamn"
                      />
                      <input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => updateMaterial(material.id, 'quantity', parseInt(e.target.value))}
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Antal"
                        min="1"
                      />
                      <input
                        type="number"
                        value={material.price}
                        onChange={(e) => updateMaterial(material.id, 'price', parseFloat(e.target.value))}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Pris"
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeMaterial(material.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bilder (max 10)
              </label>
              
              <div
                {...getImageRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isImageDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getImageInputProps()} />
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {isImageDragActive
                    ? 'Släpp bilderna här...'
                    : 'Dra och släpp bilder här, eller klicka för att välja'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG upp till 10MB
                </p>
              </div>

              {/* Image Preview */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Bild ${index + 1}`}
                        className="h-24 w-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Faktura (PDF)
              </label>
              
              {!invoice ? (
                <div
                  {...getInvoiceRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
                >
                  <input {...getInvoiceInputProps()} />
                  <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Klicka för att välja faktura
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Endast PDF-filer
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                  <div className="flex items-center">
                    <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invoice.name}</p>
                      <p className="text-xs text-gray-500">
                        {(invoice.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoice(null)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Skickar...' : 'Skicka rapport'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportForm; 