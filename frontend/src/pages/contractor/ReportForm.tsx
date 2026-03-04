import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useBasePath } from '../../hooks/useBasePath';

const ReportForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');

  // Load project info + drafts
  useEffect(() => {
    if (!id) return;
    api.getProject(id).then(data => {
      const p = data.project || data;
      setProjectTitle(p.title || '');
    }).catch(() => {});

    api.getDrafts(id).then(data => {
      const drafts = data.drafts || [];
      if (drafts.length > 0) {
        const d = drafts[0];
        setTitle(d.title || '');
        setDescription(d.workDescription || '');
        setProgress(d.progressPercent || 0);
        setNotes(d.nextSteps || '');
        setCurrentDraftId(d.id);
      }
    }).catch(() => {});
  }, [id]);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 10));
    }
    e.target.value = '';
  };

  const buildFormData = (isDraft: boolean) => {
    const formData = new FormData();
    formData.append('reportData', JSON.stringify({
      title: title || 'Rapport',
      workDescription: description || '-',
      progressPercent: progress,
      nextSteps: notes,
      issues: '',
      materialsUsed: [],
      isDraft,
    }));
    images.forEach(img => formData.append('images', img));
    return formData;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const formData = buildFormData(true);
      if (currentDraftId) {
        await api.updateReport(id!, currentDraftId, formData, true);
      } else {
        const res = await api.submitReport(id!, formData, true);
        setCurrentDraftId(res.report?.id);
      }
      toast.success('Utkast sparat');
    } catch {
      toast.error('Kunde inte spara');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Beskriv vad du har gjort');
      return;
    }
    setSubmitting(true);
    try {
      const formData = buildFormData(false);
      if (currentDraftId) {
        await api.updateReport(id!, currentDraftId, formData, false);
      } else {
        await api.submitReport(id!, formData, false);
      }
      toast.success('Rapport skickad!');
      navigate(`${basePath}/projects/${id}`);
    } catch {
      toast.error('Kunde inte skicka rapport');
    } finally {
      setSubmitting(false);
    }
  };

  const progressSteps = [0, 25, 50, 75, 100];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeftIcon className="h-4 w-4" />
          Tillbaka
        </button>
        <h1 className="text-xl font-bold text-gray-900">Arbetsrapport</h1>
        {projectTitle && <p className="text-sm text-gray-500 mt-1">{projectTitle}</p>}
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Titel</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Vad handlar rapporten om?"
          />
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vad har du gjort? *</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Beskriv kort vad du utfört..."
          />
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Framsteg</label>
          <div className="flex gap-1.5">
            {progressSteps.map(step => (
              <button
                key={step}
                type="button"
                onClick={() => setProgress(step)}
                className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                  progress === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {step}%
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Anteckningar</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Nästa steg, problem, kommentarer..."
          />
        </div>

        {/* Photos */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Bilder</label>

          <div className="flex gap-3 mb-3">
            <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
              <CameraIcon className="h-5 w-5" />
              Ta foto
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
              <PhotoIcon className="h-5 w-5" />
              Välj bild
            </button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handleImageAdd} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="flex-1 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {savingDraft ? 'Sparar...' : 'Spara utkast'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || savingDraft}
            className="flex-1 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Skickar...' : 'Skicka rapport'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportForm;
