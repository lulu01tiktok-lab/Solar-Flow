import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Lead, LeadStatus, SolarSimulation, KitItem, AppSettings, City, Equipment, KanbanColumn, SharedUnit, GeneratingUnit, ProposalHistory, User } from '../types';
import { BRAZIL_STATES } from '../constants';
import { calculateSystemSize, calculateGeneration, calculateSavings, calculatePayback, calculateFinancialProjection } from '../services/solarService';
import { Save, ArrowRight, ArrowLeft, Trash2, CheckCircle, User as UserIcon, Building2, MapPin, ExternalLink, Plus, Pencil, Check, SunDim, Grid, Zap, Share2, Package, X, Calculator, DollarSign, Settings2, Ruler, Cable, TrendingUp, RefreshCw, FileText, FileBadge, Send, Home, Mail, Phone, Globe, Instagram } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, ReferenceDot, Label } from 'recharts';

const solarDiagram = "https://i.imgur.com/03HlDJA.png";

interface LeadFlowProps {
  leads: Lead[];
  saveLead: (lead: Lead) => void;
  deleteLead: (id: string) => void;
  settings: AppSettings;
  cities: City[];
  addCity: (city: City) => void;
  updateCity: (city: City) => void;
  equipmentList: Equipment[];
  addEquipment: (item: Equipment) => void;
  columns: KanbanColumn[];
  users?: User[];
}

