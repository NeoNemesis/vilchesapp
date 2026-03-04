import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PhotoIcon, CameraIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import type { QuoteImage } from '../../types';

interface QuoteImageUploadProps {
  quoteId: string;
}

export default function QuoteImageUpload({ quoteId }: QuoteImageUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Hämta befintliga bilder
  const { data: existingImages, isLoading } = useQuery({
    queryKey: ['quote-images', quoteId],
    queryFn: () => api.getQuoteImages(quoteId),
  });

  const images: QuoteImage[] = existingImages?.data || [];

  // Ladda upp bilder
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => api.uploadQuoteImages(quoteId, files),
    onSuccess: () => {
      setPendingFiles([]);
      setPreviews(prev => {
        prev.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
      queryClient.invalidateQueries({ queryKey: ['quote-images', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      toast.success('Bilder uppladdade');
    },
    onError: () => {
      toast.error('Kunde inte ladda upp bilder');
    }
  });

  // Ta bort bild
  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteQuoteImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-images', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      toast.success('Bild borttagen');
    },
    onError: () => {
      toast.error('Kunde inte ta bort bild');
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const total = pendingFiles.length + images.length + acceptedFiles.length;
    if (total > 10) {
      toast.error('Max 10 bilder per offert');
      return;
    }
    setPendingFiles(prev => [...prev, ...acceptedFiles]);
    const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [pendingFiles, images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024,
  });

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    const total = pendingFiles.length + images.length + fileArray.length;
    if (total > 10) {
      toast.error('Max 10 bilder per offert');
      return;
    }
    setPendingFiles(prev => [...prev, ...fileArray]);
    const newPreviews = fileArray.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removePending = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (pendingFiles.length === 0) return;
    uploadMutation.mutate(pendingFiles);
  };

  const getImageUrl = (image: QuoteImage) => {
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    return `${baseUrl}${image.url}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <PhotoIcon className="h-5 w-5 text-gray-500" />
        Bilder ({images.length + pendingFiles.length}/10)
      </h3>

      {/* Befintliga bilder */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {images.map((image) => (
            <div key={image.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={getImageUrl(image)}
                alt={image.originalName}
                className="w-full h-28 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button
                  onClick={() => deleteMutation.mutate(image.id)}
                  disabled={deleteMutation.isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-white text-xs truncate">{image.originalName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Väntande bilder (ej uppladdade ännu) */}
      {previews.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            {previews.map((preview, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border-2 border-dashed border-blue-300 bg-blue-50">
                <img
                  src={preview}
                  alt={pendingFiles[index]?.name}
                  className="w-full h-28 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => removePending(index)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 px-2 py-1">
                  <p className="text-white text-xs truncate">{pendingFiles[index]?.name}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {uploadMutation.isPending
              ? `Laddar upp ${pendingFiles.length} bild(er)...`
              : `Ladda upp ${pendingFiles.length} bild(er)`}
          </button>
        </>
      )}

      {/* Dropzone + kamera */}
      {images.length + pendingFiles.length < 10 && (
        <div className="flex gap-2">
          <div
            {...getRootProps()}
            className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <PhotoIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">
              {isDragActive ? 'Slpp bilderna hr' : 'Dra bilder hit eller klicka'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            <CameraIcon className="h-6 w-6 text-gray-400" />
            <span className="text-xs text-gray-500 mt-1">Kamera</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />
        </div>
      )}

      {isLoading && (
        <p className="text-xs text-gray-400 text-center py-2">Laddar bilder...</p>
      )}
    </div>
  );
}
