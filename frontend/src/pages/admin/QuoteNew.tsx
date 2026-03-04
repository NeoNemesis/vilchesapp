import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  UserIcon,
  PhotoIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import {
  ProjectMainCategory,
  ComplexityLevel,
  ConditionLevel,
  QuoteTemplate,
} from '../../types';
import {
  isRotEligible,
  getHourlyRate,
  ROT_PERCENTAGE,
  MAX_ROT_PER_PERSON,
  VAT_RATE,
  WORK_CATEGORY_OPTIONS,
  CATEGORY_LABELS as WORK_CATEGORY_LABELS,
  WORK_DESCRIPTIONS,
  WorkCategory,
  DEFAULT_UNITS,
  COMMON_UNITS,
} from '../../config/pricing';

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

const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  VERY_SIMPLE: 'Mycket enkelt',
  SIMPLE: 'Enkelt',
  MEDIUM: 'Medel',
  COMPLEX: 'Komplext',
  VERY_COMPLEX: 'Mycket komplext',
};

const CONDITION_LABELS: Record<ConditionLevel, string> = {
  EXCELLENT: 'Utmärkt',
  GOOD: 'Bra',
  FAIR: 'Okej',
  POOR: 'Dålig',
  VERY_POOR: 'Mycket dålig',
};

// Kalkylator-specifika val
const ALTAN_MATERIALS = [
  'Tryckimpregnerat 28x120',
  'Tryckimpregnerat 34x145',
  'Kärnfuru',
  'Ädelträ',
  'Träkomposit'
];

const FASAD_MATERIALS = [
  'Alkyd/Akrylat',
  'Linoljefärg',
  'Slamfärg'
];

const INOMHUS_OMFATTNING = [
  'Nej',
  'Små',
  'Medel',
  'Stora'
];

const SPECIAL_FEATURES = [
  'Golvvärme',
  'Duschkabin',
  'Badkar',
  'Tvättmaskin',
  'Torktumlare',
  'Diskmaskin',
  'Induktionshäll',
  'Köksfläkt',
  'Ventilation',
  'Fönsterbyte',
  'Dörrbyte',
  'Takomläggning',
  'Fasadmålning',
  'Puts',
  'Isolering',
];