const LeadFlow: React.FC<LeadFlowProps> = ({ leads, saveLead, deleteLead, settings, cities, addCity, updateCity, equipmentList, addEquipment, columns, users }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  
  const initialTab = (searchParams.get('tab') as 'INFO' | 'CALCULATOR' | 'KIT' | 'FINANCIAL' | 'PROPOSAL') || 'INFO';
  const [activeTab, setActiveTab] = useState<'INFO' | 'CALCULATOR' | 'KIT' | 'FINANCIAL' | 'PROPOSAL'>(initialTab);
  const [proposalMode, setProposalMode] = useState<'SELECTION' | 'SIMPLE' | 'COMPLETE'>('SELECTION');

  // Local state for city management
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [hspInput, setHspInput] = useState('');

    // Local state for Panel Logic
    const [selectedModuleId, setSelectedModuleId] = useState<string>('');
    const [panelPower, setPanelPower] = useState<number>(550); // Watts
    const [panelCount, setPanelCount] = useState<number>(0);
    const [idealSystemSize, setIdealSystemSize] = useState<number>(0); // The calculated theoretical need

    // Local state for Inverter Logic
    const [selectedInverterId, setSelectedInverterId] = useState<string>('');
    const [inverterQty, setInverterQty] = useState<number>(1);

    // Local state for Kit Building (Step 3)
    const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState<'CATALOG' | 'NEW'>('CATALOG');
    const [searchTerm, setSearchTerm] = useState('');

  // Tariff Editing Modal State
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [tempTe, setTempTe] = useState<number>(0);
  const [tempTusd, setTempTusd] = useState<number>(0);

  // New Equipment Form State (Full Object)
  const [newEqData, setNewEqData] = useState<Partial<Equipment>>({
      type: 'MODULE',
      manufacturer: '',
      model: '',
      power: 0,
      price: 0,
      width: 0,
      height: 0,
      warranty: '',
      efficiencyWarranty: '',
      voltage: '',
      inverterPhase: 'MONO',
      inverterType: 'STRING'
  });

  // Scale state for responsive proposal viewing
  const [scale, setScale] = useState(1);
  const [proposalHeight, setProposalHeight] = useState<number | null>(null);
  const proposalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const containerWidth = window.innerWidth;
      const proposalWidth = 794; // 210mm @ 96dpi approx
      
      // Calculate scale to fit screen with some margin (32px)
      // Only scale down, never up (max scale 1)
      if (containerWidth < proposalWidth + 32) {
        const newScale = (containerWidth - 32) / proposalWidth;
        setScale(newScale);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [formData, setFormData] = useState<Lead>({
    id: isNew ? Date.now().toString() : '',
    name: '',
    clientType: 'PF', // Default to Pessoa Física
    document: '',
    contactName: '',
    phone: '',
    status: LeadStatus.NEW,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Update proposal height when content changes or scale changes
  useEffect(() => {
      if (!proposalRef.current) return;

      const updateHeight = () => {
          if (proposalRef.current) {
              setProposalHeight(proposalRef.current.scrollHeight);
          }
      };

      // Initial update
      updateHeight();

      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(proposalRef.current);

      return () => resizeObserver.disconnect();
  }, [proposalMode, activeTab, scale]);

  // Load existing lead
  useEffect(() => {
    if (!isNew && id) {
      const existing = leads.find((l) => l.id === id);
      if (existing) {
        // Initialize Generating Unit if missing
        const sim = existing.simulation;
        let genUnit = sim?.generatingUnit;
        if (!genUnit && sim) {
            genUnit = {
                type: sim.connectionType || 'MONO',
                consumption: sim.avgConsumption || 0
            };
        }

        setFormData({
            ...existing,
            clientType: existing.clientType || 'PF',
            simulation: sim ? {
                ...sim,
                te: sim.te ?? settings.te,
                tusd: sim.tusd ?? settings.tusd,
                generatingUnit: genUnit,
                beneficiaryUnits: sim.beneficiaryUnits || []
            } : undefined
        });

        // Initialize local state from saved simulation
        if (sim?.systemSize) {
             const sizeKw = sim.systemSize;
             const kitModules = sim.kitItems?.filter(k => k.type === 'MODULE') || [];
             const kitInverters = sim.kitItems?.filter(k => k.type === 'INVERTER') || [];
             
             // Try to find module from kit
             if (kitModules.length > 0) {
                 const mod = kitModules[0];
                 const eq = equipmentList.find(e => e.id === mod.equipmentId || (e.model && mod.name.includes(e.model)));
                 if (eq) {
                     setSelectedModuleId(eq.id);
                     setPanelPower(eq.power);
                 }
                 setPanelCount(mod.quantity);
             } else {
                 // Fallback estimation
                 const estimatedCount = Math.round((sizeKw * 1000) / 550);
                 setPanelCount(estimatedCount);
             }

             // Try to find inverter from kit
             if (kitInverters.length > 0) {
                 const inv = kitInverters[0];
                 const eq = equipmentList.find(e => e.id === inv.equipmentId || (e.model && inv.name.includes(e.model)));
                 if (eq) {
                     setSelectedInverterId(eq.id);
                 }
                 setInverterQty(inv.quantity);
             }

             setIdealSystemSize(sizeKw);
        }
      } else {
        // Lead not found or no access
        navigate('/dashboard');
      }
    } else if (isNew) {
      setFormData(prev => ({
          ...prev,
          simulation: {
              ...(prev.simulation || {} as SolarSimulation),
              tariff: settings.defaultTariff,
              te: settings.te,
              tusd: settings.tusd,
              avgConsumption: 0,
              city: settings.addressCity || '',
              uf: settings.addressState || '',
              hsp: 0,
              connectionType: 'MONO',
              roofOrientation: 'NORTH',
              selfConsumption: settings.defaultSelfConsumption ?? 30,
              systemSize: 0,
              estimatedGeneration: 0,
              estimatedSavings: 0,
              payback: 0,
              totalPrice: 0,
              kitItems: [],
              hasSharedGeneration: false,
              generatingUnit: { type: 'MONO', consumption: 0 },
              beneficiaryUnits: []
          }
      }));
    }
  }, [id, leads, isNew, navigate, settings]);

  useEffect(() => {
      if (formData.simulation?.hsp) {
          setHspInput(formData.simulation.hsp.toString().replace('.', ','));
      }
  }, [formData.simulation?.hsp]);

  // Sync avgConsumption whenever units change
  useEffect(() => {
      if (!formData.simulation) return;
      
      const genCons = formData.simulation.generatingUnit?.consumption || 0;
      const sharedCons = formData.simulation.beneficiaryUnits?.reduce((acc, curr) => acc + curr.consumption, 0) || 0;
      const total = genCons + sharedCons;

      // Only update if total > 0 to avoid overwriting initial load with 0 if units aren't set yet
      if (total > 0 && total !== formData.simulation.avgConsumption) {
          handleSimulationChange('avgConsumption', total);
      }
  }, [formData.simulation?.generatingUnit, formData.simulation?.beneficiaryUnits]);

  const handleLeadChange = (field: keyof Lead, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSimulationChange = (field: keyof SolarSimulation, value: any) => {
    setFormData((prev) => {
      const currentSim = prev.simulation || {
        avgConsumption: 0,
        city: '',
        uf: '',
        hsp: 0,
        tariff: settings.defaultTariff,
        te: settings.te,
        tusd: settings.tusd,
        connectionType: 'MONO',
        roofOrientation: 'NORTH',
        selfConsumption: 30,
        systemSize: 0,
        estimatedGeneration: 0,
        estimatedSavings: 0,
        payback: 0,
        totalPrice: 0,
        kitItems: [],
        hasSharedGeneration: false,
        generatingUnit: { type: 'MONO', consumption: 0 },
        beneficiaryUnits: []
      };
      return { ...prev, simulation: { ...currentSim, [field]: value } };
    });
  };

  const handleGeneratingUnitChange = (field: keyof GeneratingUnit, value: any) => {
      setFormData(prev => {
          if (!prev.simulation) return prev;
          const currentGen = prev.simulation.generatingUnit || { type: 'MONO', consumption: 0 };
          
          // If changing type, also update the main connectionType for consistency
          let updates: Partial<SolarSimulation> = {
              generatingUnit: { ...currentGen, [field]: value }
          };
          
          if (field === 'type') {
              updates.connectionType = value;
          }

          return {
              ...prev,
              simulation: {
                  ...prev.simulation,
                  ...updates
              }
          };
      });
  };

  const addBeneficiaryUnit = () => {
      setFormData(prev => {
          if (!prev.simulation) return prev;
          const currentUnits = prev.simulation.beneficiaryUnits || [];
          const newUnit: SharedUnit = {
              id: Date.now().toString(),
              name: `Unidade ${currentUnits.length + 1}`,
              type: 'MONO',
              consumption: 0
          };
          return {
              ...prev,
              simulation: {
                  ...prev.simulation,
                  beneficiaryUnits: [...currentUnits, newUnit]
              }
          };
      });
  };

  const updateBeneficiaryUnit = (id: string, field: keyof SharedUnit, value: any) => {
      setFormData(prev => {
          if (!prev.simulation) return prev;
          const currentUnits = prev.simulation.beneficiaryUnits || [];
          return {
              ...prev,
              simulation: {
                  ...prev.simulation,
                  beneficiaryUnits: currentUnits.map(u => u.id === id ? { ...u, [field]: value } : u)
              }
          };
      });
  };

  const removeBeneficiaryUnit = (id: string) => {
      setFormData(prev => {
          if (!prev.simulation) return prev;
          const currentUnits = prev.simulation.beneficiaryUnits || [];
          return {
              ...prev,
              simulation: {
                  ...prev.simulation,
                  beneficiaryUnits: currentUnits.filter(u => u.id !== id)
              }
          };
      });
  };

  const openTariffModal = () => {
      setTempTe(formData.simulation?.te ?? settings.te);
      setTempTusd(formData.simulation?.tusd ?? settings.tusd);
      setIsTariffModalOpen(true);
  };

  const saveTariff = () => {
      const newTotal = parseFloat((tempTe + tempTusd).toFixed(4));
      setFormData(prev => ({
          ...prev,
          simulation: {
              ...prev.simulation!,
              te: tempTe,
              tusd: tempTusd,
              tariff: newTotal
          }
      }));
      setIsTariffModalOpen(false);
  };

  const syncTariffWithSettings = () => {
      if (!formData.simulation) return;
      const newTotal = settings.defaultTariff;
      setFormData(prev => ({
          ...prev,
          simulation: {
              ...prev.simulation!,
              te: settings.te,
              tusd: settings.tusd,
              tariff: newTotal
          }
      }));
  };



  const handleUfChange = (uf: string) => {
      handleSimulationChange('uf', uf);
      handleSimulationChange('city', ''); 
      handleSimulationChange('hsp', 0); 
      setIsAddingCity(false);
      setIsEditingCity(false);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setIsEditingCity(false);
      
      if (val === 'NEW') {
          setIsAddingCity(true);
          setNewCityName('');
          handleSimulationChange('hsp', 0);
          handleSimulationChange('city', '');
          setHspInput('');
      } else {
          setIsAddingCity(false);
          handleSimulationChange('city', val);
          const selectedCity = cities.find(c => c.name === val && c.uf === formData.simulation?.uf);
          if (selectedCity) {
              handleSimulationChange('hsp', selectedCity.hsp);
              setHspInput(selectedCity.hsp.toString().replace('.', ','));
          }
      }
  };

  const handleHspInputChange = (val: string) => {
      setHspInput(val);
      const num = parseFloat(val.replace(',', '.'));
      if (!isNaN(num)) {
          handleSimulationChange('hsp', num);
      }
  };

  const saveNewCity = () => {
      if (!newCityName || !formData.simulation?.hsp) {
          alert('Preencha o nome da cidade e a irradiação (PVOUT).');
          return;
      }
      
      const newCity: City = {
          id: Date.now().toString(),
          name: newCityName,
          uf: formData.simulation.uf,
          hsp: formData.simulation.hsp
      };

      addCity(newCity);
      setIsAddingCity(false);
      handleSimulationChange('city', newCityName);
      alert('Cidade cadastrada com sucesso!');
  };

  const saveEditedCity = () => {
      const cityName = formData.simulation?.city;
      const uf = formData.simulation?.uf;
      const hsp = formData.simulation?.hsp;

      if (!cityName || !uf || !hsp) return;

      const existingCity = cities.find(c => c.name === cityName && c.uf === uf);
      
      if (existingCity) {
          updateCity({
              ...existingCity,
              hsp: hsp
          });
          setIsEditingCity(false);
          alert(`Irradiação de ${cityName} atualizada!`);
      }
  };

  const getOrientationEfficiency = (orientation: string): number => {
      switch (orientation) {
          case 'NORTH': return settings.effNorth;
          case 'EAST_WEST': return settings.effEastWest;
          case 'OTHER': return settings.effSouth;
          default: return 1;
      }
  };

  const recalculateSystemByKit = (pPower: number, pCount: number) => {
      if (!formData.simulation) return;

      const { roofOrientation, hsp, selfConsumption, hasSharedGeneration, generatingUnit, beneficiaryUnits, te, tusd } = formData.simulation;
      const orientationFactor = getOrientationEfficiency(roofOrientation);

      const realSystemSize = (pCount * pPower) / 1000;
      const gen = calculateGeneration(realSystemSize, hsp, orientationFactor);
      const currentTariff = (te || 0) + (tusd || 0);
      const effectiveFioBPercentage = settings.fioBPercentage;
      const effectiveIcmsPercentage = settings.icmsOnTusd ? (settings.icmsTaxPercentage || 0) : 0;
      
      const savingsResult = calculateSavings(
          gen, 
          currentTariff, 
          selfConsumption, 
          effectiveFioBPercentage, 
          tusd || 0,
          effectiveIcmsPercentage,
          generatingUnit, // Always pass generatingUnit
          hasSharedGeneration ? beneficiaryUnits : undefined
      );

      const savings = savingsResult.savings;

      const projection = calculateFinancialProjection(
          gen,
          currentTariff,
          tusd || 0,
          settings.energyInflation || 6.0,
          effectiveFioBPercentage,
          effectiveIcmsPercentage,
          selfConsumption,
          generatingUnit, // Always pass generatingUnit
          hasSharedGeneration ? beneficiaryUnits : undefined
      );

      setFormData(prev => ({
          ...prev,
          simulation: {
              ...prev.simulation!,
              systemSize: parseFloat(realSystemSize.toFixed(2)),
              estimatedGeneration: gen,
              estimatedSavings: savings,
              financialProjection: projection 
          }
      }));
  };

  const calculateResults = () => {
    if (!formData.simulation) return;
    
    let totalConsumption = 0;

    const genCons = formData.simulation.generatingUnit?.consumption || 0;

    if (formData.simulation.hasSharedGeneration) {
        const benCons = formData.simulation.beneficiaryUnits?.reduce((acc, curr) => acc + curr.consumption, 0) || 0;
        totalConsumption = genCons + benCons;
    } else {
        totalConsumption = genCons;
    }
    
    // Update avgConsumption in state to reflect total
    handleSimulationChange('avgConsumption', totalConsumption);
    
    const { roofOrientation, hsp } = formData.simulation;
    
    if (hsp <= 0) {
        alert("Por favor, informe a irradiação (PVOUT) da cidade.");
        return;
    }

    const orientationFactor = getOrientationEfficiency(roofOrientation);
    const idealSize = calculateSystemSize(totalConsumption, hsp, orientationFactor);
    setIdealSystemSize(idealSize);

    const count = Math.ceil((idealSize * 1000) / panelPower);
    setPanelCount(count);

    recalculateSystemByKit(panelPower, count);
  };

  const updateKitWithModule = (moduleId: string, count: number) => {
      const moduleEq = equipmentList.find(e => e.id === moduleId);
      if (!moduleEq) return;

      setFormData(prev => {
          const currentKit = prev.simulation?.kitItems || [];
          // Remove existing modules
          const otherItems = currentKit.filter(item => item.type !== 'MODULE');
          
          const newModuleItem: KitItem = {
              id: Date.now().toString(),
              equipmentId: moduleEq.id,
              name: `${moduleEq.manufacturer} ${moduleEq.model} (${moduleEq.power}W)`,
              quantity: count,
              type: 'MODULE'
          };
          
          return {
              ...prev,
              simulation: {
                  ...prev.simulation!,
                  kitItems: [newModuleItem, ...otherItems]
              }
          };
      });
  };



  const handleModuleSelect = (moduleId: string) => {
      setSelectedModuleId(moduleId);
      const eq = equipmentList.find(e => e.id === moduleId);
      if (eq) {
          setPanelPower(eq.power);
          if (idealSystemSize > 0) {
              const newCount = Math.ceil((idealSystemSize * 1000) / eq.power);
              setPanelCount(newCount);
              recalculateSystemByKit(eq.power, newCount);
              updateKitWithModule(moduleId, newCount);
          } else {
              recalculateSystemByKit(eq.power, panelCount);
              updateKitWithModule(moduleId, panelCount);
          }
      }
  };

  const handleInverterSelect = (inverterId: string) => {
      setSelectedInverterId(inverterId);
  };

  const handleInverterQtyChange = (qty: number) => {
      setInverterQty(qty);
  };

  const handleAddInverterToKit = () => {
      if (!selectedInverterId) {
          alert('Selecione um inversor.');
          return;
      }
      if (inverterQty <= 0) {
          alert('Quantidade deve ser maior que zero.');
          return;
      }

      const inverterEq = equipmentList.find(e => e.id === selectedInverterId);
      if (!inverterEq) return;

      setFormData(prev => {
          const currentKit = prev.simulation?.kitItems || [];
          
          const newInverterItem: KitItem = {
              id: Date.now().toString() + '_inv',
              equipmentId: inverterEq.id,
              name: `${inverterEq.manufacturer} ${inverterEq.model} (${inverterEq.power}kW)`,
              quantity: inverterQty,
              type: 'INVERTER'
          };
          
          return {
              ...prev,
              simulation: {
                  ...prev.simulation!,
                  kitItems: [...currentKit, newInverterItem]
              }
          };
      });
      
      // Reset selection after adding
      setSelectedInverterId('');
      setInverterQty(1);
  };

  const handlePanelPowerChange = (newPower: number) => {
      setPanelPower(newPower);
      if (idealSystemSize > 0) {
          const newCount = Math.ceil((idealSystemSize * 1000) / newPower);
          setPanelCount(newCount);
          recalculateSystemByKit(newPower, newCount);
      } else {
          recalculateSystemByKit(newPower, panelCount);
      }
  };

  const handlePanelCountChange = (newCount: number) => {
      setPanelCount(newCount);
      recalculateSystemByKit(panelPower, newCount);
      if (selectedModuleId) {
          updateKitWithModule(selectedModuleId, newCount);
      }
  };

  const updatePriceAndPayback = (price: number) => {
    const savings = formData.simulation?.estimatedSavings || 0;
    const payback = calculatePayback(price, savings);
    setFormData(prev => ({
        ...prev,
        simulation: {
            ...prev.simulation!,
            totalPrice: price,
            payback: payback
        }
    }));
  };

  const removeKitItem = (itemId: string) => {
     const items = formData.simulation?.kitItems || [];
     handleSimulationChange('kitItems', items.filter(i => i.id !== itemId));
  };

  const handleSave = (silent = false) => {
    if (!formData.name) {
        alert('Por favor, preencha o nome do cliente.');
        return;
    }
    saveLead({
        ...formData,
        updatedAt: new Date().toISOString()
    });
    if (isNew) {
        navigate(`/lead/${formData.id}`);
    }
    if (!silent) alert('Salvo com sucesso!');
  };

  const cashFlowData = useMemo(() => {
      if (!formData.simulation?.financialProjection) return [];
      
      const investment = formData.simulation.totalPrice || 0;
      const year0 = {
          name: 'Ano 0',
          year: 0,
          savings: 0,
          accumulated: -investment,
          investment: -investment
      };

      const projectionData = formData.simulation.financialProjection.map(p => ({
          name: `Ano ${p.year}`,
          year: p.year,
          savings: p.savings,
          accumulated: p.accumulatedSavings - investment,
          investment: 0
      }));

      return [year0, ...projectionData];
  }, [formData.simulation]);


  const renderInfo = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-slate-700 p-1 rounded-lg flex text-sm font-medium border border-gray-200 dark:border-slate-600">
          <button 
             onClick={() => handleLeadChange('clientType', 'PF')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${formData.clientType === 'PF' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-slate-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white'}`}
          >
              <UserIcon size={18} /> Pessoa Física
          </button>
          <button 
             onClick={() => handleLeadChange('clientType', 'PJ')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${formData.clientType === 'PJ' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-slate-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white'}`}
          >
              <Building2 size={18} /> Pessoa Jurídica
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                {formData.clientType === 'PF' ? 'Nome Completo' : 'Razão Social'}
            </label>
            <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) => handleLeadChange('name', e.target.value)}
                placeholder={formData.clientType === 'PF' ? "Ex: Carlos Silva" : "Ex: Padaria Silva Ltda"}
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                {formData.clientType === 'PF' ? 'CPF' : 'CNPJ'}
            </label>
            <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                value={formData.document || ''}
                onChange={(e) => handleLeadChange('document', e.target.value)}
                placeholder={formData.clientType === 'PF' ? "000.000.000-00" : "00.000.000/0001-00"}
            />
        </div>

        {formData.clientType === 'PJ' && (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Nome do Responsável</label>
                <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.contactName || ''}
                    onChange={(e) => handleLeadChange('contactName', e.target.value)}
                    placeholder="Quem responde pela empresa"
                />
            </div>
        )}

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">WhatsApp / Telefone</label>
            <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                value={formData.phone}
                onChange={(e) => handleLeadChange('phone', e.target.value)}
                placeholder="(11) 99999-9999"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email (Opcional)</label>
            <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                value={formData.email || ''}
                onChange={(e) => handleLeadChange('email', e.target.value)}
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Status do Funil</label>
            <select
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                value={formData.status}
                onChange={(e) => handleLeadChange('status', e.target.value)}
            >
                {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                ))}
            </select>
        </div>
      </div>
      
      <div className="pt-6 flex justify-between items-center">
        {!isNew && (
            <button 
                onClick={() => {
                   if(window.confirm('Tem certeza?')) {
                       deleteLead(formData.id);
                       navigate('/dashboard');
                   }
                }}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center gap-1"
            >
                <Trash2 size={16} /> Excluir Lead
            </button>
        )}
        
        <button 
            onClick={() => setActiveTab('CALCULATOR')}
            className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
            Próximo: Dimensionamento <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderCalculator = () => (
    <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <MapPin size={18} /> Localização do Projeto
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Estado (UF)</label>
                    <select
                         className="mt-1 block w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                         value={formData.simulation?.uf || ''}
                         onChange={(e) => handleUfChange(e.target.value)}
                    >
                        <option value="">Selecione...</option>
                        {BRAZIL_STATES.map(st => (
                            <option key={st.uf} value={st.uf}>{st.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Cidade</label>
                    {formData.simulation?.uf ? (
                         <select
                            className="mt-1 block w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            value={isAddingCity ? 'NEW' : (formData.simulation?.city || '')}
                            onChange={handleCityChange}
                         >
                            <option value="">Selecione...</option>
                            {cities
                                .filter(c => c.uf === formData.simulation?.uf)
                                .map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))
                            }
                            <option value="NEW">+ Cadastrar Nova Cidade...</option>
                         </select>
                    ) : (
                        <input disabled className="mt-1 block w-full rounded border-gray-300 dark:border-slate-700 p-2 border bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600" placeholder="Selecione o Estado" />
                    )}
                </div>
            </div>

            {(formData.simulation?.city || isAddingCity) && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded border border-blue-200 dark:border-blue-700 mb-4 animate-in fade-in slide-in-from-top-2">
                    {isAddingCity && (
                        <div className="mb-3">
                             <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nome da Nova Cidade</label>
                             <input 
                                type="text"
                                className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                value={newCityName}
                                onChange={(e) => setNewCityName(e.target.value)}
                                placeholder="Ex: Sobral"
                             />
                        </div>
                    )}
                    
                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                Irradiação (PVOUT Anual)
                                {isAddingCity && <span className="text-red-500">*</span>}
                            </label>
                            <div className="relative flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className="block w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500"
                                        value={hspInput}
                                        onChange={(e) => handleHspInputChange(e.target.value)}
                                        placeholder="Ex: 1703,6"
                                        disabled={!isAddingCity && !isEditingCity && !!formData.simulation?.city} 
                                    />
                                    <span className="absolute right-3 top-2 text-gray-400 text-xs">
                                        kWh/kWp
                                    </span>
                                </div>
                                
                                {!isAddingCity && !isEditingCity && formData.simulation?.city && (
                                    <button 
                                        onClick={() => setIsEditingCity(true)}
                                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                        title="Editar irradiação cadastrada"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {isAddingCity && (
                             <button 
                                onClick={saveNewCity}
                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                             >
                                <Save size={16} /> Salvar Cidade
                             </button>
                        )}

                        {isEditingCity && (
                             <button 
                                onClick={saveEditedCity}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                             >
                                <Check size={16} /> Atualizar
                             </button>
                        )}
                    </div>

                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-100 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                        <ExternalLink size={14} className="shrink-0 mt-0.5" />
                        <div>
                            Não sabe a irradiação? Consulte o <strong>Solar Global Atlas</strong>. 
                            Procure pelo valor <strong>PVOUT (Specific Yield)</strong>.
                            <br />
                            <a 
                                href="https://globalsolaratlas.info/map" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline font-semibold mt-1 inline-block"
                            >
                                Abrir Global Solar Atlas
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <hr className="border-blue-100 dark:border-blue-800 my-4" />

            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <CheckCircle size={18} /> Dados de Consumo e Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Unidade Geradora */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-blue-200 dark:border-blue-700 shadow-sm">
                    <h4 className="font-bold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <Home size={16} className="text-blue-600" /> Unidade Geradora (Principal)
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tipo de Ligação</label>
                            <select
                                className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                value={formData.simulation?.generatingUnit?.type || 'MONO'}
                                onChange={(e) => handleGeneratingUnitChange('type', e.target.value)}
                            >
                                <option value="MONO">Monofásico (30 kWh)</option>
                                <option value="BIFASICO">Bifásico (50 kWh)</option>
                                <option value="TRIFASICO">Trifásico (100 kWh)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Consumo Médio (kWh)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                value={formData.simulation?.generatingUnit?.consumption || ''}
                                onChange={(e) => handleGeneratingUnitChange('consumption', Number(e.target.value))}
                                placeholder="Ex: 500"
                            />
                        </div>
                    </div>
                </div>
                
                {/* Tarifa */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-slate-700 shadow-sm">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tarifa Vigente</label>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-200 dark:border-slate-700">
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800 dark:text-white">
                                R$ {(formData.simulation?.tariff || 0).toFixed(4)} <span className="text-xs font-normal text-gray-500">/kWh</span>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 flex gap-2">
                                <span>TE: R$ {(formData.simulation?.te || 0).toFixed(4)}</span>
                                <span>TUSD: R$ {(formData.simulation?.tusd || 0).toFixed(4)}</span>
                            </div>
                        </div>

                        <button 
                            onClick={syncTariffWithSettings}
                            className="text-blue-600 dark:text-blue-400 p-2 rounded hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                            title={`Redefinir para Configurações:\nTE: ${settings.te}\nTUSD: ${settings.tusd}`}
                            type="button"
                        >
                            <RefreshCw size={16} />
                        </button>

                        <button 
                            onClick={openTariffModal}
                            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                            title="Personalizar Tarifa"
                            type="button"
                        >
                            <Settings2 size={16} />
                        </button>
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500 dark:text-slate-500 flex items-center gap-1 flex-wrap">
                        <span className="flex items-center gap-1"><Calculator size={12} /> Fio B (Config.): <strong className="text-orange-600 dark:text-orange-400">{settings.fioBPercentage.toFixed(2)}%</strong></span>
                        {settings.icmsOnTusd && (
                            <span className="ml-2 flex items-center gap-1 border-l border-gray-300 dark:border-slate-600 pl-2">
                                ICMS TUSD: <strong className="text-red-600 dark:text-red-400">{settings.icmsTaxPercentage || 0}%</strong>
                            </span>
                        )}
                    </div>
                </div>

                {/* Orientação */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-slate-700 shadow-sm">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Orientação</label>
                    <select
                        className="mt-1 block w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        value={formData.simulation?.roofOrientation || 'NORTH'}
                        onChange={(e) => handleSimulationChange('roofOrientation', e.target.value)}
                    >
                        <option value="NORTH">Norte ({((1 - settings.effNorth)*100).toFixed(0)}% perda)</option>
                        <option value="EAST_WEST">Leste/Oeste ({((1 - settings.effEastWest)*100).toFixed(0)}% perda)</option>
                        <option value="OTHER">Sul/Sombreado ({((1 - settings.effSouth)*100).toFixed(0)}% perda)</option>
                    </select>
                </div>

                <div className="md:col-span-2 bg-gray-50 dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700">
                     <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <SunDim size={16} className="text-orange-500" /> Fator de Simultaneidade (Consumo Instantâneo)
                     </label>
                     <div className="flex items-center gap-4">
                         <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            className="w-full h-2 bg-gray-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                            value={formData.simulation?.selfConsumption ?? 30}
                            onChange={(e) => handleSimulationChange('selfConsumption', Number(e.target.value))}
                         />
                         <span className="text-lg font-bold text-blue-600 dark:text-blue-400 w-12 text-right">
                             {formData.simulation?.selfConsumption ?? 30}%
                         </span>
                     </div>
                     <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-1">
                         Ajuste conforme o perfil do cliente. Quanto maior o consumo instantâneo, menor a taxa de Fio B e ICMS paga.
                         {formData.simulation?.hasSharedGeneration && <strong> (Aplica-se apenas à Unidade Geradora)</strong>}
                     </p>
                </div>

                <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded border border-indigo-200 dark:border-indigo-800">
                     <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="checkbox" 
                            id="hasSharedGeneration"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            checked={formData.simulation?.hasSharedGeneration || false}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                handleSimulationChange('hasSharedGeneration', checked);
                                if (checked && !formData.simulation?.generatingUnit) {
                                    handleSimulationChange('generatingUnit', { type: 'MONO', consumption: 0 });
                                }
                            }}
                        />
                        <label htmlFor="hasSharedGeneration" className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 cursor-pointer">
                            <Share2 size={16} /> Geração Compartilhada (Outras Unidades)
                        </label>
                     </div>

                     {formData.simulation?.hasSharedGeneration && (
                        <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2">
                            


                            {/* Beneficiary Units */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded border border-indigo-100 dark:border-indigo-900">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                                        <Share2 size={16} /> Unidades Beneficiárias (Recebem créditos)
                                    </h4>
                                    <button 
                                        onClick={addBeneficiaryUnit}
                                        className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Adicionar Unidade
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.simulation.beneficiaryUnits?.map((unit, index) => (
                                        <div key={unit.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-slate-700/30 p-2 rounded border border-gray-100 dark:border-slate-700">
                                            <div className="col-span-4">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nome (Ex: Casa Praia)"
                                                    className="w-full p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs"
                                                    value={unit.name}
                                                    onChange={(e) => updateBeneficiaryUnit(unit.id, 'name', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <select 
                                                    className="w-full p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs"
                                                    value={unit.type}
                                                    onChange={(e) => updateBeneficiaryUnit(unit.id, 'type', e.target.value)}
                                                >
                                                    <option value="MONO">Mono</option>
                                                    <option value="BIFASICO">Bifásico</option>
                                                    <option value="TRIFASICO">Trifásico</option>
                                                </select>
                                            </div>
                                            <div className="col-span-3 relative">
                                                <input 
                                                    type="number" 
                                                    placeholder="Consumo"
                                                    className="w-full p-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs pr-8"
                                                    value={unit.consumption}
                                                    onChange={(e) => updateBeneficiaryUnit(unit.id, 'consumption', Number(e.target.value))}
                                                />
                                                <span className="absolute right-1 top-1.5 text-[10px] text-gray-400">kWh</span>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <button 
                                                    onClick={() => removeBeneficiaryUnit(unit.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!formData.simulation.beneficiaryUnits || formData.simulation.beneficiaryUnits.length === 0) && (
                                        <p className="text-xs text-gray-400 dark:text-slate-500 italic text-center py-2">
                                            Nenhuma unidade beneficiária adicionada.
                                        </p>
                                    )}
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-indigo-50 dark:border-indigo-900/50 flex justify-between items-center">
                                    <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Consumo Total do Sistema:</span>
                                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                        {((formData.simulation.generatingUnit?.consumption || 0) + (formData.simulation.beneficiaryUnits?.reduce((acc, curr) => acc + curr.consumption, 0) || 0)).toLocaleString()} kWh
                                    </span>
                                </div>
                            </div>
                        </div>
                     )}
                </div>

                <div className="md:col-span-2">
                    <button 
                        onClick={calculateResults}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors shadow-sm"
                    >
                        Calcular Sistema Sugerido
                    </button>
                </div>
            </div>
        </div>
        
        {formData.simulation && formData.simulation.systemSize > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
                    <Grid size={18} /> Definição do Gerador (Módulos)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border border-orange-100 dark:border-orange-900/50 opacity-75">
                         <span className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Necessidade Teórica</span>
                         <div className="flex items-baseline gap-1 mt-1">
                             <span className="text-xl font-bold text-gray-700 dark:text-slate-200">{idealSystemSize > 0 ? idealSystemSize : '-'}</span>
                             <span className="text-sm text-gray-500 dark:text-slate-400">kWp</span>
                         </div>
                         <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 leading-tight">Potência exata para zerar consumo.</p>
                    </div>

                    <div className="space-y-3">
                         <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Modelo do Módulo</label>
                            <select
                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-medium text-sm"
                                value={selectedModuleId}
                                onChange={(e) => handleModuleSelect(e.target.value)}
                            >
                                <option value="">Selecione um módulo...</option>
                                {equipmentList.filter(e => e.type === 'MODULE').map(mod => (
                                    <option key={mod.id} value={mod.id}>
                                        {mod.manufacturer} {mod.model} ({mod.power}W)
                                    </option>
                                ))}
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Quantidade de Placas</label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handlePanelCountChange(panelCount - 1)}
                                    className="p-2 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
                                    disabled={panelCount <= 1}
                                >-</button>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold text-center"
                                    value={panelCount}
                                    onChange={(e) => handlePanelCountChange(Number(e.target.value))}
                                />
                                <button 
                                    onClick={() => handlePanelCountChange(panelCount + 1)}
                                    className="p-2 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
                                >+</button>
                            </div>
                         </div>
                    </div>

                    <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded border border-green-200 dark:border-green-800 flex flex-col justify-center">
                         <span className="block text-xs font-bold text-green-800 dark:text-green-300 uppercase">Potência Final do Kit</span>
                         <div className="flex items-baseline gap-1">
                             <span className="text-3xl font-bold text-green-700 dark:text-green-300">{formData.simulation.systemSize}</span>
                             <span className="text-sm font-bold text-green-700 dark:text-green-300">kWp</span>
                         </div>
                         <div className="mt-2 text-xs text-green-800 dark:text-green-200 flex items-center gap-1 font-medium">
                            <Zap size={12} /> Geração: {formData.simulation.estimatedGeneration} kWh/mês
                         </div>
                    </div>
                </div>
            </div>
        )}
        
        <div className="flex justify-between pt-4">
            <button 
                onClick={() => setActiveTab('INFO')}
                className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white px-4 py-2 flex items-center gap-2"
            >
                <ArrowLeft size={18} /> Voltar
            </button>
            <button 
                onClick={() => setActiveTab('KIT')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                Próximo: Kit do Sistema <ArrowRight size={18} />
            </button>
        </div>
    </div>
  );

  const renderKit = () => (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Package className="text-blue-600" /> Definição do Kit (Inversores)
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Selecione o inversor adequado para a potência do sistema ({formData.simulation?.systemSize} kWp).
                </p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                 <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Modelo do Inversor</label>
                     <select
                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        value={selectedInverterId}
                        onChange={(e) => handleInverterSelect(e.target.value)}
                     >
                        <option value="">Selecione um inversor...</option>
                        {equipmentList.filter(e => e.type === 'INVERTER').map(inv => (
                            <option key={inv.id} value={inv.id}>
                                {inv.manufacturer} {inv.model} ({inv.power} kW) - {inv.inverterPhase}
                            </option>
                        ))}
                     </select>
                 </div>
                 <div className="flex gap-2">
                     <div className="flex-1">
                         <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Quantidade</label>
                         <input 
                            type="number" 
                            min="1"
                            className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            value={inverterQty}
                            onChange={(e) => handleInverterQtyChange(Number(e.target.value))}
                         />
                     </div>
                     <button 
                        onClick={handleAddInverterToKit}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors h-[42px]"
                     >
                        Adicionar
                     </button>
                 </div>
             </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 font-semibold border-b dark:border-slate-700">
                    <tr>
                        <th className="p-3 w-20 text-center">Qtd.</th>
                        <th className="p-3">Item</th>
                        <th className="p-3 w-32">Tipo</th>
                        <th className="p-3 w-16 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {(!formData.simulation?.kitItems || formData.simulation.kitItems.length === 0) ? (
                        <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-slate-400 italic">
                                Nenhum item selecionado.
                            </td>
                        </tr>
                    ) : (
                        formData.simulation.kitItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="p-3 text-center font-bold">{item.quantity}</td>
                                <td className="p-3 font-medium text-gray-800 dark:text-white">{item.name}</td>
                                <td className="p-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        item.type === 'MODULE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                        item.type === 'INVERTER' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                        'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}>
                                        {item.type === 'MODULE' ? 'MÓDULO' : item.type === 'INVERTER' ? 'INVERSOR' : item.type}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <button 
                                        onClick={() => removeKitItem(item.id)}
                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-bold text-green-800 dark:text-green-300 mb-4 flex items-center gap-2">
                <DollarSign size={20} /> Fechamento Comercial
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Preço Final do Sistema (R$)</label>
                    <input 
                        type="number" 
                        className="w-full p-3 text-lg font-bold text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded bg-white dark:bg-slate-800 focus:ring-2 focus:ring-green-500"
                        value={formData.simulation?.totalPrice || ''}
                        onChange={(e) => updatePriceAndPayback(Number(e.target.value))}
                        placeholder="0,00"
                    />
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Valor total a ser apresentado na proposta.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payback Estimado (Anos)</label>
                    <div className="w-full p-3 text-lg font-bold text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded bg-gray-100 dark:bg-slate-700">
                        {formData.simulation?.payback || 0} anos
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Condições de Pagamento</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        value={formData.simulation?.conditions || ''}
                        onChange={(e) => handleSimulationChange('conditions', e.target.value)}
                        placeholder="Ex: 30% Entrada + 12x Sem Juros ou Financiamento BV em até 60x"
                    />
                </div>
            </div>
        </div>

        <div className="flex justify-between pt-4">
            <button 
                onClick={() => setActiveTab('CALCULATOR')}
                className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white px-4 py-2 flex items-center gap-2"
            >
                <ArrowLeft size={18} /> Voltar
            </button>
            <button 
                onClick={() => setActiveTab('FINANCIAL')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                Próximo: Análise Financeira <ArrowRight size={18} />
            </button>
        </div>
    </div>
  );

  const renderFinancial = () => {
    // Calculate current monthly bills for display
    let currentMonthlyBill = 0;
    let newMonthlyBill = 0;
    
    if (formData.simulation) {
        const { estimatedGeneration, tariff, selfConsumption, tusd, hasSharedGeneration, generatingUnit, beneficiaryUnits } = formData.simulation;
        const effectiveFioBPercentage = settings.fioBPercentage;
        const effectiveIcmsPercentage = settings.icmsOnTusd ? (settings.icmsTaxPercentage || 0) : 0;
        
        const result = calculateSavings(
            estimatedGeneration, 
            tariff, 
            selfConsumption, 
            effectiveFioBPercentage, 
            tusd || 0,
            effectiveIcmsPercentage,
            hasSharedGeneration ? generatingUnit : undefined,
            hasSharedGeneration ? beneficiaryUnits : undefined
        );
        
        currentMonthlyBill = result.billWithoutSolar;
        newMonthlyBill = result.billWithSolar;
    }

    return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="text-blue-600" /> Viabilidade Financeira (25 Anos)
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Fluxo de caixa acumulado considerando inflação energética ({settings.energyInflation}%) e degradação ({((1 - 0.9945)*100).toFixed(2)}%).
                </p>
            </div>
            
            <button 
                onClick={() => { 
                    if (formData.status === LeadStatus.NEW || formData.status === LeadStatus.QUALIFICATION || formData.status === LeadStatus.SIZING) {
                        const updatedLead = {
                            ...formData,
                            status: LeadStatus.PROPOSAL_SENT,
                            updatedAt: new Date().toISOString()
                        };
                        setFormData(updatedLead);
                        saveLead(updatedLead);
                    } else {
                        handleSave(true);
                    }
                    setActiveTab('PROPOSAL'); 
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
            >
                Próximo: Gerar Proposta <ArrowRight size={20} />
            </button>
        </div>

        {/* Bill Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center">
                <h4 className="text-gray-500 dark:text-slate-400 font-medium mb-2 uppercase text-sm">Conta Atual (Sem Solar)</h4>
                <div className="text-3xl font-bold text-gray-800 dark:text-white">
                    {currentMonthlyBill.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
                <p className="text-xs text-gray-400 mt-1">Média mensal estimada</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-green-200 dark:border-green-900 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    ECONOMIA DE {currentMonthlyBill > 0 ? ((1 - (newMonthlyBill/currentMonthlyBill)) * 100).toFixed(0) : 0}%
                </div>
                <h4 className="text-green-600 dark:text-green-400 font-medium mb-2 uppercase text-sm">Nova Conta (Com Solar)</h4>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {newMonthlyBill.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
                <p className="text-xs text-green-500/70 mt-1">Média mensal estimada (Taxas + Consumo rede)</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 h-80">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis tickFormatter={(val) => `R$ ${val/1000}k`} />
                    <Tooltip 
                        formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                        labelStyle={{ color: '#374151' }}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    <Bar dataKey="investment" name="Investimento" fill="#ef4444" barSize={20} />
                    <Bar dataKey="accumulated" name="Fluxo Acumulado" fill="#3b82f6" barSize={20} />
                    <Line type="monotone" dataKey="savings" name="Economia Anual" stroke="#22c55e" strokeWidth={3} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
             <div className="overflow-x-auto">
                 <table className="w-full text-xs text-right">
                     <thead className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-semibold">
                         <tr>
                             <th className="p-2 text-center">Ano</th>
                             <th className="p-2">Tarifa (R$)</th>
                             <th className="p-2">Geração (kWh)</th>
                             <th className="p-2 text-red-500">Fio B (R$)</th>
                             <th className="p-2 text-green-600">Economia (R$)</th>
                             <th className="p-2 text-blue-600">Acumulado (R$)</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                         {formData.simulation?.financialProjection?.map((row) => (
                             <tr key={row.year} className="hover:bg-gray-50 dark:hover:bg-slate-750">
                                 <td className="p-2 text-center font-medium">{row.calendarYear}</td>
                                 <td className="p-2 text-gray-500">{row.tariff.toFixed(2)}</td>
                                 <td className="p-2 text-gray-500">{row.generation.toLocaleString()}</td>
                                 <td className="p-2 text-red-500">-{row.fioBCost.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                 <td className="p-2 font-bold text-green-600">{row.savings.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                 <td className={`p-2 font-bold ${row.accumulatedSavings - (formData.simulation?.totalPrice || 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                     {(row.accumulatedSavings - (formData.simulation?.totalPrice || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
        
        <div className="flex justify-between pt-4">
             <button 
                onClick={() => setActiveTab('KIT')}
                className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white px-4 py-2 flex items-center gap-2"
            >
                <ArrowLeft size={18} /> Voltar
            </button>
            <button 
                onClick={() => setActiveTab('PROPOSAL')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                Próximo: Proposta <ArrowRight size={18} />
            </button>
        </div>
    </div>
  );
  };



  const handlePrint = () => {
      window.print();
  };

  // Helper to convert hex to rgba for backgrounds
  const hexToRgba = (hex: string, alpha: number) => {
      let c: any;
      if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
          c= hex.substring(1).split('');
          if(c.length== 3){
              c= [c[0], c[0], c[1], c[1], c[2], c[2]];
          }
          c= '0x'+c.join('');
          return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
      }
      return hex;
  };

  const renderSimpleProposal = () => {
      const sim = formData.simulation;
      if (!sim) return <div className="p-8 text-center text-gray-500">Simulação não encontrada. Complete as etapas anteriores.</div>;

      const autonomy = sim.avgConsumption > 0 ? (sim.estimatedGeneration / sim.avgConsumption) * 100 : 0;
      
      // Calculate minArea based on module dimensions if available
      const moduleItem = sim.kitItems.find(item => item.type === 'MODULE');
      let moduleArea = 2; // Default 2m²
      if (moduleItem) {
          const equipment = equipmentList.find(e => e.id === moduleItem.equipmentId);
          if (equipment && equipment.width && equipment.height) {
              moduleArea = (equipment.width * equipment.height) / 1000000; // mm² to m²
          }
      }
      const minArea = (panelCount * moduleArea).toFixed(1);
      
      const savings25Years = sim.financialProjection 
          ? sim.financialProjection.reduce((acc, curr) => acc + curr.savings, 0) 
          : sim.estimatedSavings * 12 * 25;

      const { estimatedGeneration, tariff, selfConsumption, tusd, hasSharedGeneration, generatingUnit, beneficiaryUnits } = sim;
      const effectiveFioBPercentage = settings.fioBPercentage;
      const effectiveIcmsPercentage = settings.icmsOnTusd ? (settings.icmsTaxPercentage || 0) : 0;
      
      const result = calculateSavings(
          estimatedGeneration, 
          tariff, 
          selfConsumption, 
          effectiveFioBPercentage, 
          tusd || 0,
          effectiveIcmsPercentage,
          hasSharedGeneration ? generatingUnit : undefined,
          hasSharedGeneration ? beneficiaryUnits : undefined
      );

      const billWithSolar = result.billWithSolar;

      // Theme Colors
      const primaryColor = settings.primaryColor || '#1e3a8a'; // Default Blue-900
      const lightBg = hexToRgba(primaryColor, 0.05);
      const lightBorder = hexToRgba(primaryColor, 0.2);

      return (
          <div className="animate-in fade-in pb-10">
              <style>
                  {`
                      @media print {
                          @page {
                              size: A4;
                              margin: 0;
                          }
                          
                          /* Reset all animations and transforms to ensure fixed/absolute positioning works relative to viewport */
                          *, *::before, *::after {
                              animation: none !important;
                              transition: none !important;
                              transform: none !important;
                          }

                          body {
                              visibility: hidden;
                              background: white;
                              overflow: visible !important;
                              height: auto !important;
                          }

                          /* Hide everything by default */
                          body * {
                              visibility: hidden;
                          }

                          /* Show only the printable area */
                          #printable-proposal, #printable-proposal * {
                              visibility: visible !important;
                          }

                          #printable-proposal {
                              position: absolute !important;
                              left: 0 !important;
                              top: 0 !important;
                              width: 210mm !important;
                              min-height: 297mm !important;
                              margin: 0 !important;
                              padding: 10mm !important;
                              background: white !important;
                              z-index: 99999 !important;
                              box-shadow: none !important;
                              border: none !important;
                          }

                          .no-print {
                              display: none !important;
                          }

                          .proposal-scale-wrapper {
                              transform: none !important;
                              height: auto !important;
                              margin: 0 !important;
                              overflow: visible !important;
                              display: block !important;
                          }
                      }
                  `}
              </style>

              <div className="mb-4 flex justify-between items-center no-print">
                  <button 
                      onClick={() => setProposalMode('SELECTION')}
                      className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white px-4 py-2 flex items-center gap-2"
                  >
                      <ArrowLeft size={18} /> Voltar
                  </button>
                  <button 
                      onClick={handlePrint}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium flex items-center gap-2 shadow-sm"
                  >
                      <FileText size={18} /> Imprimir / Salvar PDF
                  </button>
              </div>

              <div className="w-full flex justify-center pb-8 overflow-x-hidden">
                  <div 
                      className="proposal-scale-wrapper"
                      style={{ 
                          transform: `scale(${scale})`, 
                          transformOrigin: 'top center',
                          height: proposalHeight ? `${proposalHeight * scale + 50}px` : 'auto'
                      }}
                  >
                      <div 
                          ref={proposalRef}
                          id="printable-proposal" 
                          className="bg-white text-gray-900 p-8 w-[210mm] min-w-[210mm] mx-auto shadow-lg min-h-[297mm] relative flex flex-col print:shadow-none print:w-full print:max-w-none print:mx-0 print:transform-none"
                      >
                          {/* Header */}
                  <div className="flex items-center border-b-2 pb-6 mb-8" style={{ borderColor: primaryColor }}>
                      <div className="flex-1 flex justify-start">
                          {settings.logoUrl ? (
                              <img src={settings.logoUrl} alt="Logo" className="h-20 object-contain" />
                          ) : (
                              <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{settings.companyName}</h1>
                          )}
                      </div>
                      <div className="text-center px-4">
                          <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-800 mb-1">Proposta Comercial</h2>
                          <p className="text-lg font-medium text-gray-700">{formData.name}</p>
                          <p className="text-sm text-gray-500">{sim.city} - {sim.uf}</p>
                      </div>
                      <div className="flex-1"></div>
                  </div>

                  {/* Project Details */}
                  <div className="mb-8">
                      <h3 className="text-lg font-bold mb-3 border-b border-gray-200 pb-1 uppercase tracking-wider text-sm" style={{ color: primaryColor }}>Detalhes do Projeto</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 font-medium text-gray-600">Potência Instalada Total</td>
                                    <td className="py-2 font-bold text-right text-gray-900">{sim.systemSize} kWp</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 font-medium text-gray-600">Produção Média Mensal</td>
                                    <td className="py-2 font-bold text-right text-gray-900">{sim.estimatedGeneration} kWh</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 font-medium text-gray-600">Consumo Médio Mensal</td>
                                    <td className="py-2 font-bold text-right text-gray-900">{sim.avgConsumption} kWh</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 font-medium text-gray-600">Quantidade de Módulos</td>
                                    <td className="py-2 font-bold text-right text-gray-900">{panelCount}</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 font-medium text-gray-600">Área Mínima Necessária</td>
                                    <td className="py-2 font-bold text-right text-gray-900">~{minArea} m²</td>
                                </tr>
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 font-medium text-gray-600">Tarifa de Energia</td>
                                    <td className="py-2 font-bold text-right text-gray-900">R$ {sim.tariff.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-medium text-gray-600">Autonomia</td>
                                    <td className="py-2 font-bold text-right text-gray-900">{autonomy.toFixed(0)}%</td>
                                </tr>
                            </tbody>
                        </table>
                      </div>
                  </div>

                  {/* System Composition */}
                  <div className="mb-8">
                      <h3 className="text-lg font-bold mb-3 border-b border-gray-200 pb-1 uppercase tracking-wider text-sm" style={{ color: primaryColor }}>Composição do Sistema</h3>
                      <table className="w-full text-sm border-collapse">
                          <thead>
                              <tr className="bg-gray-100 text-left">
                                  <th className="py-2 px-3 font-bold text-gray-700 rounded-tl-md">Produtos / Serviços</th>
                                  <th className="py-2 px-3 font-bold text-gray-700 text-right rounded-tr-md">Quantidade</th>
                              </tr>
                          </thead>
                          <tbody>
                              {sim.kitItems.map((item, idx) => (
                                  <tr key={idx} className="border-b border-gray-100">
                                      <td className="py-2 px-3 text-gray-800">{item.name}</td>
                                      <td className="py-2 px-3 text-right font-medium text-gray-900">{item.quantity}</td>
                                  </tr>
                              ))}
                              <tr className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-600">Estrutura e Materiais Elétricos</td>
                                  <td className="py-2 px-3 text-right text-gray-600 italic">Incluso</td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-600">Projeto de Engenharia e Homologação</td>
                                  <td className="py-2 px-3 text-right text-gray-600 italic">Incluso</td>
                              </tr>
                              <tr className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-gray-600">Serviço de Instalação</td>
                                  <td className="py-2 px-3 text-right text-gray-600 italic">Incluso</td>
                              </tr>
                              <tr>
                                  <td className="py-2 px-3 text-gray-600">Garantias</td>
                                  <td className="py-2 px-3 text-right text-gray-600 italic">Incluso</td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

                  {/* Financial Analysis */}
                  <div className="mb-8">
                      <h3 className="text-lg font-bold mb-3 border-b border-gray-200 pb-1 uppercase tracking-wider text-sm" style={{ color: primaryColor }}>Análise Financeira</h3>
                      <div className="rounded-lg p-4 border" style={{ backgroundColor: lightBg, borderColor: lightBorder }}>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b" style={{ borderColor: lightBorder }}>
                                    <td className="py-2 font-medium text-gray-700">Economia em 25 Anos</td>
                                    <td className="py-2 font-bold text-right text-green-700 text-lg">
                                        {savings25Years.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </td>
                                </tr>
                                <tr className="border-b" style={{ borderColor: lightBorder }}>
                                    <td className="py-2 font-medium text-gray-700">Economia Mensal Média</td>
                                    <td className="py-2 font-bold text-right text-green-700">
                                        {sim.estimatedSavings.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </td>
                                </tr>
                                <tr className="border-b" style={{ borderColor: lightBorder }}>
                                    <td className="py-2 font-medium text-gray-700">Previsão de Conta (Após Instalação)</td>
                                    <td className="py-2 font-bold text-right text-gray-900">
                                        {billWithSolar.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </td>
                                </tr>
                                <tr className="border-b" style={{ borderColor: lightBorder }}>
                                    <td className="py-2 font-medium text-gray-700">Retorno do Investimento (Payback)</td>
                                    <td className="py-2 font-bold text-right text-gray-900">{sim.payback} Anos</td>
                                </tr>
                                <tr>
                                    <td className="py-3 font-bold text-gray-800 text-base">Valor do Investimento</td>
                                    <td className="py-3 font-bold text-right text-xl" style={{ color: primaryColor }}>
                                        {sim.totalPrice.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                      </div>
                      
                      {sim.conditions && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-gray-700">
                              <span className="font-bold block mb-1 text-yellow-800">Observações / Condições:</span>
                              {sim.conditions}
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-8 border-t border-gray-300 text-center text-xs text-gray-500">
                      <p className="font-bold text-gray-700 text-sm mb-1">{settings.companyName}</p>
                      {settings.companyCnpj && <p className="mb-1">CNPJ: {settings.companyCnpj}</p>}
                      <p>{settings.contactEmail} • {settings.contactPhone}</p>
                      <div className="flex justify-center gap-4 mt-1">
                        {settings.website && <p>{settings.website}</p>}
                        {settings.socialInstagram && <p>Instagram: {settings.socialInstagram}</p>}
                      </div>
                      <p className="mt-4 text-[10px] text-gray-400 font-bold">
                          Proposta válida até {(() => {
                              const date = new Date();
                              date.setDate(date.getDate() + (settings.proposalValidityDays || 5));
                              return date.toLocaleDateString('pt-BR');
                          })()}. Gerado em {new Date().toLocaleDateString('pt-BR')}.
                      </p>
                  </div>
                  </div>
              </div>
          </div>
          </div>
      );
  };

  const renderCompleteProposal = () => {
      const sim = formData.simulation;
      if (!sim) return <div className="p-8 text-center text-gray-500">Simulação não encontrada.</div>;

      // Recalculate necessary values
      const { estimatedGeneration, tariff, selfConsumption, tusd, hasSharedGeneration, generatingUnit, beneficiaryUnits } = sim;
      const effectiveFioBPercentage = settings.fioBPercentage;
      const effectiveIcmsPercentage = settings.icmsOnTusd ? (settings.icmsTaxPercentage || 0) : 0;
      
      const result = calculateSavings(
          estimatedGeneration, 
          tariff, 
          selfConsumption, 
          effectiveFioBPercentage, 
          tusd || 0,
          effectiveIcmsPercentage,
          hasSharedGeneration ? generatingUnit : undefined,
          hasSharedGeneration ? beneficiaryUnits : undefined
      );

      const billWithSolar = result.billWithSolar;
      const savings25Years = sim.financialProjection 
          ? sim.financialProjection.reduce((acc, curr) => acc + curr.savings, 0) 
          : sim.estimatedSavings * 12 * 25;
      
      const autonomy = sim.avgConsumption > 0 ? (sim.estimatedGeneration / sim.avgConsumption) * 100 : 0;
      const minArea = panelCount * 2;

      // Colors
      const primaryColor = settings.primaryColor || '#1e3a8a';
      
      return (
        <div className="animate-in fade-in pb-20 bg-gray-100 dark:bg-slate-900 min-h-screen">
            {/* Print Styles */}
            <style>
                {`
                    @media print {
                        @page { size: A4; margin: 0; }
                        body { 
                            visibility: hidden; 
                            background: white; 
                            margin: 0;
                            padding: 0;
                        }
                        
                        /* Reset wrapper styles completely */
                        .proposal-scale-wrapper {
                            transform: none !important;
                            height: auto !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            overflow: visible !important;
                            display: block !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                        }

                        #complete-proposal { 
                            visibility: visible !important; 
                            position: relative !important; 
                            left: 0 !important; 
                            top: 0 !important; 
                            width: 210mm !important; 
                            margin: 0 !important;
                            padding: 0 !important;
                            transform: none !important;
                            box-shadow: none !important;
                        }
                        
                        #complete-proposal * { 
                            visibility: visible !important; 
                        }
                        
                        .no-print { display: none !important; }
                        .page-break { page-break-before: always; }
                        
                        /* Ensure background colors and images are printed */
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                `}
            </style>

            {/* Toolbar */}
            <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-800 shadow-md p-4 z-50 flex justify-between items-center no-print">
                 <button 
                    onClick={() => setProposalMode('SELECTION')}
                    className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white px-4 py-2 flex items-center gap-2"
                 >
                    <ArrowLeft size={18} /> Voltar
                 </button>
                 <button 
                    onClick={handlePrint}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium flex items-center gap-2 shadow-sm"
                 >
                    <FileText size={18} /> Imprimir PDF
                 </button>
            </div>

            <div className="w-full flex justify-center pb-8 overflow-x-hidden">
                <div 
                    className="proposal-scale-wrapper"
                    style={{ 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'top center',
                        height: proposalHeight ? `${proposalHeight * scale + 50}px` : 'auto'
                    }}
                >
                    <div 
                        ref={proposalRef}
                        id="complete-proposal" 
                        className="bg-white text-gray-900 mx-auto w-[210mm] min-w-[210mm] shadow-2xl mt-20 print:mt-0 print:shadow-none font-sans print:w-full print:max-w-none print:mx-0 print:transform-none"
                    >
                
                {/* 1. CAPA */}
                <div className="h-[297mm] relative flex flex-col justify-between p-12 text-white overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent z-10"></div>
                        <div className="absolute inset-0 opacity-60 z-0" style={{ backgroundColor: primaryColor, mixBlendMode: 'multiply' }}></div>
                        <img src="https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop" className="w-full h-full object-cover" alt="Solar Background" />
                    </div>
                    
                    <div className="relative z-20">
                        {settings.logoUrl && <img src={settings.logoUrl} className="h-48 object-contain bg-white/95 p-4 rounded-lg mb-8 shadow-lg" alt="Logo" />}
                        <h1 className="text-6xl font-bold uppercase tracking-tight mb-4 leading-tight">Proposta<br/>Comercial</h1>
                        <div className="h-2 w-32 bg-yellow-400 mb-8"></div>
                        <p className="text-xl opacity-90 font-light tracking-wide">Solução Completa em Energia Solar Fotovoltaica</p>
                    </div>
                    
                    <div className="relative z-20 border-l-4 border-yellow-400 pl-8 mb-12">
                        <h2 className="text-4xl font-bold mb-2">{formData.name}</h2>
                        <p className="text-xl opacity-90">{sim.city} - {sim.uf}</p>
                        <p className="text-sm mt-6 opacity-70 uppercase tracking-widest">
                            Validade: {(() => {
                                const date = new Date();
                                date.setDate(date.getDate() + (settings.proposalValidityDays || 5));
                                return date.toLocaleDateString('pt-BR');
                            })()}
                            {formData.userId && users && (
                                <span className="ml-4">
                                    Consultor: {users.find(u => u.id === formData.userId)?.name}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* 2. QUEM SOMOS & 3. COMO FUNCIONA */}
                <div className="h-[297mm] p-16 flex flex-col page-break bg-white">
                    {/* Header Small */}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-12">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Apresentação</span>
                        <span className="font-bold text-lg" style={{color: primaryColor}}>{settings.companyName}</span>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-3xl font-bold mb-6 flex items-center gap-3" style={{color: primaryColor}}>
                            <Building2 size={32} /> Quem Somos
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-justify text-base">
                            {settings.aboutUs || "Somos uma empresa especializada em soluções de energia solar, comprometida em levar economia e sustentabilidade para nossos clientes. Com uma equipe técnica altamente qualificada, garantimos a excelência desde o projeto até a instalação e homologação do seu sistema fotovoltaico, proporcionando segurança e eficiência energética por décadas."}
                        </p>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-3xl font-bold mb-6 flex items-center gap-3" style={{color: primaryColor}}>
                            <SunDim size={32} /> Como Funciona
                        </h3>
                        
                        <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border border-gray-100 w-4/5 mx-auto">
                            {/* Diagrama de Funcionamento Solar - Imagem enviada pelo usuário */}
                            <img 
                                src={solarDiagram} 
                                alt="Diagrama de Funcionamento Solar: 1. Painel Solar, 2. Inversor, 3. Consumo, 4. Rede Elétrica" 
                                className="w-full h-auto object-contain bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-lg flex-shrink-0">1</div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">Captação</h4>
                                    <p className="text-sm text-gray-600">Os painéis solares captam a luz do sol e geram energia em corrente contínua.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">2</div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">Conversão</h4>
                                    <p className="text-sm text-gray-600">O inversor converte a energia para corrente alternada, pronta para uso.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-lg flex-shrink-0">3</div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">Consumo Instantâneo</h4>
                                    <p className="text-sm text-gray-600">A energia é usada na hora pelos seus equipamentos elétricos.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg flex-shrink-0">4</div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">Energia Injetada na Rede</h4>
                                    <p className="text-sm text-gray-600">O excedente vai para a rede e vira créditos para abater o consumo futuro.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. VANTAGENS & 5. PASSO A PASSO */}
                <div className="h-[297mm] p-16 flex flex-col page-break bg-white">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-12">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Benefícios e Processo</span>
                        <span className="font-bold text-lg" style={{color: primaryColor}}>{settings.companyName}</span>
                    </div>

                    <div className="mb-16">
                        <h3 className="text-3xl font-bold mb-10" style={{color: primaryColor}}>Por que investir?</h3>
                        <div className="grid grid-cols-4 gap-6 text-center">
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="w-16 h-16 mx-auto bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4"><DollarSign size={32}/></div>
                                <h4 className="font-bold mb-2 text-gray-800">Economia</h4>
                                <p className="text-sm text-gray-500">Reduza sua conta de luz imediatamente.</p>
                            </div>
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4"><Home size={32}/></div>
                                <h4 className="font-bold mb-2 text-gray-800">Valorização</h4>
                                <p className="text-sm text-gray-500">Seu imóvel vale mais com energia solar instalada.</p>
                            </div>
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="w-16 h-16 mx-auto bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-4"><SunDim size={32}/></div>
                                <h4 className="font-bold mb-2 text-gray-800">Sustentável</h4>
                                <p className="text-sm text-gray-500">Energia 100% limpa e renovável para o planeta.</p>
                            </div>
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                                <div className="w-16 h-16 mx-auto bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4"><CheckCircle size={32}/></div>
                                <h4 className="font-bold mb-2 text-gray-800">Durabilidade</h4>
                                <p className="text-sm text-gray-500">Equipamentos com vida útil superior a 25 anos.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-3xl font-bold mb-10" style={{color: primaryColor}}>Etapas do Projeto</h3>
                        <div className="space-y-8 relative border-l-4 border-gray-100 ml-6 py-2">
                            {[
                                { title: "Visita Técnica", desc: "Análise do local, telhado e infraestrutura elétrica." },
                                { title: "Projeto de Engenharia", desc: "Dimensionamento detalhado e emissão de ART." },
                                { title: "Homologação", desc: "Solicitação de acesso junto à concessionária de energia." },
                                { title: "Instalação", desc: "Montagem, fixação e conexão dos equipamentos por equipe qualificada." },
                                { title: "Vistoria e Troca do Medidor", desc: "Aprovação final da concessionária e troca do relógio." },
                                { title: "Ativação", desc: "Seu sistema começa a gerar economia imediatamente." }
                            ].map((step, i) => (
                                <div key={i} className="pl-10 relative">
                                    <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-white border-4" style={{borderColor: primaryColor}}></div>
                                    <h4 className="font-bold text-base text-gray-800">{step.title}</h4>
                                    <p className="text-sm text-gray-500">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. DETALHAMENTO & 7. COMPONENTES */}
                <div className="h-[297mm] p-16 flex flex-col page-break bg-white">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-8">
                        <h3 className="text-3xl font-bold" style={{color: primaryColor}}>Especificações Técnicas</h3>
                        <span className="font-bold text-lg" style={{color: primaryColor}}>{settings.companyName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="font-bold mb-4 text-lg border-b pb-3 text-gray-800">Resumo do Sistema</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Potência Total:</span> <span className="font-bold text-sm whitespace-nowrap">{sim.systemSize} kWp</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Geração Estimada:</span> <span className="font-bold text-sm whitespace-nowrap">{sim.estimatedGeneration} kWh/mês</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Área Necessária:</span> <span className="font-bold text-sm whitespace-nowrap">~{minArea} m²</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Módulos:</span> <span className="font-bold text-sm whitespace-nowrap">{panelCount} unidades</span></div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="font-bold mb-4 text-lg border-b pb-3 text-gray-800">Dados de Consumo</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Consumo Médio:</span> <span className="font-bold text-sm whitespace-nowrap">{sim.avgConsumption} kWh</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Tarifa Atual:</span> <span className="font-bold text-sm whitespace-nowrap">R$ {sim.tariff.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Autonomia:</span> <span className="font-bold text-sm whitespace-nowrap">{autonomy.toFixed(0)}%</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600 whitespace-nowrap">Cidade:</span> <span className="font-bold text-sm whitespace-nowrap">{sim.city}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-6" style={{color: primaryColor}}>Lista de Materiais (Kit Fotovoltaico)</h3>
                        <div className="border rounded-xl overflow-hidden mb-10">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="p-4 text-left font-bold uppercase text-xs tracking-wider">Item / Equipamento</th>
                                        <th className="p-4 text-right font-bold uppercase text-xs tracking-wider">Quantidade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sim.kitItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="p-4 text-gray-800 font-medium">{item.name}</td>
                                            <td className="p-4 text-right font-bold text-gray-900">{item.quantity}</td>
                                        </tr>
                                    ))}
                                    <tr className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800 font-medium">Estrutura de Fixação</td>
                                        <td className="p-4 text-right font-bold text-gray-900">Incluso</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800 font-medium">Material Elétrico</td>
                                        <td className="p-4 text-right font-bold text-gray-900">Incluso</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <h3 className="text-2xl font-bold mb-6" style={{color: primaryColor}}>Serviços Inclusos</h3>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            {['Projeto de Engenharia', 'Homologação na Concessionária', 'Instalação Técnica Especializada', 'Configuração do Monitoramento Wi-Fi', 'Suporte Técnico Pós-Venda', 'Garantia de Instalação'].map(s => (
                                <div key={s} className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                                    <CheckCircle size={20} className="text-green-500 flex-shrink-0" /> 
                                    <span className="font-medium">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 8. FINANCEIRO & 9. GRÁFICO */}
                <div className="h-[297mm] p-16 flex flex-col page-break bg-white">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-12">
                        <h3 className="text-3xl font-bold" style={{color: primaryColor}}>Estudo de Viabilidade</h3>
                        <span className="font-bold text-lg" style={{color: primaryColor}}>{settings.companyName}</span>
                    </div>

                    <div className="space-y-4 mb-12">
                        {/* Row 1: Key Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                <span className="font-bold text-gray-700 text-sm mb-1">Investimento</span>
                                <span className="font-bold text-xl text-gray-900">{sim.totalPrice.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                <span className="font-bold text-gray-700 text-sm mb-1">Economia (25 anos)</span>
                                <span className="font-bold text-xl text-green-600">{savings25Years.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                                <span className="font-bold text-gray-700 text-sm mb-1">Payback Estimado</span>
                                <span className="font-bold text-xl text-blue-600">{sim.payback} Anos</span>
                            </div>
                        </div>

                        {/* Row 2: Bill Comparison */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-gray-700">Conta Atual</span>
                                <span className="font-bold text-xl text-red-600">{result.billWithoutSolar.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden flex justify-between items-center">
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                    ECONOMIA DE {result.billWithoutSolar > 0 ? ((1 - (result.billWithSolar / result.billWithoutSolar)) * 100).toFixed(0) : 0}%
                                </div>
                                <span className="font-bold text-gray-700">Conta com Energia Solar</span>
                                <span className="font-bold text-xl text-green-600 mt-2">{result.billWithSolar.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                            </div>
                        </div>

                        {sim.conditions && (
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <h4 className="font-bold text-yellow-800 mb-1 flex items-center gap-2 text-sm"><DollarSign size={16}/> Condições de Pagamento</h4>
                                <p className="text-gray-700 text-sm">{sim.conditions}</p>
                            </div>
                        )}
                    </div>

                    <div className="mb-10 flex-1">
                        <h3 className="text-2xl font-bold mb-6 text-gray-800">Fluxo de Caixa Acumulado</h3>
                        <div className="h-96 w-full border border-gray-100 rounded-2xl p-6 bg-gray-50">
                             <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis tickFormatter={(val) => `R$${val/1000}k`} tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <ReferenceLine y={0} stroke="#9ca3af" />
                                    <Bar dataKey="accumulated" radius={[4, 4, 0, 0]} barSize={30}>
                                        {cashFlowData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.accumulated < 0 ? '#ef4444' : '#22c55e'} />
                                        ))}
                                    </Bar>
                                    <Line type="monotone" dataKey="accumulated" stroke="#f59e0b" strokeWidth={3} dot={false} />
                                    
                                    {/* Initial Investment */}
                                    <ReferenceDot x="Ano 0" y={-sim.totalPrice} r={4} fill="#ef4444" stroke="none">
                                        <Label value="Investimento" position="bottom" offset={10} style={{fontSize: '10px', fill: '#ef4444', fontWeight: 'bold'}} />
                                    </ReferenceDot>

                                    {/* Payback Point (Approximate) */}
                                    <ReferenceDot x={`Ano ${Math.ceil(sim.payback)}`} y={0} r={4} fill="#3b82f6" stroke="none">
                                        <Label value="Payback" position="top" offset={10} style={{fontSize: '10px', fill: '#3b82f6', fontWeight: 'bold'}} />
                                    </ReferenceDot>

                                    {/* Final Accumulated */}
                                    <ReferenceDot x="Ano 25" y={savings25Years - sim.totalPrice} r={4} fill="#22c55e" stroke="none">
                                        <Label value="Acumulado" position="top" offset={10} style={{fontSize: '10px', fill: '#22c55e', fontWeight: 'bold'}} />
                                    </ReferenceDot>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-center text-gray-400 mt-4">
                            *Considerando inflação energética de {settings.energyInflation}% a.a. e degradação linear dos módulos.
                        </p>
                    </div>
                </div>

                {/* 10. GARANTIAS, 11. LEGAIS, 12. CONTATO, 13. ACEITE */}
                <div className="min-h-[297mm] p-16 flex flex-col page-break bg-white">
                    <div>
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Garantias e Formalização</span>
                            <span className="font-bold text-lg" style={{color: primaryColor}}>{settings.companyName}</span>
                        </div>

                        <div className="mb-4">
                            <h3 className="text-xl font-bold mb-2" style={{color: primaryColor}}>Garantias</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-gray-100 text-gray-700">
                                        <tr>
                                            <th className="p-2 text-left font-bold uppercase text-xs tracking-wider">Item / Equipamento</th>
                                            <th className="p-2 text-right font-bold uppercase text-xs tracking-wider">Garantia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sim.kitItems.filter(i => i.type === 'MODULE').map((item, idx) => {
                                            const eq = equipmentList.find(e => e.id === item.equipmentId);
                                            if (!eq) return null;
                                            return (
                                                <tr key={`mod-${idx}`} className="hover:bg-gray-50">
                                                    <td className="p-2 text-gray-800 font-medium">
                                                        {eq.manufacturer} - {eq.model}
                                                        <span className="block text-xs text-gray-500 font-normal">Garantia de Produto e Performance (Módulo)</span>
                                                    </td>
                                                    <td className="p-2 text-right text-gray-900">
                                                        <div className="font-bold">{eq.warranty || '-'} <span className="font-normal text-xs text-gray-500">(Produto)</span></div>
                                                        <div className="font-bold">{eq.efficiencyWarranty || '-'} <span className="font-normal text-xs text-gray-500">(Performance)</span></div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {sim.kitItems.filter(i => i.type === 'INVERTER').map((item, idx) => {
                                            const eq = equipmentList.find(e => e.id === item.equipmentId);
                                            if (!eq) return null;
                                            return (
                                                <tr key={`inv-${idx}`} className="hover:bg-gray-50">
                                                    <td className="p-2 text-gray-800 font-medium">
                                                        {eq.manufacturer} - {eq.model}
                                                        <span className="block text-xs text-gray-500 font-normal">Garantia de Produto (Inversor)</span>
                                                    </td>
                                                    <td className="p-2 text-right font-bold text-gray-900">{eq.warranty || '-'}</td>
                                                </tr>
                                            );
                                        })}

                                        <tr className="hover:bg-gray-50">
                                            <td className="p-2 text-gray-800 font-medium">
                                                Serviço de Instalação
                                                <span className="block text-xs text-gray-500 font-normal">Garantia Técnica</span>
                                            </td>
                                            <td className="p-2 text-right font-bold text-gray-900">{settings.installationWarranty || '12 Meses'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="text-sm font-bold mb-2 uppercase text-gray-500 tracking-widest">Responsabilidades</h3>
                            <div className="text-xs text-gray-400 text-justify leading-relaxed space-y-2">
                                <p>
                                    A {settings.companyName} realiza o dimensionamento e projeto, fornece os equipamentos, executa a instalação e acompanha o processo junto à distribuidora.
                                </p>
                                <p>
                                    Fora do escopo: reforços estruturais, adequações na rede elétrica do imóvel, troca/ajustes de transformador ou tensão pela distribuidora, licenças/autorizações e segurança/armazenamento de materiais no local.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="border-t-2 border-dashed border-gray-200 pt-4 mb-4">
                            <p className="text-sm text-gray-600 mb-8 text-justify">
                                Declaro que li e concordo com os termos e condições apresentados nesta proposta comercial.
                            </p>
                            <div className="flex justify-between items-end gap-12">
                                <div className="w-1/2">
                                    <div className="border-b border-gray-900 mb-3"></div>
                                    <p className="font-bold text-lg text-gray-900">{formData.name}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Cliente</p>
                                </div>
                                <div className="w-1/2">
                                    <div className="border-b border-gray-900 mb-3"></div>
                                    <p className="font-bold text-lg text-gray-900">{settings.companyName}</p>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Contratada</p>
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-400 mt-8">Aceite realizado em: ____/____/______</p>
                        </div>

                        <div className="mt-auto pt-8 border-t border-gray-100 pb-8">
                            <div className="flex items-center gap-6">
                                {/* Logo */}
                                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100 p-2">
                                    {settings.logoUrl ? (
                                        <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Building2 size={32} className="text-gray-300" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="grid grid-cols-[max-content_max-content] gap-x-12 gap-y-3 mb-4 items-center">
                                        {/* Row 1 */}
                                        <h4 className="font-bold text-xl text-gray-900">{settings.companyName}</h4>
                                        <div className="text-sm text-gray-500">
                                            {settings.companyCnpj && `CNPJ: ${settings.companyCnpj}`}
                                        </div>

                                        {/* Row 2 */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Mail size={16} className="text-blue-600 flex-shrink-0" /> 
                                            {settings.contactEmail}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Phone size={16} className="text-blue-600 flex-shrink-0" /> 
                                            {settings.contactPhone}
                                        </div>

                                        {/* Row 3 */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            {settings.website && (
                                                <>
                                                    <Globe size={16} className="text-blue-600 flex-shrink-0" />
                                                    <span className="font-medium">{settings.website}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            {settings.socialInstagram && (
                                                <>
                                                    <Instagram size={16} className="text-blue-600 flex-shrink-0" />
                                                    <span className="font-medium">@{settings.socialInstagram.replace('@', '')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Line 4: Address */}
                                    {(settings.addressStreet || settings.addressCity) && (
                                        <div className="flex items-start gap-2 text-sm text-gray-500 pt-3 border-t border-gray-100">
                                            <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" /> 
                                            <span>
                                                {settings.addressStreet}{settings.addressNumber ? `, ${settings.addressNumber}` : ''}
                                                {settings.addressCity ? ` - ${settings.addressCity}` : ''}
                                                {settings.addressState ? `/${settings.addressState}` : ''}
                                                {settings.addressZip ? ` - CEP: ${settings.addressZip}` : ''}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Extra spacing */}
                                    <p className="h-4">&nbsp;</p>
                                    <p className="h-4">&nbsp;</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                </div>
            </div>
        </div>
        </div>
      );
  };

  const saveProposalToHistory = () => {
    if (!formData.simulation) return;

    const newHistoryItem: ProposalHistory = {
      id: Date.now().toString(),
      name: `Proposta ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      date: new Date().toISOString(),
      systemSize: formData.simulation.systemSize,
      totalPrice: formData.simulation.totalPrice,
      monthlyProduction: formData.simulation.estimatedGeneration,
      modulesCount: formData.simulation.kitItems.find(k => k.type === 'MODULE')?.quantity || 0,
      inverterCount: formData.simulation.kitItems.find(k => k.type === 'INVERTER')?.quantity || 0,
      payback: formData.simulation.payback
    };

    const updatedHistory = [...(formData.proposalHistory || []), newHistoryItem];
    
    const updatedLead = {
      ...formData,
      proposalHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    setFormData(updatedLead);
    saveLead(updatedLead);
    alert('Proposta salva no histórico com sucesso!');
  };

  const renderProposalHistory = () => {
    if (!formData.proposalHistory || formData.proposalHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <FileBadge size={48} className="mx-auto mb-3 opacity-50" />
          <p>Nenhuma proposta salva no histórico.</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FileBadge size={18} className="text-blue-600" />
                Histórico de Propostas
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full font-bold">
                {formData.proposalHistory.length}
            </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Potência</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Geração</th>
                <th className="px-4 py-3">Payback</th>
              </tr>
            </thead>
            <tbody>
              {formData.proposalHistory.map((history) => (
                <tr key={history.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">{new Date(history.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{history.name}</td>
                  <td className="px-4 py-3">{history.systemSize.toFixed(2)} kWp</td>
                  <td className="px-4 py-3 text-green-600 font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(history.totalPrice)}
                  </td>
                  <td className="px-4 py-3">{Math.round(history.monthlyProduction)} kWh</td>
                  <td className="px-4 py-3">{history.payback.toFixed(1)} Anos</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProposalSelection = () => (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <FileText className="text-blue-600" size={20} /> Resumo do Projeto
                  </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Client Info */}
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Cliente</h4>
                      <p className="font-medium text-gray-800 dark:text-white text-lg">{formData.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                          <MapPin size={16} /> {formData.simulation?.city} - {formData.simulation?.uf}
                      </div>
                  </div>

                  {/* System Info */}
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Sistema</h4>
                      <div className="flex items-baseline gap-2">
                          <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">{formData.simulation?.systemSize} kWp</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-1">
                          <Zap size={14} /> Geração: {formData.simulation?.estimatedGeneration} kWh/mês
                      </div>
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Comercial</h4>
                      <div className="font-bold text-2xl text-green-600 dark:text-green-400">
                          {((formData.simulation?.totalPrice || 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-300">
                          Payback: {formData.simulation?.payback} anos
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
              <div 
                  onClick={() => setProposalMode('SIMPLE')}
                  className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all hover:shadow-md group text-center"
              >
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <FileText size={32} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Modelo Simples</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                      Uma página concisa com os destaques do projeto. Ideal para envio rápido via WhatsApp. Foca no preço e economia.
                  </p>
                  <button className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                      Gerar Modelo Simples <Send size={16} />
                  </button>
              </div>

              <div 
                  onClick={() => setProposalMode('COMPLETE')}
                  className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-500 cursor-pointer transition-all hover:shadow-md group text-center"
              >
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <FileBadge size={32} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Modelo Completo</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                      Documento detalhado incluindo fluxo de caixa ano a ano, gráficos de payback, dados técnicos e glossário.
                  </p>
                  <button className="w-full py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
                      Gerar Modelo Completo <ArrowRight size={16} />
                  </button>
              </div>
          </div>

          <div className="flex justify-center">
              <button
                  onClick={saveProposalToHistory}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-colors"
              >
                  <Save size={20} />
                  Salvar Proposta Atual no Histórico
              </button>
          </div>

          {renderProposalHistory()}
          
          <div className="flex justify-start pt-4">
             <button 
                onClick={() => setActiveTab('FINANCIAL')}
                className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white px-4 py-2 flex items-center gap-2"
            >
                <ArrowLeft size={18} /> Voltar para Financeiro
            </button>
          </div>
      </div>
  );

  const renderProposal = () => {
      if (activeTab !== 'PROPOSAL') return null;

      if (proposalMode === 'SELECTION') {
          return renderProposalSelection();
      } else if (proposalMode === 'SIMPLE') {
          return renderSimpleProposal();
      } else if (proposalMode === 'COMPLETE') {
          return renderCompleteProposal();
      }
      return null;
  };

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
          </button>
          <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {isNew ? 'Novo Projeto' : formData.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                  {isNew ? 'Cadastre um novo lead e dimensione o sistema.' : 'Edite as informações e a proposta.'}
              </p>
          </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
              { id: 'INFO', label: '1. Informações', icon: <UserIcon size={16} /> },
              { id: 'CALCULATOR', label: '2. Dimensionamento', icon: <SunDim size={16} /> },
              { id: 'KIT', label: '3. Kit e Preço', icon: <Package size={16} /> },
              { id: 'FINANCIAL', label: '4. Financeiro', icon: <TrendingUp size={16} /> },
              { id: 'PROPOSAL', label: '5. Proposta', icon: <FileText size={16} /> },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                      activeTab === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
              >
                  {tab.icon} {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'INFO' && renderInfo()}
      {activeTab === 'CALCULATOR' && renderCalculator()}
      {activeTab === 'KIT' && renderKit()}
      {activeTab === 'FINANCIAL' && renderFinancial()}
      {renderProposal()}



      {/* Tariff Modal */}
      {isTariffModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95">
                  <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 dark:text-white">Editar Tarifa</h3>
                      <button onClick={() => setIsTariffModalOpen(false)}><X size={18} className="text-gray-500" /></button>
                  </div>
                  <div className="p-4 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">TE (Energia) - R$/kWh</label>
                          <input 
                              type="number" step="0.0001"
                              className="w-full p-2 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              value={tempTe}
                              onChange={(e) => setTempTe(Number(e.target.value))}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">TUSD (Distribuição) - R$/kWh</label>
                          <input 
                              type="number" step="0.0001"
                              className="w-full p-2 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              value={tempTusd}
                              onChange={(e) => setTempTusd(Number(e.target.value))}
                          />
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded text-center">
                          <span className="text-xs text-gray-500 dark:text-slate-400">Total</span>
                          <div className="text-xl font-bold text-gray-800 dark:text-white">R$ {(tempTe + tempTusd).toFixed(4)}</div>
                      </div>
                      <button 
                          onClick={saveTariff}
                          className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
                      >
                          Aplicar Tarifa
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LeadFlow;