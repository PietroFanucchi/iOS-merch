import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users, Store, Mail, Table, Plus, X, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { VisitTable } from "@/components/VisitTable";
import { EmailSender } from "@/components/EmailSender";

interface Table {
  id: string;
  name: string;
  table_type: string;
  devices: any;
  created_at: string;
  updated_at: string;
}

interface Store {
  id: string;
  name: string;
  chain: string;
  category: string;
  location: string;
  director_email?: string;
  email_technical?: string[];
  email_informatics?: string[];
}

interface Launch {
  id: string;
  name: string;
  description?: string;
  status: string;
  launch_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface Tactician {
  id: string;
  name: string;
  created_at: string;
}

interface Visit {
  id: string;
  store_id: string;
  tactician_id?: string;
  visit_date?: string;
  visit_time?: string;
  date_communicated: boolean;
  mail_cartellini: boolean;
  status: 'da_effettuare' | 'completata' | 'effettuata_non_completata';
  notes?: string;
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800', 
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  draft: 'Bozza',
  scheduled: 'Programmato',
  in_progress: 'In Corso',
  completed: 'Completato',
  cancelled: 'Annullato'
};

const LaunchDetails = () => {
  const { launchSlug } = useParams<{ launchSlug: string }>();
  const navigate = useNavigate();
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("calendario");
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [affectedStores, setAffectedStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deviceCategoryFilter, setDeviceCategoryFilter] = useState<string>("all");
  const [launchDates, setLaunchDates] = useState<Date[]>([]);
  const [tacticians, setTacticians] = useState<Tactician[]>([]);
  const [launchDatesConfirmed, setLaunchDatesConfirmed] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const { toast } = useToast();
  const { profile } = useProfile();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (launchSlug) {
      fetchLaunch();
      fetchDevices();
      fetchSelectedDevices();
      fetchTables();
      fetchLaunchDates();
      fetchTacticians();
      fetchVisits();
    }
  }, [launchSlug]);

  useEffect(() => {
    if (launch?.id) {
      fetchSelectedDevices();
      fetchLaunchDates();
      fetchVisits();
    }
  }, [launch]);

  const fetchLaunch = async () => {
    if (!launchSlug) return;

    try {
      console.log('Launch slug from URL:', launchSlug);
      
      // Fetch all launches and find the one that matches the slug pattern
      const { data: allLaunches, error: launchesError } = await supabase
        .from('launches')
        .select('*');

      if (launchesError) throw launchesError;

      const matchingLaunch = allLaunches?.find(l => {
        const generatedSlug = l.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        console.log(`Comparing launch slug "${generatedSlug}" with URL slug "${launchSlug}"`);
        return generatedSlug === launchSlug;
      });

      if (!matchingLaunch) {
        throw new Error('Lancio non trovato');
      }

      console.log('Matching launch:', matchingLaunch);
      setLaunch(matchingLaunch);
    } catch (error) {
      console.error('Error fetching launch:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli del lancio",
        variant: "destructive",
      });
      navigate('/launches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeviceIds.length > 0) {
      fetchTablesAndStoresFromDevices();
    } else {
      setSelectedTableIds([]);
      setAffectedStores([]);
    }
  }, [selectedDeviceIds]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('category, name');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dispositivi",
        variant: "destructive",
      });
    }
  };

  const fetchSelectedDevices = async () => {
    if (!launch?.id) return;

    try {
      const { data, error } = await supabase
        .from('launch_devices')
        .select('device_id')
        .eq('launch_id', launch.id);

      if (error) throw error;
      setSelectedDeviceIds(data?.map(item => item.device_id) || []);
    } catch (error) {
      console.error('Error fetching selected devices:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('name');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i tavoli",
        variant: "destructive",
      });
    }
  };

  const fetchTablesAndStoresFromDevices = async () => {
    if (selectedDeviceIds.length === 0) return;

    try {
      // Prima trova tutti i tavoli che contengono almeno uno dei dispositivi selezionati
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('id, name, devices');

      if (tablesError) throw tablesError;

      const relevantTables = (tablesData || []).filter(table => {
        const tableDevices = Array.isArray(table.devices) ? table.devices : [];
        return tableDevices.some((tableDevice: any) => {
          return selectedDeviceIds.includes(tableDevice.deviceId);
        });
      });

      const relevantTableIds = relevantTables.map(table => table.id);
      setSelectedTableIds(relevantTableIds);

      // Ora trova gli store associati a questi tavoli
      if (relevantTableIds.length > 0) {
        const { data: storeData, error: storeError } = await supabase
          .from('store_tables')
          .select(`
            store_id, 
            stores(
              id, name, chain, category, location,
              director_email, email_technical, email_informatics
            )
          `)
          .in('table_id', relevantTableIds);

        if (storeError) throw storeError;

        // Rimuovi duplicati e estrai i dati degli store
        const uniqueStores = storeData?.reduce((acc: Store[], item: any) => {
          const store = item.stores;
          if (store && !acc.find(s => s.id === store.id)) {
            acc.push({
              id: store.id,
              name: store.name,
              chain: store.chain,
              category: store.category,
              location: store.location,
              director_email: store.director_email,
              email_technical: store.email_technical,
              email_informatics: store.email_informatics
            });
          }
          return acc;
        }, []) || [];

        setAffectedStores(uniqueStores);
      } else {
        setAffectedStores([]);
      }
    } catch (error) {
      console.error('Error fetching tables and stores from devices:', error);
      setAffectedStores([]);
    }
  };

  const fetchAffectedStores = async () => {
    if (selectedTableIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('store_tables')
        .select('store_id, stores!inner(*)')
        .in('table_id', selectedTableIds);

      if (error) throw error;
      
      // Remove duplicates and extract store data
      const uniqueStores = data?.reduce((acc: Store[], item) => {
        const store = item.stores as any;
        if (!acc.find(s => s.id === store.id)) {
          acc.push({
            id: store.id,
            name: store.name,
            chain: store.chain,
            category: store.category,
            location: store.location
          });
        }
        return acc;
      }, []) || [];

      setAffectedStores(uniqueStores);
    } catch (error) {
      console.error('Error fetching affected stores:', error);
    }
  };

  const handleDeviceSelection = async (deviceId: string, isSelected: boolean) => {
    if (!launch?.id) return;

    try {
      if (isSelected) {
        const { error } = await supabase
          .from('launch_devices')
          .insert({ launch_id: launch.id, device_id: deviceId });

        if (error) throw error;
        setSelectedDeviceIds([...selectedDeviceIds, deviceId]);
      } else {
        const { error } = await supabase
          .from('launch_devices')
          .delete()
          .eq('launch_id', launch.id)
          .eq('device_id', deviceId);

        if (error) throw error;
        setSelectedDeviceIds(selectedDeviceIds.filter(id => id !== deviceId));
      }

      toast({
        title: "Successo",
        description: isSelected ? "Prodotto aggiunto al lancio" : "Prodotto rimosso dal lancio",
      });
    } catch (error) {
      console.error('Error updating device selection:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la selezione del prodotto",
        variant: "destructive",
      });
    }
  };

  const fetchVisits = async () => {
    if (!launch?.id) return;

    try {
      const { data, error } = await supabase
        .from('launch_stores')
        .select('id, store_id, tactician_id, visit_date, visit_time, date_communicated, mail_cartellini, status, notes')
        .eq('launch_id', launch.id);

      if (error) throw error;
      
      // Type cast the data to ensure proper typing
      const typedVisits: Visit[] = (data || []).map(visit => ({
        ...visit,
        mail_cartellini: visit.mail_cartellini || false,
        status: visit.status as 'da_effettuare' | 'completata' | 'effettuata_non_completata'
      }));
      
      setVisits(typedVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setVisits([]);
    }
  };

  const fetchLaunchDates = async () => {
    if (!launch?.id) return;

    try {
      const { data, error } = await supabase
        .from('launch_dates')
        .select('launch_date')
        .eq('launch_id', launch.id)
        .order('launch_date');

      if (error) throw error;
      
      if (data && data.length > 0) {
        const dates = data.map(item => new Date(item.launch_date));
        setLaunchDates(dates);
        setLaunchDatesConfirmed(true);
      }
    } catch (error) {
      console.error('Error fetching launch dates:', error);
    }
  };

  const fetchTacticians = async () => {
    try {
      const { data, error } = await supabase
        .from('tacticians')
        .select('*')
        .order('name');

      if (error) throw error;
      setTacticians(data || []);
    } catch (error) {
      console.error('Error fetching tacticians:', error);
      setTacticians([]);
    }
  };

  const handleVisitUpdate = async (storeId: string, field: string, value: any) => {
    if (!launch?.id) return;

    try {
      // Find existing launch_store record by launch_id AND store_id
      const existingVisit = visits.find(v => v.store_id === storeId);
      
      if (existingVisit) {
        // Update existing record
        const { error } = await supabase
          .from('launch_stores')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', existingVisit.id);

        if (error) throw error;
        
        // Update local state
        setVisits(visits.map(v => 
          v.id === existingVisit.id ? { ...v, [field]: value } : v
        ));
      } else {
        // Check if a record already exists in the database that wasn't loaded
        const { data: existingRecord, error: checkError } = await supabase
          .from('launch_stores')
          .select('id')
          .eq('launch_id', launch.id)
          .eq('store_id', storeId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingRecord) {
          // Record exists, update it
          const { error: updateError } = await supabase
            .from('launch_stores')
            .update({ [field]: value, updated_at: new Date().toISOString() })
            .eq('id', existingRecord.id);

          if (updateError) throw updateError;
          
          // Refresh visits to get the updated data
          await fetchVisits();
        } else {
          // Create new record
          const { data, error } = await supabase
            .from('launch_stores')
            .insert({ 
              launch_id: launch.id, 
              store_id: storeId, 
              [field]: value,
              status: 'da_effettuare',
              date_communicated: false,
              mail_cartellini: false
            })
            .select('id, store_id, tactician_id, visit_date, visit_time, date_communicated, mail_cartellini, status, notes')
            .single();

          if (error) throw error;
          
          if (data) {
            const typedData: Visit = {
              ...data,
              mail_cartellini: data.mail_cartellini || false,
              status: data.status as 'da_effettuare' | 'completata' | 'effettuata_non_completata'
            };
            setVisits([...visits, typedData]);
          }
        }
      }

      toast({
        title: "Successo",
        description: "Visita aggiornata con successo",
      });
    } catch (error) {
      console.error('Error updating visit:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la visita",
        variant: "destructive",
      });
    }
  };

  // Callback function for EmailSender to update visit state in real time
  const handleEmailStateChange = (storeId: string, field: string, value: any) => {
    // Find existing visit and update local state immediately for real-time update
    const existingVisit = visits.find(v => v.store_id === storeId);
    
    if (existingVisit) {
      // Update local state immediately
      setVisits(visits.map(v => 
        v.id === existingVisit.id ? { ...v, [field]: value } : v
      ));
    } else {
      // Create a new visit entry if it doesn't exist
      const newVisit: Visit = {
        id: `temp-${storeId}`, // Temporary ID
        store_id: storeId,
        status: 'da_effettuare',
        date_communicated: field === 'date_communicated' ? value : false,
        mail_cartellini: field === 'mail_cartellini' ? value : false
      };
      setVisits([...visits, newVisit]);
    }
  };

  const confirmLaunchDates = async () => {
    if (launchDates.length === 0) {
      toast({
        title: "Errore",
        description: "Seleziona almeno una data per il lancio",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, delete existing launch dates
      await supabase
        .from('launch_dates')
        .delete()
        .eq('launch_id', launch!.id);

      // Then, insert all selected dates
      const dateInserts = launchDates.map(date => ({
        launch_id: launch!.id,
        launch_date: date.toISOString().split('T')[0]
      }));

      const { error } = await supabase
        .from('launch_dates')
        .insert(dateInserts);

      if (error) throw error;

      // Update the main launch record with the first date for compatibility
      await supabase
        .from('launches')
        .update({ 
          launch_date: launchDates[0].toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', launch!.id);

      setLaunchDatesConfirmed(true);
      
      toast({
        title: "Successo",
        description: "Date del lancio confermate e salvate",
      });
    } catch (error) {
      console.error('Error confirming launch dates:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le date",
        variant: "destructive",
      });
    }
  };

  const getTableTypeLabel = (type: string) => {
    switch (type) {
      case 'singolo':
        return 'Singolo';
      case 'doppio_back_to_back':
        return 'Doppio Back to Back';
      case 'doppio_free_standing':
        return 'Doppio Free Standing';
      default:
        return type;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.model && device.model.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = deviceCategoryFilter === "all" || device.category === deviceCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Raggruppa i dispositivi per categoria per una migliore visualizzazione
  const devicesByCategory = filteredDevices.reduce((acc: any, device) => {
    if (!acc[device.category]) {
      acc[device.category] = [];
    }
    acc[device.category].push(device);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento dettagli lancio...</p>
        </div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Lancio non trovato</h3>
        <p className="text-muted-foreground mb-4">Il lancio richiesto non esiste o non è accessibile.</p>
        <Button onClick={() => navigate('/launches')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna ai Lanci
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/launches')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{launch.name}</h1>
            <Badge className={statusColors[launch.status as keyof typeof statusColors]}>
              {statusLabels[launch.status as keyof typeof statusLabels]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Creato il {format(new Date(launch.created_at), 'dd MMMM yyyy', { locale: it })}
          </p>
        </div>
      </div>

      {/* Launch Info Card */}
      {launch.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{launch.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-1'}`}>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="prodotti" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Prodotti
              </TabsTrigger>
              <TabsTrigger value="store" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Store
              </TabsTrigger>
              <TabsTrigger value="mail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Mail
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {isAdmin && (
          <>
            <TabsContent value="prodotti" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selezione Prodotti</CardTitle>
                  <CardDescription>
                    Seleziona i prodotti coinvolti nel lancio. Il sistema identificherà automaticamente i tavoli e gli store impattati.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Input
                        placeholder="Cerca prodotti per nome, categoria o modello..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={deviceCategoryFilter} onValueChange={setDeviceCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutte le categorie</SelectItem>
                          <SelectItem value="iPhone">iPhone</SelectItem>
                          <SelectItem value="iPad">iPad</SelectItem>
                          <SelectItem value="Mac">Mac</SelectItem>
                          <SelectItem value="Watch">Apple Watch</SelectItem>
                          <SelectItem value="Accessori">Accessori</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {filteredDevices.length === 0 ? (
                      <div className="text-center py-8">
                        <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {searchTerm || deviceCategoryFilter !== "all" ? "Nessun prodotto trovato per i filtri selezionati" : "Nessun prodotto disponibile"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(devicesByCategory).map(([category, categoryDevices]: [string, any[]]) => (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">{category}</h3>
                              <Badge variant="outline">{categoryDevices.length}</Badge>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {categoryDevices.map((device) => {
                                const isSelected = selectedDeviceIds.includes(device.id);
                                
                                return (
                                  <Card 
                                    key={device.id} 
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                                    }`}
                                    onClick={() => handleDeviceSelection(device.id, !isSelected)}
                                  >
                                    <CardHeader className="pb-3">
                                      <div className="flex items-center justify-between">
                                        <div className="space-y-1 flex-1">
                                          <CardTitle className="text-lg flex items-center gap-2">
                                            <Checkbox checked={isSelected} />
                                            {device.name}
                                            {device.color && ` (${device.color})`}
                                          </CardTitle>
                                          <CardDescription>
                                            {device.model && `${device.model} • `}
                                            {device.category}
                                          </CardDescription>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    {device.description && (
                                      <CardContent>
                                        <div className="text-sm text-muted-foreground">
                                          {device.description}
                                        </div>
                                      </CardContent>
                                    )}
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {selectedDeviceIds.length > 0 && (
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Prodotti Selezionati</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {selectedDeviceIds.length} prodotti selezionati che coinvolgeranno {selectedTableIds.length} tavoli e {affectedStores.length} negozi
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedDeviceIds.map(deviceId => {
                            const device = devices.find(d => d.id === deviceId);
                            return device ? (
                              <Badge key={deviceId} variant="secondary">
                                {device.name} {device.color && `(${device.color})`}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="store" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Store Coinvolti</CardTitle>
                  <CardDescription>
                    Negozi automaticamente identificati dai prodotti selezionati
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {affectedStores.length === 0 ? (
                    <div className="text-center py-8">
                      <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {selectedDeviceIds.length === 0 
                          ? "Seleziona alcuni prodotti per vedere i negozi coinvolti"
                          : "Nessun negozio associato ai prodotti selezionati"
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        {affectedStores.length} negozi coinvolti nel lancio
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {affectedStores.map((store) => (
                          <Card key={store.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg">{store.name}</CardTitle>
                              <CardDescription>{store.location}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Catena:</span>
                                  <span className="font-medium">{store.chain}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Categoria:</span>
                                  <Badge variant={store.category === 'White' ? 'default' : 'secondary'}>
                                    {store.category}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mail" className="space-y-6">
              <EmailSender 
                launchId={launch!.id!} 
                impactedStores={affectedStores}
                devices={devices.filter(d => selectedDeviceIds.includes(d.id))}
                onStateChange={handleEmailStateChange}
              />
            </TabsContent>
          </>
        )}

        <TabsContent value="calendario" className="space-y-4">
          {!launchDatesConfirmed ? (
            <Card>
              <CardHeader>
                <CardTitle>Date del Lancio</CardTitle>
                <CardDescription>
                  {isAdmin ? "Seleziona le date disponibili per il lancio del prodotto (obbligatorio)" : "Date del lancio non ancora confermate"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isAdmin ? (
                    <>
                      <CalendarComponent
                        mode="multiple"
                        selected={launchDates}
                        onSelect={(dates) => setLaunchDates(dates || [])}
                        className="rounded-md border mx-auto"
                      />
                      {launchDates.length > 0 && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Date selezionate:</p>
                            <div className="flex flex-wrap gap-2">
                              {launchDates.map((date, index) => (
                                <Badge key={index} variant="secondary">
                                  {format(date, 'dd/MM/yyyy', { locale: it })}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button onClick={confirmLaunchDates} className="w-full">
                            Conferma Date del Lancio
                          </Button>
                        </div>
                      )}
                      {launchDates.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm">
                            Seleziona almeno una data per procedere
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Le date del lancio devono essere confermate da un amministratore
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {affectedStores.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Nessun Store Coinvolto</CardTitle>
                    <CardDescription>
                      {isAdmin ? "Seleziona dei prodotti nella sezione \"Prodotti\" per vedere i negozi coinvolti" : "Nessun store coinvolto in questo lancio"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {isAdmin ? "Vai alla sezione \"Prodotti\" per selezionare i prodotti del lancio" : "Nessun store è stato coinvolto in questo lancio"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* White Stores */}
                  {affectedStores.filter(store => store.category === 'White').length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Store White</CardTitle>
                        {!isAdmin && (
                          <CardDescription className="text-muted-foreground">
                            Visualizzazione in sola lettura - Solo gli amministratori possono modificare le visite
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <VisitTable 
                          stores={affectedStores.filter(store => store.category === 'White').sort((a, b) => a.name.localeCompare(b.name))}
                          tacticians={tacticians}
                          launchDates={launchDates}
                          visits={visits}
                          onVisitUpdate={isAdmin ? handleVisitUpdate : undefined}
                          readOnly={!isAdmin}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Tier 2 Stores */}
                  {affectedStores.filter(store => store.category === 'Tier2').length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Store Tier 2</CardTitle>
                        {!isAdmin && (
                          <CardDescription className="text-muted-foreground">
                            Visualizzazione in sola lettura - Solo gli amministratori possono modificare le visite
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <VisitTable 
                          stores={affectedStores.filter(store => store.category === 'Tier2').sort((a, b) => a.name.localeCompare(b.name))}
                          tacticians={tacticians}
                          launchDates={launchDates}
                          visits={visits}
                          onVisitUpdate={isAdmin ? handleVisitUpdate : undefined}
                          readOnly={!isAdmin}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LaunchDetails;