import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Save, ArrowLeft, Image as ImageIcon, Wand2, Plus, Trash2, Tag, Link, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Table } from '@/types/table';
import type { Device } from '@/types/device';
import TableVisualizer from '@/components/TableVisualizer';
import { TestTableVisualizer } from '@/components/TestTableVisualizer';
import { PriceTagAutocomplete } from '@/components/PriceTagAutocomplete';

export default function TableConfiguration() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [planogramFile, setPlanogramFile] = useState<File | null>(null);
  const [planogramUrl, setPlanogramUrl] = useState<string>('');
  const [devices, setDevices] = useState<any[]>([]);
  const [planogramText, setPlanogramText] = useState<string>('');
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceTags, setPriceTags] = useState<any[]>([]);
  const [newPriceTagName, setNewPriceTagName] = useState<string>('');
  const [associateDialogOpen, setAssociateDialogOpen] = useState(false);
  const [selectedPriceTag, setSelectedPriceTag] = useState<any>(null);
  const [selectedDevicesForAssociation, setSelectedDevicesForAssociation] = useState<string[]>([]);
  const [associationMode, setAssociationMode] = useState<{active: boolean, priceTag: any} | null>(null);
  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    if (tableId) {
      fetchTable();
      fetchAvailableDevices();
      fetchPriceTagAssociations();
    }
  }, [tableId]);

  const fetchTable = async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (error) throw error;
      
      setTable(data as Table);
      setDevices(Array.isArray(data.devices) ? data.devices : []);
      setPriceTags(Array.isArray((data as any).price_tags) ? (data as any).price_tags : []);
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (error) {
      console.error('Error fetching table:', error);
      toast.error('Errore nel caricamento del tavolo');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('category, name');

      if (error) throw error;
      setAvailableDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchPriceTagAssociations = async () => {
    if (!tableId) return;
    
    try {
      const { data, error } = await supabase
        .from('price_tag_device_associations')
        .select('*')
        .eq('table_id', tableId);

      if (error) throw error;
      
      // Aggiorna i priceTags con le associazioni caricate
      setPriceTags(prev => prev.map(tag => ({
        ...tag,
        associatedDevices: data
          ?.filter(assoc => assoc.price_tag_name === tag.name)
          .map(assoc => assoc.device_id) || []
      })));
      
    } catch (error) {
      console.error('Error fetching price tag associations:', error);
    }
  };

  const handlePlanogramUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPlanogramFile(file);
      const url = URL.createObjectURL(file);
      setPlanogramUrl(url);
    }
  };

  const parseDevicesFromText = (text: string) => {
    const foundDevices: any[] = [];
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Pattern per identificare i dispositivi Apple
      const devicePatterns = [
        // iPad patterns
        /iPad\s+(mini|Air|Pro)?\s*([A-Z0-9\s]*?)\s*(\w+)\s*\(([\w\d]+)\)/gi,
        /iPad\s+([A-Z0-9\s]*?)\s*(\w+)\s*\(([\w\d]+)\)/gi,
        // iPhone patterns  
        /iPhone\s+([\d\s]*(?:Pro|Plus|Max)?)\s*([a-zA-Z\s]+?)\s*\(([\w\d]+)\)/gi,
        // Apple Watch patterns
        /Apple\s+Watch\s+(SE|Series\s+\d+)?\s*(\d+mm)?\s*([a-zA-Z\s]+?)\s*\(([\w\d]+)\)/gi,
        // AirPods patterns
        /AirPods\s+([a-zA-Z\s]*?)\s*\(([\w\d]+)\)/gi,
        // Mac patterns
        /Mac\s+([a-zA-Z\s]*?)\s*([a-zA-Z\s]+?)\s*\(([\w\d]+)\)/gi
      ];

      for (const pattern of devicePatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          let deviceName = '';
          let color = '';
          let code = '';

          if (line.toLowerCase().includes('ipad')) {
            const model = match[1] ? match[1].trim() : '';
            const specs = match[2] ? match[2].trim() : '';
            color = match[3] || '';
            code = match[4] || '';
            deviceName = `iPad ${model} ${specs}`.trim();
          } else if (line.toLowerCase().includes('iphone')) {
            const model = match[1] ? match[1].trim() : '';
            color = match[2] || '';
            code = match[3] || '';
            deviceName = `iPhone ${model}`.trim();
          } else if (line.toLowerCase().includes('apple watch')) {
            const series = match[1] ? match[1].trim() : '';
            const size = match[2] ? match[2].trim() : '';
            const caseType = match[3] ? match[3].trim() : '';
            code = match[4] || '';
            deviceName = `Apple Watch ${series} ${size}`.trim();
            color = caseType;
          } else if (line.toLowerCase().includes('airpods')) {
            const model = match[1] ? match[1].trim() : '';
            code = match[2] || '';
            deviceName = `AirPods ${model}`.trim();
          } else if (line.toLowerCase().includes('mac')) {
            const model = match[1] ? match[1].trim() : '';
            color = match[2] || '';
            code = match[3] || '';
            deviceName = `Mac ${model}`.trim();
          }

          if (deviceName && !deviceName.toLowerCase().includes('sign')) {
            // Cerca device corrispondente nel database
            const matchingDevice = availableDevices.find(device => {
              const deviceFullName = device.color 
                ? `${device.name} (${device.color})`
                : device.name;
              
              return deviceFullName.toLowerCase().includes(deviceName.toLowerCase()) ||
                     device.name.toLowerCase().includes(deviceName.toLowerCase()) ||
                     (device.model && device.model.toLowerCase().includes(deviceName.toLowerCase()));
            });

            foundDevices.push({
              name: matchingDevice ? matchingDevice.name : deviceName,
              type: matchingDevice?.category || getDeviceTypeFromName(deviceName),
              color: color || matchingDevice?.color || '',
              quantity: 1,
              position: { x: 100 + foundDevices.length * 20, y: 100 + foundDevices.length * 20 },
              code: code,
              deviceId: matchingDevice?.id || null
            });
          }
        }
      }
    }

    return foundDevices;
  };

  const getDeviceTypeFromName = (name: string): string => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('ipad')) return 'iPad';
    if (nameLower.includes('iphone')) return 'iPhone';
    if (nameLower.includes('watch')) return 'Watch';
    if (nameLower.includes('mac')) return 'Mac';
    if (nameLower.includes('airpods')) return 'Accessori';
    return 'Accessori';
  };

  const analyzePlanogram = async () => {
    if (!planogramFile) {
      toast.error('Carica prima un planogramma');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Simulazione di analisi automatica dall'immagine
      // In futuro si potrebbe integrare con OCR o AI vision
      const mockDevices = [
        {
          id: `device-${Date.now()}-1`,
          name: 'iPad Air',
          type: 'iPad',
          color: 'Space Gray',
          quantity: 1,
          position: { x: 50, y: 50 },
          code: 'D76'
        },
        {
          id: `device-${Date.now()}-2`,
          name: 'iPhone 16 Pro',
          type: 'iPhone',
          color: 'Natural Titanium',
          quantity: 1,
          position: { x: 150, y: 50 },
          code: 'C215'
        },
        {
          id: `device-${Date.now()}-3`,
          name: 'Apple Watch Series 10',
          type: 'Watch',
          color: 'Jet Black',
          quantity: 1,
          position: { x: 250, y: 50 },
          code: 'G848'
        }
      ];
      
      updateDevices(mockDevices);
      toast.success(`Analisi completata! Trovati ${mockDevices.length} dispositivi dal planogramma`);
    } catch (error) {
      console.error('Error analyzing planogram:', error);
      toast.error('Errore nell\'analisi del planogramma');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addDevice = () => {
    const newDevice = {
      id: `device-${Date.now()}`,
      name: `Dispositivo ${devices.length + 1}`,
      type: 'iPhone',
      quantity: 1,
      position: { x: 100 + (devices.length * 20), y: 100 + (devices.length * 20) }
    };
    updateDevices([...devices, newDevice]);
  };

  const addDeviceFromList = (device: Device) => {
    const newDevice = {
      id: `device-${Date.now()}`,
      name: device.name,
      type: device.category,
      color: device.color || '',
      quantity: 1,
      position: { x: 100 + (devices.length * 20), y: 100 + (devices.length * 20) },
      deviceId: device.id
    };
    updateDevices([...devices, newDevice]);
    toast.success(`${device.name} aggiunto al tavolo`);
  };

  const filteredDevices = selectedCategory === 'all' 
    ? availableDevices 
    : availableDevices.filter(device => device.category === selectedCategory);

  const categories = [
    { value: 'all', label: 'Tutte le categorie' },
    { value: 'iPhone', label: 'iPhone' },
    { value: 'iPad', label: 'iPad' },
    { value: 'Mac', label: 'Mac' },
    { value: 'Watch', label: 'Apple Watch' },
    { value: 'Accessori', label: 'Accessori' }
  ];

  const updateDevice = (index: number, field: string, value: any) => {
    const updatedDevices = devices.map((device, i) => 
      i === index ? { ...device, [field]: value } : device
    );
    updateDevices(updatedDevices);
  };

  const removeDevice = (index: number) => {
    const deviceToRemove = devices[index];
    const updatedDevices = devices.filter((_, i) => i !== index);
    updateDevices(updatedDevices);
    
    // Rimuovi anche i cartelli prezzo automatici associati
    setPriceTags(prev => prev.filter(tag => 
      !(tag.isAutomatic && tag.deviceId === deviceToRemove.id)
    ));
  };

  // Funzione per refreshare e sincronizzare cartelli prezzo automatici per iPhone e Watch
  const refreshAutomaticPriceTags = () => {
    console.log('refreshAutomaticPriceTags called with devices:', devices);
    
    // Trova tutti i nomi dei dispositivi iPhone e Watch attuali
    const currentDeviceNames = devices
      .filter(device => device.type === 'iPhone' || device.type === 'Watch')
      .map(device => device.name);
    
    console.log('Current device names for automatic tags:', currentDeviceNames);
    
    // Mantieni solo i cartelli manuali e quelli automatici per dispositivi ancora presenti
    const manualTags = priceTags.filter(tag => !tag.isAutomatic);
    const existingAutomaticTags = priceTags.filter(tag => 
      tag.isAutomatic && currentDeviceNames.includes(tag.name)
    );
    
    // Aggiungi cartelli automatici per dispositivi che non ce l'hanno ancora
    const newAutomaticTags: any[] = [];
    const existingAutomaticNames = existingAutomaticTags.map(tag => tag.name);
    
    currentDeviceNames.forEach(deviceName => {
      if (!existingAutomaticNames.includes(deviceName)) {
        const device = devices.find(d => d.name === deviceName);
        newAutomaticTags.push({
          id: `price-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: deviceName,
          deviceId: device?.id || null,
          isAutomatic: true,
          position: { x: 50, y: 350 + (manualTags.length + existingAutomaticTags.length + newAutomaticTags.length) * 30 }
        });
      }
    });
    
    const removedCount = priceTags.filter(tag => tag.isAutomatic).length - existingAutomaticTags.length;
    const addedCount = newAutomaticTags.length;
    
    // Aggiorna i cartelli prezzo
    const updatedTags = [...manualTags, ...existingAutomaticTags, ...newAutomaticTags];
    setPriceTags(updatedTags);
    
    console.log('Price tags updated:', {
      removed: removedCount,
      added: addedCount,
      total: updatedTags.length
    });
    
    if (addedCount > 0 || removedCount > 0) {
      let message = 'Cartelli automatici sincronizzati!';
      if (addedCount > 0) message += ` +${addedCount} aggiunti`;
      if (removedCount > 0) message += ` -${removedCount} rimossi`;
      toast.success(message);
    } else {
      toast.success('Cartelli automatici già sincronizzati');
    }
  };

  // Semplifica la funzione updateDevices senza generazione automatica
  const updateDevices = (newDevices: any[]) => {
    setDevices(newDevices);
  };

  const addManualPriceTag = () => {
    if (!newPriceTagName.trim()) {
      toast.error('Inserisci un nome per il cartello prezzo');
      return;
    }
    
    const existingNames = priceTags.map(tag => tag.name);
    if (existingNames.includes(newPriceTagName.trim())) {
      toast.error('Esiste già un cartello con questo nome');
      return;
    }
    
    const newPriceTag = {
      id: `price-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newPriceTagName.trim(),
      deviceId: null,
      isAutomatic: false,
      associatedDevices: [], // Array per le associazioni manuali
      position: { x: 50, y: 350 + priceTags.length * 30 }
    };
    
    setPriceTags([...priceTags, newPriceTag]);
    setNewPriceTagName('');
    toast.success('Cartello prezzo aggiunto');
  };

  const removePriceTag = (id: string) => {
    setPriceTags(priceTags.filter(tag => tag.id !== id));
  };

  const openAssociateDialog = (priceTag: any) => {
    setSelectedPriceTag(priceTag);
    setSelectedDevicesForAssociation(priceTag.associatedDevices || []);
    setAssociateDialogOpen(true);
  };

  const handleDeviceAssociationToggle = (deviceId: string) => {
    setSelectedDevicesForAssociation(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const saveDeviceAssociations = async () => {
    if (!selectedPriceTag || !tableId) return;
    
    try {
      // Prima rimuovi tutte le associazioni esistenti per questo cartello prezzo
      const { error: deleteError } = await supabase
        .from('price_tag_device_associations')
        .delete()
        .eq('table_id', tableId)
        .eq('price_tag_name', selectedPriceTag.name);

      if (deleteError) throw deleteError;

      // Poi inserisci le nuove associazioni
      if (selectedDevicesForAssociation.length > 0) {
        const associationsToInsert = selectedDevicesForAssociation.map(deviceId => {
          const device = devices.find(d => d.id === deviceId);
          return {
            table_id: tableId,
            price_tag_name: selectedPriceTag.name,
            device_id: deviceId,
            device_name: device?.name || 'Unknown Device'
          };
        });

        const { error: insertError } = await supabase
          .from('price_tag_device_associations')
          .insert(associationsToInsert);

        if (insertError) throw insertError;
      }

      // Aggiorna lo stato locale
      setPriceTags(prev => prev.map(tag => 
        tag.id === selectedPriceTag.id 
          ? { ...tag, associatedDevices: selectedDevicesForAssociation }
          : tag
      ));
      
      setAssociateDialogOpen(false);
      setSelectedPriceTag(null);
      setSelectedDevicesForAssociation([]);
      
      const deviceNames = selectedDevicesForAssociation
        .map(deviceId => devices.find(d => d.id === deviceId)?.name)
        .filter(Boolean);
      
      toast.success(`Cartello "${selectedPriceTag.name}" associato a ${deviceNames.length} dispositivi`);
      
    } catch (error) {
      console.error('Error saving device associations:', error);
      toast.error('Errore nel salvataggio delle associazioni');
    }
  };

  // Nuove funzioni per l'associazione diretta
  const startAssociationMode = (priceTag: any) => {
    setAssociationMode({ active: true, priceTag });
    toast.info(`Clicca sui dispositivi nel tavolo per associarli a "${priceTag.name}". Clicca su Termina per uscire.`);
  };

  const exitAssociationMode = () => {
    setAssociationMode(null);
    toast.success('Modalità associazione terminata');
  };

  const handleDeviceClickForAssociation = async (deviceId: string) => {
    if (!associationMode || !tableId) return;
    
    const { priceTag } = associationMode;
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) return;
    
    try {
      // Controlla se il dispositivo è già associato a questo cartello
      const currentAssociations = priceTag.associatedDevices || [];
      const isAlreadyAssociated = currentAssociations.includes(deviceId);
      
      let newAssociations: string[];
      let actionMessage: string;
      
      if (isAlreadyAssociated) {
        // Rimuovi l'associazione
        newAssociations = currentAssociations.filter((id: string) => id !== deviceId);
        actionMessage = `rimosso da`;
        
        // Rimuovi dal database
        const { error: deleteError } = await supabase
          .from('price_tag_device_associations')
          .delete()
          .eq('table_id', tableId)
          .eq('price_tag_name', priceTag.name)
          .eq('device_id', deviceId);

        if (deleteError) throw deleteError;
        
      } else {
        // Aggiungi l'associazione
        newAssociations = [...currentAssociations, deviceId];
        actionMessage = `associato a`;
        
        // Aggiungi al database
        const { error: insertError } = await supabase
          .from('price_tag_device_associations')
          .insert({
            table_id: tableId,
            price_tag_name: priceTag.name,
            device_id: deviceId,
            device_name: device.name
          });

        if (insertError) throw insertError;
      }
      
      // Aggiorna lo stato locale dei priceTags
      setPriceTags(prev => prev.map(tag => 
        tag.id === priceTag.id 
          ? { ...tag, associatedDevices: newAssociations }
          : tag
      ));
      
      // Aggiorna anche l'oggetto associationMode per il feedback visivo immediato
      setAssociationMode(prev => prev ? {
        ...prev,
        priceTag: {
          ...prev.priceTag,
          associatedDevices: newAssociations
        }
      } : null);
      
      toast.success(`${device.name} ${actionMessage} "${priceTag.name}"`);
      
    } catch (error) {
      console.error('Error managing device association:', error);
      toast.error('Errore nella gestione dell\'associazione');
    }
  };

  const syncPriceTagsWithChains = async () => {
    try {
      console.log('syncPriceTagsWithChains called with table:', table?.id);
      console.log('Price tags to sync:', priceTags);
      
      // Recupera TUTTE le catene associate a questo tavolo
      const { data: storeTableData, error: storeTableError } = await supabase
        .from('store_tables')
        .select(`
          store_id,
          stores (
            chain
          )
        `)
        .eq('table_id', table.id);

      if (storeTableError) {
        console.error('Error fetching store info:', storeTableError);
        return;
      }

      if (!storeTableData || storeTableData.length === 0) {
        console.log('No store table data found for table:', table.id);
        return;
      }

      // Ottieni tutte le catene uniche associate a questo tavolo
      const chains = [...new Set(storeTableData
        .map(item => item?.stores?.chain)
        .filter(Boolean))];
      
      console.log('Found chains for this table:', chains);

      // Per ogni catena e ogni cartello prezzo, crea o aggiorna il record
      for (const chain of chains) {
        for (const priceTag of priceTags) {
          console.log('Syncing price tag:', priceTag.name, 'to chain:', chain);
          
          // Controlla se esiste già il cartello per questa catena
          const { data: existingTag } = await supabase
            .from('chain_price_tags')
            .select('id')
            .eq('chain', chain)
            .eq('name', priceTag.name)
            .maybeSingle();

          // Se non esiste, lo crea
          if (!existingTag) {
            const { error: insertError } = await supabase
              .from('chain_price_tags')
              .insert({
                chain: chain,
                name: priceTag.name
              });

            if (insertError) {
              console.error('Error syncing price tag to chain:', insertError);
            } else {
              console.log('Successfully synced price tag:', priceTag.name, 'to chain:', chain);
            }
          } else {
            console.log('Price tag already exists for chain:', priceTag.name, 'in', chain);
          }
        }
      }
    } catch (error) {
      console.error('Error syncing price tags with chains:', error);
    }
  };

  const saveConfiguration = async () => {
    if (!table) return;

    console.log('=== SAVING CONFIGURATION ===');
    console.log('- devices:', devices);
    console.log('- price_tags:', priceTags);
    console.log('- price_tags length:', priceTags.length);
    console.log('- manual tags:', priceTags.filter(tag => !tag.isAutomatic));
    console.log('- automatic tags:', priceTags.filter(tag => tag.isAutomatic));

    try {
      const { error } = await supabase
        .from('tables')
        .update({ 
          devices: devices,
          price_tags: priceTags,
          slots: slots, // Aggiungi anche gli slot al salvataggio
          updated_at: new Date().toISOString()
        })
        .eq('id', table.id);

      if (error) {
        console.error('Database save error:', error);
        throw error;
      }

      console.log('Table configuration saved successfully');

      // Sincronizza i cartelli prezzo con le catene SOLO dopo il salvataggio
      await syncPriceTagsWithChains();

      toast.success('Configurazione salvata con successo');
      
      // Ricarica i dati per verificare che siano stati salvati correttamente
      await fetchTable();
      await fetchPriceTagAssociations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Errore nel salvataggio della configurazione');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tavolo non trovato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/tables')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna ai Tavoli
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configurazione Tavolo</h1>
            <p className="text-muted-foreground">{table.name} - {table.table_type}</p>
          </div>
        </div>
        
        <Button onClick={saveConfiguration} className="min-w-32">
          <Save className="w-4 h-4 mr-2" />
          Salva Configurazione
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cartelli Prezzo Section */}
        <Card className="card-apple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Cartelli Prezzo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              I cartelli per iPhone e Watch vengono creati automaticamente. Puoi aggiungere cartelli manuali per altri prodotti.
            </div>
            
            {/* Cartelli automatici */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Cartelli Automatici</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshAutomaticPriceTags}
                  className="h-7 px-2 text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {priceTags.filter(tag => tag.isAutomatic).length > 0 ? (
                  priceTags.filter(tag => tag.isAutomatic).map((tag) => (
                     <div key={tag.id} className="flex items-center justify-between p-2 bg-accent border border-border rounded-lg">
                       <span className="text-sm font-medium text-foreground">{tag.name}</span>
                       <div className="text-xs text-primary">Automatico</div>
                     </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">Nessun cartello automatico</div>
                )}
              </div>
            </div>

            {/* Cartelli manuali */}
            <div>
              <h4 className="font-medium mb-2 text-sm">Cartelli Manuali</h4>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <PriceTagAutocomplete
                    value={newPriceTagName}
                    onChange={setNewPriceTagName}
                    onEnterPressed={addManualPriceTag}
                    placeholder="Nome cartello prezzo"
                    className="text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={addManualPriceTag}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {priceTags.filter(tag => !tag.isAutomatic).length > 0 ? (
                    priceTags.filter(tag => !tag.isAutomatic).map((tag) => (
                       <div key={tag.id} className="flex items-center justify-between p-2 bg-secondary border border-border rounded-lg">
                         <div className="flex-1">
                           <span className="text-sm font-medium text-foreground">{tag.name}</span>
                           {tag.associatedDevices && tag.associatedDevices.length > 0 && (
                             <div className="text-xs text-primary mt-1">
                               Associato a {tag.associatedDevices.length} dispositivi
                             </div>
                           )}
                         </div>
                         <div className="flex items-center gap-1">
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => startAssociationMode(tag)}
                             className="h-6 px-2 text-xs"
                           >
                             <Link className="w-3 h-3 mr-1" />
                             Associa
                           </Button>
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => removePriceTag(tag.id)}
                             className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                           >
                             <Trash2 className="w-3 h-3" />
                           </Button>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">Nessun cartello manuale</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                Totale cartelli: {priceTags.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispositivi Section */}
        <Card className="card-apple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dispositivi Disponibili</CardTitle>
              <div className="w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-card text-card-foreground shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value} className="bg-card text-card-foreground">
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[32rem] overflow-y-auto space-y-2">
              {filteredDevices.length > 0 ? (
                filteredDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-card-hover transition-colors duration-200 shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium text-card-foreground">
                        {device.name}
                        {device.color && ` (${device.color})`}
                      </div>
                      {device.model && (
                        <div className="text-sm text-muted-foreground">{device.model}</div>
                      )}
                      <div className="text-xs text-muted-foreground">{device.category}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addDeviceFromList(device)}
                      className="ml-2"
                    >
                      Aggiungi
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nessun dispositivo disponibile</p>
                  <p className="text-sm">Aggiungi dispositivi dalla sezione Dispositivi</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Layout Tavolo Section - Full Width */}
      <div className="w-full">
        {/* Banner modalità associazione */}
        {associationMode && (
          <Card className="mb-4 border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-medium text-primary">
                      Modalità Associazione Attiva
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Clicca sui dispositivi nel tavolo per associarli a "{associationMode.priceTag.name}"
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={exitAssociationMode}
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Termina Associazione
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {table.table_type === 'test' ? (
          <TestTableVisualizer
            devices={devices}
            onDevicesChange={updateDevices}
            onAddDevice={addDevice}
            tableId={table.id}
            existingImageUrl={table.image_url}
            existingSlots={table.slots || []}
            onSlotsChange={setSlots}
          />
        ) : (
          <TableVisualizer
            tableType={table.table_type as any}
            devices={devices}
            onDevicesChange={updateDevices}
            onAddDevice={addDevice}
            associationMode={associationMode}
            onDeviceClickForAssociation={handleDeviceClickForAssociation}
          />
        )}
      </div>
    </div>
  );
}