const QuoteNew: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [step, setStep] = useState<'template' | 'form' | 'estimate'>(projectId ? 'form' : 'template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(!!projectId);

  // Image state
  const [quoteImages, setQuoteImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    mainCategory: 'MALNING_TAPETSERING' as ProjectMainCategory,
    projectType: '',
    description: '',
    location: '',
    areaSqm: '',
    complexity: 'MEDIUM' as ComplexityLevel,
    condition: 'GOOD' as ConditionLevel,
    specialFeatures: [] as string[],
    hourlyRate: '620',
    applyRotDeduction: true, // ROT-avdrag aktivt som standard
    includeVat: false, // Moms exkluderad som standard
    vatRate: 25, // 25% moms
    // Kalkylator-specifika fält
    materialType: '',
    omfattning: 'Nej',
    floorCount: '1',
    // Dolda fält med defaults (behövs för backend)
    subCategory: 'GENERAL',
    locationType: 'SUBURB' as 'CITY_CENTER' | 'SUBURB' | 'COUNTRYSIDE',
    accessDifficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'DIFFICULT',
  });

  const [estimate, setEstimate] = useState<any>(null);

  // Editable estimate state
  const [editableLineItems, setEditableLineItems] = useState<any[]>([]);
  const [editableMaterials, setEditableMaterials] = useState<any[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  // Kund-autocomplete state
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stäng dropdown vid klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced kundsökning
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      return;
    }

    setIsSearchingCustomers(true);
    try {
      const result = await api.searchCustomers(query);
      if (result.success && result.data.length > 0) {
        setCustomerSuggestions(result.data);
        setShowCustomerDropdown(true);
      } else {
        setCustomerSuggestions([]);
        setShowCustomerDropdown(false);
      }
    } catch (error) {
      console.error('Fel vid kundsökning:', error);
    } finally {
      setIsSearchingCustomers(false);
    }
  }, []);

  // Hantera kundnamn-input med debounce
  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, clientName: value }));

    // Debounce sökningen
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchCustomers(value);
    }, 300);
  };

  // Välj kund från dropdown
  const selectCustomer = (customer: { name: string; email: string; phone: string; address: string }) => {
    setFormData(prev => ({
      ...prev,
      clientName: customer.name,
      clientEmail: customer.email,
      clientPhone: customer.phone,
      clientAddress: customer.address,
    }));
    setShowCustomerDropdown(false);
    setCustomerSuggestions([]);
  };

  // ===========================================
  // ADRESS-AUTOCOMPLETE (Photon/OpenStreetMap)
  // ===========================================
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);
  const addressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stäng adress-dropdown vid klick utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(event.target as Node)) {
        setShowAddressDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sök adresser via Photon API (gratis OpenStreetMap geocoder)
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      // Photon API - gratis, stödjer autocomplete, svenska resultat
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=sv&lat=59.8586&lon=17.6389`
      );
      // lat/lon = Uppsala som bias för närmare resultat

      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const suggestions = data.features.map((feature: any) => {
            const props = feature.properties;
            // Bygg en läsbar adress
            const parts = [];
            if (props.street) parts.push(props.street);
            if (props.housenumber) parts[parts.length - 1] += ` ${props.housenumber}`;
            if (props.postcode) parts.push(props.postcode);
            if (props.city || props.town || props.village) {
              parts.push(props.city || props.town || props.village);
            }
            return {
              display: parts.join(', ') || props.name || 'Okänd adress',
              street: props.street || props.name || '',
              housenumber: props.housenumber || '',
              postcode: props.postcode || '',
              city: props.city || props.town || props.village || props.county || '',
              country: props.country || 'Sverige',
            };
          });
          setAddressSuggestions(suggestions);
          setShowAddressDropdown(true);
        } else {
          setAddressSuggestions([]);
          setShowAddressDropdown(false);
        }
      }
    } catch (error) {
      console.error('Fel vid adresssökning:', error);
    } finally {
      setIsSearchingAddress(false);
    }
  }, []);

  // Hantera adress-input med debounce
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, clientAddress: value }));

    // Debounce sökningen
    if (addressSearchTimeoutRef.current) {
      clearTimeout(addressSearchTimeoutRef.current);
    }
    addressSearchTimeoutRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 400);
  };

  // Välj adress från dropdown
  const selectAddress = (address: { display: string }) => {
    setFormData(prev => ({
      ...prev,
      clientAddress: address.display,
    }));
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

  // Ladda projektdata om projectId finns i URL
  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      try {
        const project = await api.getProject(projectId);
        if (project) {
          setFormData(prev => ({
            ...prev,
            clientName: project.clientName || '',
            clientEmail: project.clientEmail || '',
            clientPhone: project.clientPhone || '',
            clientAddress: project.address || '',
            projectType: project.title || '',
            description: project.description || '',
            location: project.address || '',
          }));
          toast.success(`Projektdata från "${project.title}" inläst`);
        }
      } catch (error) {
        console.error('Kunde inte ladda projektdata:', error);
        toast.error('Kunde inte ladda projektdata');
      } finally {
        setLoadingProject(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  // Live calculation of totals
  // Korrekt svensk ROT-beräkning: ROT räknas ENDAST på ROT-berättigade arbetskostnader INKL. moms
  const liveTotals = useMemo(() => {
    // Total arbetskostnad (alla poster)
    const totalLaborCost = editableLineItems.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);

    // Endast ROT-berättigade arbetskostnader (filtrera bort bilersättning, sophantering etc.)
    const rotEligibleLaborCost = editableLineItems
      .filter(item => isRotEligible(item.category || 'OVRIGT'))
      .reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unitPrice || 0));
      }, 0);

    const totalMaterialCost = editableMaterials.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);

    const totalCost = totalLaborCost + totalMaterialCost;
    // Räkna timmar endast för poster med tim-enhet
    const totalHours = editableLineItems
      .filter(item => item.unit === 'tim')
      .reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Moms-beräkning - VIKTIGT: priserna INKLUDERAR redan moms när includeVat=true!
    const vatRate = formData.vatRate / 100;
    let vatAmount = 0;
    let totalInclVat = 0;
    let costForRotCalc = 0;
    let totalExclVat = 0;

    if (formData.includeVat) {
      // Priser INKLUDERAR redan moms (688 kr = 550 kr + 138 kr moms)
      // Extrahera momsen från totalsumman - lägg INTE till den igen!
      totalInclVat = totalCost;
      totalExclVat = totalCost / (1 + vatRate);
      vatAmount = totalCost - totalExclVat;
      // ROT räknas på arbetskostnad inkl. moms (redan inkluderad)
      costForRotCalc = rotEligibleLaborCost;
    } else {
      // Priser EXKLUDERAR moms (550 kr) - lägg till moms
      totalExclVat = totalCost;
      vatAmount = totalCost * vatRate;
      totalInclVat = totalCost + vatAmount;
      // För ROT: lägg till moms på arbetskostnaden
      costForRotCalc = rotEligibleLaborCost * (1 + VAT_RATE);
    }

    const rotDeduction = formData.applyRotDeduction
      ? Math.min(costForRotCalc * ROT_PERCENTAGE, MAX_ROT_PER_PERSON)
      : 0;

    // Totalt att betala efter ROT
    const totalAfterRot = totalInclVat - rotDeduction;

    return {
      totalLaborCost,           // Arbetskostnad (inkl. eller exkl. moms beroende på inställning)
      rotEligibleLaborCost,     // Endast ROT-berättigad arbetskostnad
      totalMaterialCost,        // Materialkostnad
      totalCost,                // Total kostnad (inkl. eller exkl. moms beroende på inställning)
      totalExclVat,             // Totalt exkl. moms (för visning)
      rotDeduction,             // ROT-avdrag (30% av ROT-berättigat arbete inkl. moms)
      totalAfterRot,            // Att betala (efter ROT)
      totalHours,
      vatAmount,                // Total moms
      totalWithVat: totalInclVat,
    };
  }, [editableLineItems, editableMaterials, formData.applyRotDeduction, formData.includeVat, formData.vatRate]);

  // Hämta mallar
  const { data: templates = [] } = useQuery({
    queryKey: ['quoteTemplates'],
    queryFn: api.getQuoteTemplates,
  });

  // Använd mall mutation
  const useTemplateMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      api.useQuoteTemplate(templateId, data),
    onSuccess: (data) => {
      setEstimate(data);

      // Ladda line items från mallen till redigerbart tillstånd
      const transformedItems = (data.lineItemsSuggestion || data.lineItems || []).map((item: any) => ({
        category: item.category || 'OVRIGT',
        customCategory: item.customCategory || '',
        description: item.description || '',
        quantity: item.quantity || item.estimatedHours || 0,
        unit: item.unit || DEFAULT_UNITS[item.category as WorkCategory] || 'tim',
        unitPrice: item.unitPrice || item.hourlyRate || getHourlyRate(item.category || 'OVRIGT', formData.includeVat),
        totalCost: item.totalCost || ((item.quantity || item.estimatedHours || 0) * (item.unitPrice || item.hourlyRate || 0)),
      }));
      setEditableLineItems(transformedItems);

      // Ladda material från mallen till redigerbart tillstånd
      const transformedMaterials = (data.materialsSuggestion || data.materials || []).map((mat: any) => ({
        description: mat.description || mat.name || mat.material?.name || 'Material',
        quantity: mat.quantity || 1,
        unit: mat.unit || 'st',
        unitPrice: mat.unitPrice || mat.pricePerUnit || 0,
        totalCost: mat.totalCost || mat.totalPrice || ((mat.quantity || 1) * (mat.unitPrice || mat.pricePerUnit || 0)),
      }));
      setEditableMaterials(transformedMaterials);

      setStep('estimate');
      toast.success('Mall applicerad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte använda mall');
    },
  });

  // Estimera mutation
  const estimateMutation = useMutation({
    mutationFn: api.estimateQuote,
    onSuccess: (data) => {
      setEstimate(data);
      // Initialize editable state - konvertera till nytt format med enhet
      const transformedItems = (data.lineItemsSuggestion || []).map((item: any) => ({
        category: item.category || 'OVRIGT',
        customCategory: '',
        description: item.description || '',
        quantity: item.estimatedHours || item.quantity || 0,
        unit: item.unit || DEFAULT_UNITS[item.category as WorkCategory] || 'tim',
        unitPrice: item.hourlyRate || item.unitPrice || getHourlyRate(item.category || 'OVRIGT', formData.includeVat),
        totalCost: item.totalCost || ((item.estimatedHours || item.quantity || 0) * (item.hourlyRate || item.unitPrice || 0)),
      }));
      setEditableLineItems(transformedItems);
      setEditableMaterials([]);
      setStep('estimate');
      toast.success('AI-estimat genererat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte generera estimat');
    },
  });

  // Skapa offert mutation
  const createMutation = useMutation({
    mutationFn: api.createQuote,
    onSuccess: async (data) => {
      const quoteId = data.data.id;

      // Ladda upp bilder om det finns några
      if (quoteImages.length > 0) {
        try {
          await api.uploadQuoteImages(quoteId, quoteImages);
          toast.success(`Offert skapad med ${quoteImages.length} bild(er)!`);
        } catch {
          toast.success('Offert skapad! (bilduppladdning misslyckades)');
        }
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
      } else {
        toast.success('Offert skapad!');
      }

      navigate(`/admin/quotes/${quoteId}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skapa offert');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      specialFeatures: prev.specialFeatures.includes(feature)
        ? prev.specialFeatures.filter((f) => f !== feature)
        : [...prev.specialFeatures, feature],
    }));
  };

  const handleUseTemplate = (templateId: string) => {
    const clientName = prompt('Ange kundnamn:');
    if (!clientName) return;

    useTemplateMutation.mutate({
      templateId,
      data: { clientName, areaSqm: formData.areaSqm ? Number(formData.areaSqm) : undefined },
    });
  };

  const handleGenerateEstimate = () => {
    if (!formData.mainCategory || !formData.projectType || !formData.areaSqm || !formData.location) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }

    estimateMutation.mutate({
      mainCategory: formData.mainCategory,
      subCategory: formData.subCategory,
      projectType: formData.projectType,
      areaSqm: Number(formData.areaSqm),
      complexity: formData.complexity,
      existingCondition: formData.condition,
      location: formData.location,
      locationType: formData.locationType,
      accessDifficulty: formData.accessDifficulty,
      specialFeatures: formData.specialFeatures,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      // Kalkylator-specifika parametrar
      materialType: formData.materialType || undefined,
      omfattning: formData.omfattning || undefined,
      floorCount: formData.floorCount ? Number(formData.floorCount) : undefined,
    });
  };

  const handleCreateQuote = () => {
    if (!estimate) return;

    // Recalculate totals with edited data
    const recalculatedEstimate = recalculateTotals();

    // Map special features to boolean flags and JSON
    const specialFeaturesMap: any = {};
    formData.specialFeatures.forEach(feature => {
      const key = feature.toLowerCase().replace(/\s+/g, '');
      specialFeaturesMap[key] = true;
    });

    // Rensa beskrivningar från mellanslag och filtrera bort tomma
    const cleanedLineItems = editableLineItems
      .map(item => ({
        category: item.category === '__custom__' ? 'OVRIGT' : item.category,
        customCategory: item.category === '__custom__' ? item.customCategory : '',
        description: (item.description || '').trim(),
        quantity: item.quantity || 0,
        unit: item.unit || 'tim',
        unitPrice: item.unitPrice || 0,
        totalCost: item.totalCost || 0,
        // Behåll för bakåtkompatibilitet med backend
        estimatedHours: item.unit === 'tim' ? item.quantity : 0,
        hourlyRate: item.unit === 'tim' ? item.unitPrice : 0,
      }))
      .filter(item => item.description || item.quantity > 0);

    createMutation.mutate({
      ...formData,
      areaSqm: Number(formData.areaSqm),
      hourlyRate: Number(formData.hourlyRate),
      existingCondition: formData.condition,
      specialFeaturesJson: formData.specialFeatures,
      hasGolvvarme: formData.specialFeatures.includes('Golvvärme'),
      hasElUpdate: formData.specialFeatures.includes('Eluppdatering'),
      hasVvsUpdate: formData.specialFeatures.includes('VVS-uppdatering'),
      ...recalculatedEstimate,
      lineItems: cleanedLineItems,
      materials: editableMaterials,
    });
  };

  // Recalculate totals based on edited line items and materials
  // VIKTIGT: Timpriserna i HOURLY_RATES_INCL_VAT (688, 620, etc.) INKLUDERAR redan moms!
  // ROT räknas på arbetskostnad INKL. moms
  const recalculateTotals = () => {
    const totalLaborCost = editableLineItems.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPrice || 0));
    }, 0);

    // Endast ROT-berättigade arbetskostnader
    const rotEligibleLaborCost = editableLineItems
      .filter(item => isRotEligible(item.category || 'OVRIGT'))
      .reduce((sum, item) => {
        return sum + ((item.quantity || 0) * (item.unitPrice || 0));
      }, 0);

    const totalMaterialCost = editableMaterials.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const totalCost = totalLaborCost + totalMaterialCost;

    // Räkna timmar endast för poster med tim-enhet
    const totalHours = editableLineItems
      .filter(item => item.unit === 'tim')
      .reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Moms-beräkning - VIKTIGT: priserna INKLUDERAR redan moms!
    const vatRate = formData.vatRate / 100; // 0.25

    let vatAmount = 0;
    let totalInclVat = 0;
    let costForRotCalc = 0;

    if (formData.includeVat) {
      // Priser INKLUDERAR redan moms (688 kr = 550 kr + 138 kr moms)
      // Extrahera momsen från totalsumman
      vatAmount = totalCost - (totalCost / (1 + vatRate)); // t.ex. 688 - 550.4 = 137.6
      totalInclVat = totalCost; // Summan ÄR redan inkl. moms
      costForRotCalc = rotEligibleLaborCost; // Redan inkl. moms
    } else {
      // Priser EXKLUDERAR moms (550 kr) - lägg till moms
      vatAmount = totalCost * vatRate; // 550 * 0.25 = 137.5
      totalInclVat = totalCost + vatAmount; // 550 + 137.5 = 687.5
      costForRotCalc = rotEligibleLaborCost * (1 + vatRate); // ROT räknas på inkl. moms
    }

    // ROT-avdrag: 30% av ROT-berättigad arbetskostnad INKL. moms
    const rotDeduction = formData.applyRotDeduction
      ? Math.min(costForRotCalc * ROT_PERCENTAGE, MAX_ROT_PER_PERSON)
      : 0;

    // Totalt att betala efter ROT
    const totalAfterRot = totalInclVat - rotDeduction;

    return {
      estimatedTotalHours: totalHours,
      estimatedLaborCost: totalLaborCost,
      estimatedMaterialCost: totalMaterialCost,
      estimatedTotalCost: totalCost,
      applyRotDeduction: formData.applyRotDeduction,
      rotDeduction,
      totalAfterRot,
      includeVat: formData.includeVat,
      vatRate: formData.vatRate,
      vatAmount,
      totalWithVat: totalInclVat,
    };
  };

  // Line Items Functions
  const updateLineItem = (index: number, field: string, value: any, extraFields?: Record<string, any>) => {
    setEditableLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value, ...extraFields };

      // Om kategori ändras, uppdatera automatiskt pris och enhet
      // OVRIGT och __custom__ får eget pris (nollställs så användaren fyller i)
      if (field === 'category') {
        if (value === '__custom__' || value === 'OVRIGT') {
          // Egen kategori - låt användaren sätta pris själv
          const newUnit = value === 'OVRIGT' ? 'st' : (DEFAULT_UNITS[value as WorkCategory] || 'st');
          updated[index].unit = newUnit;
          updated[index].unitPrice = 0; // Användaren fyller i själv
          updated[index].totalCost = 0;
          if (value === '__custom__') {
            updated[index].customCategory = '';
          }
        } else {
          const newUnitPrice = getHourlyRate(value, formData.includeVat);
          const newUnit = DEFAULT_UNITS[value as WorkCategory] || 'st';
          updated[index].unitPrice = newUnitPrice;
          updated[index].unit = newUnit;
          updated[index].customCategory = ''; // Rensa egen kategori
          updated[index].totalCost = (updated[index].quantity || 0) * newUnitPrice;
        }
      }

      // Recalculate totalCost for this item
      if (field === 'quantity' || field === 'unitPrice') {
        updated[index].totalCost = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
      }

      return updated;
    });
  };

  // Uppdatera priser när moms ändras
  // OVRIGT och __custom__ behåller sina manuella priser
  useEffect(() => {
    if (editableLineItems.length > 0) {
      setEditableLineItems(prev => prev.map(item => {
        // OVRIGT och __custom__ - behåll användarsatt pris
        if (!item.category || item.category === '__custom__' || item.category === 'OVRIGT') {
          return item;
        }
        // Andra kategorier - uppdatera till fördefinierat pris
        const newUnitPrice = getHourlyRate(item.category, formData.includeVat);
        return {
          ...item,
          unitPrice: newUnitPrice,
          totalCost: (item.quantity || 0) * newUnitPrice,
        };
      }));
    }
  }, [formData.includeVat]);

  const addLineItem = () => {
    const defaultCategory = 'SNICKERI';
    const defaultRate = getHourlyRate(defaultCategory, formData.includeVat);
    const defaultUnit = DEFAULT_UNITS[defaultCategory as WorkCategory] || 'tim';
    setEditableLineItems([
      ...editableLineItems,
      {
        category: defaultCategory,
        customCategory: '',
        description: '',
        quantity: 0,
        unit: defaultUnit,
        unitPrice: defaultRate,
        totalCost: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setEditableLineItems(editableLineItems.filter((_, i) => i !== index));
  };

  // Materials Functions
  const updateMaterial = (index: number, field: string, value: any) => {
    const updated = [...editableMaterials];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totalCost for this material
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalCost = updated[index].quantity * updated[index].unitPrice;
    }

    setEditableMaterials(updated);
  };

  const addMaterial = (material?: any) => {
    if (material) {
      // Adding from library
      setEditableMaterials([
        ...editableMaterials,
        {
          description: material.name,
          quantity: 1,
          unit: material.unit || 'st',
          unitPrice: material.price,
          totalCost: material.price,
        },
      ]);
    } else {
      // Adding manually
      setEditableMaterials([
        ...editableMaterials,
        {
          description: 'Nytt material',
          quantity: 1,
          unit: 'st',
          unitPrice: 0,
          totalCost: 0,
        },
      ]);
    }
  };

  const removeMaterial = (index: number) => {
    setEditableMaterials(editableMaterials.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/quotes')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ny AI-driven offert</h1>
            <p className="mt-1 text-sm text-gray-500">
              Använd en mall eller generera estimat med AI
            </p>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step === 'template' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current">
              1
            </span>
            <span className="ml-2 text-sm font-medium">Mall eller formulär</span>
          </div>
          <div className="h-px w-16 bg-gray-300"></div>
          <div className={`flex items-center ${step === 'form' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current">
              2
            </span>
            <span className="ml-2 text-sm font-medium">Detaljer</span>
          </div>
          <div className="h-px w-16 bg-gray-300"></div>
          <div className={`flex items-center ${step === 'estimate' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current">
              3
            </span>
            <span className="ml-2 text-sm font-medium">AI-estimat</span>
          </div>
        </div>
      </div>

      {/* Step 1: Templates */}
      {step === 'template' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Välj projektmall (valfritt)</h2>
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template: QuoteTemplate) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:border-indigo-500 cursor-pointer"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                          <span>{CATEGORY_LABELS[template.mainCategory]}</span>
                          <span>•</span>
                          <span>{template.defaultAreaSqm} kvm</span>
                          <span>•</span>
                          <span>{template.estimatedHours} timmar</span>
                        </div>
                      </div>
                      {selectedTemplate === template.id && (
                        <CheckIcon className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template.id);
                      }}
                      className="mt-3 w-full inline-flex justify-center items-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded text-indigo-700 bg-white hover:bg-indigo-50"
                    >
                      <SparklesIcon className="h-4 w-4 mr-1" />
                      Använd mall
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Inga mallar tillgängliga ännu.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={() => setStep('form')}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Skapa från grunden
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Form */}
      {step === 'form' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Offertinformation</h2>
            {projectId && (
              <p className="mt-1 text-sm text-green-600">
                Förfylld med projektdata. Granska och komplettera uppgifterna nedan.
              </p>
            )}
          </div>
          {loadingProject && (
            <div className="px-6 py-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
              <span className="text-gray-600">Laddar projektdata...</span>
            </div>
          )}
          <div className="px-6 py-5 space-y-6">
            {/* Client Info med Autocomplete */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kundnamn med autocomplete */}
              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-sm font-medium text-gray-700">
                  Kundnamn <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleCustomerNameChange}
                    placeholder="Börja skriva för att söka..."
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    required
                    autoComplete="off"
                  />
                  {isSearchingCustomers && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
                {/* Autocomplete dropdown */}
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                    {customerSuggestions.map((customer, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                            <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                            {customer.address && (
                              <p className="text-xs text-gray-400 truncate">{customer.address}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  type="tel"
                  name="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              {/* Adress med autocomplete */}
              <div className="relative" ref={addressDropdownRef}>
                <label className="block text-sm font-medium text-gray-700">Adress</label>
                <div className="relative">
                  <input
                    type="text"
                    name="clientAddress"
                    value={formData.clientAddress}
                    onChange={handleAddressChange}
                    placeholder="Börja skriva gatuadress..."
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    autoComplete="off"
                  />
                  {isSearchingAddress && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
                {/* Adress autocomplete dropdown */}
                {showAddressDropdown && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                    {addressSuggestions.map((address, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectAddress(address)}
                        className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm text-gray-900">{address.display}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bilder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhotoIcon className="inline h-4 w-4 mr-1" />
                Bilder ({quoteImages.length}/10)
              </label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img src={preview} alt="" className="w-full h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(imagePreviews[index]);
                          setQuoteImages(prev => prev.filter((_, i) => i !== index));
                          setImagePreviews(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-600 text-white p-0.5 rounded-full transition-opacity"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <PhotoIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Vlj bilder</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const fileArray = Array.from(files);
                      const total = quoteImages.length + fileArray.length;
                      if (total > 10) { toast.error('Max 10 bilder'); return; }
                      setQuoteImages(prev => [...prev, ...fileArray]);
                      setImagePreviews(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))]);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <CameraIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Kamera</span>
                </button>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    const fileArray = Array.from(files);
                    if (quoteImages.length + fileArray.length > 10) { toast.error('Max 10 bilder'); return; }
                    setQuoteImages(prev => [...prev, ...fileArray]);
                    setImagePreviews(prev => [...prev, ...fileArray.map(f => URL.createObjectURL(f))]);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Project Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Huvudkategori <span className="text-red-500">*</span>
                </label>
                <select
                  name="mainCategory"
                  value={formData.mainCategory}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Projekttyp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectType"
                  placeholder="t.ex. Badrumsrenovering med golvvärme"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yta (kvm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="areaSqm"
                  step="0.1"
                  value={formData.areaSqm}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plats <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  placeholder="t.ex. Stockholm, Bromma"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            {/* Kalkylator-specifika fält */}
            {formData.mainCategory === 'ALTAN_TRADACK' && (
              <div className="border-l-4 border-green-500 bg-green-50 p-4">
                <h3 className="text-sm font-medium text-green-900 mb-3">Altanspecifika detaljer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Materialtyp
                    </label>
                    <select
                      name="materialType"
                      value={formData.materialType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    >
                      <option value="">Välj material</option>
                      {ALTAN_MATERIALS.map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {formData.mainCategory === 'MALNING_TAPETSERING' && (
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-3">Målningsdetaljer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reparationsomfattning
                    </label>
                    <select
                      name="omfattning"
                      value={formData.omfattning}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {INOMHUS_OMFATTNING.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Omfattning av reparationer och förberedelse innan målning
                    </p>
                  </div>
                </div>
              </div>
            )}

            {formData.mainCategory === 'FASADMALNING' && (
              <div className="border-l-4 border-purple-500 bg-purple-50 p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-3">Fasaddetaljer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Färgtyp
                    </label>
                    <select
                      name="materialType"
                      value={formData.materialType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    >
                      <option value="">Välj färgtyp</option>
                      {FASAD_MATERIALS.map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Antal våningar
                    </label>
                    <input
                      type="number"
                      name="floorCount"
                      min="1"
                      max="5"
                      value={formData.floorCount}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Påverkar pris med faktor ×1.3 för &gt;1 våning
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Complexity & Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Komplexitet</label>
                <select
                  name="complexity"
                  value={formData.complexity}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {Object.entries(COMPLEXITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Skick</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialfunktioner
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SPECIAL_FEATURES.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => handleFeatureToggle(feature)}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      formData.specialFeatures.includes(feature)
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Beskrivning</label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ytterligare detaljer om projektet..."
              />
            </div>

            {/* ROT-avdrag */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="applyRotDeduction"
                    name="applyRotDeduction"
                    type="checkbox"
                    checked={formData.applyRotDeduction}
                    onChange={(e) => setFormData(prev => ({ ...prev, applyRotDeduction: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="applyRotDeduction" className="font-medium text-green-900 cursor-pointer">
                    Applicera ROT-avdrag (30%)
                  </label>
                  <p className="text-sm text-green-700 mt-1">
                    ROT-avdrag ger 30% skattelättnad på arbetskostnaden (max 50 000 kr/person/år).
                    Avmarkera om kunden inte är berättigad till ROT eller inte vill använda det.
                  </p>
                </div>
              </div>
            </div>

            {/* Moms */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="includeVat"
                    name="includeVat"
                    type="checkbox"
                    checked={formData.includeVat}
                    onChange={(e) => setFormData(prev => ({ ...prev, includeVat: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="includeVat" className="font-medium text-blue-900 cursor-pointer">
                    Inkludera moms (25%)
                  </label>
                  <p className="text-sm text-blue-700 mt-1">
                    Aktivera för att lägga till 25% moms på totalbeloppet.
                    Avmarkerat = priser visas exklusive moms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-between">
            <button
              onClick={() => projectId ? navigate(`/admin/projects/${projectId}`) : setStep('template')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Tillbaka
            </button>
            <button
              onClick={handleGenerateEstimate}
              disabled={estimateMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {estimateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Genererar...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Generera AI-estimat
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Estimate */}
      {step === 'estimate' && estimate && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">AI-Genererat Estimat</h2>
              <p className="mt-1 text-sm text-gray-500">
                Baserat på {estimate.matchedProjects || 0} liknande historiska projekt
              </p>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Live Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Arbetskostnad</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(liveTotals.totalLaborCost)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {liveTotals.totalHours} timmar
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Materialkostnad</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(liveTotals.totalMaterialCost)}
                  </p>
                </div>
                {formData.applyRotDeduction ? (
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600">ROT-avdrag (30%)</p>
                    <p className="mt-1 text-2xl font-semibold text-green-900">
                      {formatCurrency(liveTotals.rotDeduction)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">ROT-avdrag</p>
                    <p className="mt-1 text-lg font-medium text-gray-400">
                      Ej aktiverat
                    </p>
                  </div>
                )}
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-600">
                    Att betala{formData.includeVat ? ' (inkl. moms)' : ' (exkl. moms)'}{formData.applyRotDeduction ? ', efter ROT' : ''}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-indigo-900">
                    {formatCurrency(liveTotals.totalAfterRot)}
                  </p>
                  {formData.includeVat && (
                    <p className="mt-1 text-xs text-indigo-600">
                      Moms: {formatCurrency(liveTotals.vatAmount)}
                    </p>
                  )}
                </div>
              </div>

              {/* ROT-avdrag och Moms toggles i estimat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="applyRotDeductionEstimate"
                        name="applyRotDeduction"
                        type="checkbox"
                        checked={formData.applyRotDeduction}
                        onChange={(e) => setFormData(prev => ({ ...prev, applyRotDeduction: e.target.checked }))}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="applyRotDeductionEstimate" className="font-medium text-green-900 cursor-pointer">
                        ROT-avdrag (30%)
                      </label>
                      <p className="text-sm text-green-700 mt-1">
                        {formData.applyRotDeduction && liveTotals.rotDeduction > 0
                          ? `Avdrag: ${formatCurrency(liveTotals.rotDeduction)}`
                          : 'Ej aktiverat'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="includeVatEstimate"
                        name="includeVat"
                        type="checkbox"
                        checked={formData.includeVat}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeVat: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="includeVatEstimate" className="font-medium text-blue-900 cursor-pointer">
                        Moms (25%)
                      </label>
                      <p className="text-sm text-blue-700 mt-1">
                        {formData.includeVat && liveTotals.vatAmount > 0
                          ? `Moms: ${formatCurrency(liveTotals.vatAmount)}`
                          : 'Ej inkluderad'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Arbetsuppdelning</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Lägg till arbete
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Kategori
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Beskrivning
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Antal
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Enhet
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Pris/enhet
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Kostnad
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editableLineItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-3 py-3">
                            {item.category === '__custom__' ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={item.customCategory || ''}
                                  onChange={(e) => updateLineItem(index, 'customCategory', e.target.value)}
                                  className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Skriv kategori..."
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => updateLineItem(index, 'category', 'SNICKERI')}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 text-left"
                                >
                                  ← Välj från lista
                                </button>
                              </div>
                            ) : (
                              <select
                                value={item.category || 'SNICKERI'}
                                onChange={(e) => updateLineItem(index, 'category', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                {WORK_CATEGORY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                                <option value="__custom__">Egen kategori...</option>
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              <select
                                value={
                                  !item.description ? '' :
                                  (item.category !== '__custom__' && WORK_DESCRIPTIONS[item.category as WorkCategory]?.includes(item.description))
                                    ? item.description
                                    : '__custom__'
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__custom__') {
                                    updateLineItem(index, 'description', ' ');
                                  } else {
                                    updateLineItem(index, 'description', val);
                                  }
                                }}
                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                <option value="">Välj beskrivning...</option>
                                {item.category !== '__custom__' && (WORK_DESCRIPTIONS[item.category as WorkCategory] || []).map((desc) => (
                                  <option key={desc} value={desc}>
                                    {desc}
                                  </option>
                                ))}
                                <option value="__custom__">➕ Egen beskrivning...</option>
                              </select>
                              {(item.description && (item.category === '__custom__' || !WORK_DESCRIPTIONS[item.category as WorkCategory]?.includes(item.description))) && (
                                <input
                                  type="text"
                                  value={item.description.trim()}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value || ' ')}
                                  className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Skriv egen beskrivning..."
                                  autoFocus
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.5"
                              value={item.quantity || 0}
                              onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                              className="block w-20 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={item.unit || 'tim'}
                              onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                              className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              {COMMON_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={item.unitPrice || 0}
                              onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                              className="block w-24 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                            {formatCurrency(item.totalCost || 0)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Editable Materials */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Material</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addMaterial()}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Lägg till manuellt
                    </button>
                  </div>
                </div>
                {editableMaterials.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Beskrivning
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Antal
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Enhet
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Pris/enhet (kr)
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Kostnad
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {editableMaterials.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateMaterial(index, 'quantity', Number(e.target.value))}
                                className="block w-20 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                                className="block w-16 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateMaterial(index, 'unitPrice', Number(e.target.value))}
                                className="block w-24 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(item.totalCost || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeMaterial(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-500">Inga material tillagda än</p>
                    <p className="text-xs text-gray-400 mt-1">Klicka "Lägg till manuellt" för att lägga till material</p>
                  </div>
                )}
              </div>

              {/* AI Confidence */}
              {estimate.confidenceLevel !== undefined && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-blue-900">AI-säkerhet</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        {Math.round(estimate.confidenceLevel * 100)}% säkerhet baserat på historisk data
                      </p>
                      {estimate.basedOnQuoteIds && estimate.basedOnQuoteIds.length > 0 && (
                        <p className="mt-1 text-xs text-blue-600">
                          Baserat på {estimate.basedOnQuoteIds.length} liknande projekt
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-between">
              <button
                onClick={() => {
                  setStep('form');
                  setEstimate(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Redigera
              </button>
              <button
                onClick={handleCreateQuote}
                disabled={createMutation.isPending}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Skapar...' : 'Skapa offert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteNew;
