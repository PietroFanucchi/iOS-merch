import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, User, AlertTriangle, CheckCircle, Plus, Edit3, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import StoreTablesVisualization from '@/components/StoreTablesVisualization';

// Helper function to generate slug from store name
const generateStoreSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

interface Store {
  id: string;
  name: string;
  category: string;
  chain: string;
  location: string;
  tables_count: number;
  phone_technical?: string;
  phone_informatics?: string;
  email_technical?: string[];
  email_informatics?: string[];
  director_email?: string;
  has_digital_price_tags?: boolean;
  has_promotional_banners?: string;
  last_visit?: string;
}

interface StoreIssue {
  id: string;
  issue_type: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const issueTypes = [
  { value: 'missing_device', label: 'Dispositivo mancante' },
  { value: 'alarm_malfunction', label: 'Allarme malfunzionante' },
  { value: 'network_issue', label: 'Problema di rete' },
  { value: 'other', label: 'Altro' }
];

const missingDeviceReasons = [
  { value: 'sold_old', label: 'Venduto perché merce vecchia' },
  { value: 'sold', label: 'Venduto' },
  { value: 'stolen', label: 'Rubato' },
  { value: 'not_arrived', label: 'Non arrivato' },
  { value: 'in_service', label: 'In assistenza' },
  { value: 'broken_alarm', label: 'Allarme rotto' }
];

const statusTypes = [
  { value: 'open', label: 'Aperto', color: 'destructive' },
  { value: 'in_progress', label: 'In corso', color: 'warning' },
  { value: 'resolved', label: 'Risolto', color: 'success' }
];

export default function StoreDetails() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [store, setStore] = useState<Store | null>(null);
  const [issues, setIssues] = useState<StoreIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContacts, setEditingContacts] = useState(false);
  const [editingStoreInfo, setEditingStoreInfo] = useState(false);
  const [storeDevices, setStoreDevices] = useState<any[]>([]);
  const [newIssue, setNewIssue] = useState({
    issue_type: '',
    description: '',
    // Campi per dispositivo mancante
    device_id: '',
    reason: '',
    associated_device_id: '', // Per accessori: dispositivo a cui è associato
    // Campi per allarme malfunzionante  
    alarm_device_id: '',
    alarm_to_order: false,
    ticket_opened: false,
    ticket_number: ''
  });
  const { toast } = useToast();
  const { profile } = useProfile();

  const fetchStore = async () => {
    if (!storeSlug) return;
    
    try {
      console.log('Store slug from URL:', storeSlug);
      
      // Fetch all stores and find the one that matches the slug pattern
      const { data: allStores, error: storesError } = await supabase
        .from('stores')
        .select('*');

      if (storesError) throw storesError;

      const matchingStore = allStores?.find(s => {
        const generatedSlug = generateStoreSlug(s.name);
        console.log(`Comparing store slug "${generatedSlug}" with URL slug "${storeSlug}"`);
        return generatedSlug === storeSlug;
      });

      if (!matchingStore) {
        throw new Error('Store non trovato');
      }

      console.log('Matching store:', matchingStore);
      
      // Recupera l'ultima visita completata per questo store
      const { data: lastVisit, error: visitError } = await supabase
        .from('visits')
        .select('completed_at, scheduled_date, updated_at')
        .eq('store_id', matchingStore.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('scheduled_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Aggiungi l'ultima visita ai dati dello store
      const storeWithLastVisit = {
        ...matchingStore,
        last_visit: lastVisit?.completed_at || lastVisit?.scheduled_date || null
      };

      setStore(storeWithLastVisit);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Store non trovato.",
        variant: "destructive",
      });
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    if (!store?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('store_issues')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il caricamento degli status.",
        variant: "destructive",
      });
    }
  };

  const fetchStoreDevices = async () => {
    if (!store?.id) return;
    
    try {
      // Recupera i tavoli assegnati allo store
      const { data: assignedTables, error: tablesError } = await supabase
        .from('store_tables')
        .select(`
          tables (
            id,
            devices
          )
        `)
        .eq('store_id', store.id);
      
      if (tablesError) throw tablesError;

      // Estrai tutti i device_id unici dai tavoli assegnati
      const deviceIds = new Set<string>();
      assignedTables?.forEach((assignment: any) => {
        const table = assignment.tables;
        if (table?.devices && Array.isArray(table.devices)) {
          table.devices.forEach((device: any) => {
            if (device.deviceId) {
              deviceIds.add(device.deviceId);
            }
          });
        }
      });

      // Se non ci sono dispositivi nei tavoli assegnati, mostra un messaggio
      if (deviceIds.size === 0) {
        console.log('Nessun dispositivo trovato nei tavoli assegnati allo store');
        setStoreDevices([]);
        return;
      }

      // Recupera i dettagli completi dei dispositivi presenti nei tavoli dello store
      const { data: storeSpecificDevices, error: devicesError } = await supabase
        .from('devices')
        .select('id, name, category, model, color, image_url')
        .in('id', Array.from(deviceIds))
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (devicesError) throw devicesError;

      setStoreDevices(storeSpecificDevices || []);
      
      // Log per debugging
      console.log('Store ID:', store.id);
      console.log('Tavoli assegnati:', assignedTables?.length || 0);
      console.log('Device IDs trovati:', Array.from(deviceIds));
      console.log('Dispositivi caricati:', storeSpecificDevices?.length || 0);
    } catch (error) {
      console.error('Errore nel caricamento dispositivi:', error);
    }
  };

  const updateContacts = async (contacts: { phone_technical?: string; phone_informatics?: string; email_technical?: string[]; email_informatics?: string[]; director_email?: string }) => {
    if (!store?.id) return;
    
    try {
      const { error } = await supabase
        .from('stores')
        .update(contacts)
        .eq('id', store.id);

      if (error) throw error;
      
      setStore(prev => prev ? { ...prev, ...contacts } : null);
      setEditingContacts(false);
      
      toast({
        title: "Successo",
        description: "Contatti aggiornati con successo.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dei contatti.",
        variant: "destructive",
      });
    }
  };

  const updateStoreInfo = async (storeInfo: { has_digital_price_tags?: boolean; has_promotional_banners?: string }) => {
    if (!store?.id) return;
    
    try {
      const { error } = await supabase
        .from('stores')
        .update(storeInfo)
        .eq('id', store.id);

      if (error) throw error;
      
      setStore(prev => prev ? { ...prev, ...storeInfo } : null);
      setEditingStoreInfo(false);
      
      toast({
        title: "Successo",
        description: "Informazioni store aggiornate con successo.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento delle informazioni store.",
        variant: "destructive",
      });
    }
  };

  const createIssue = async () => {
    if (!store?.id || !newIssue.issue_type) return;
    
    // Validazione specifica per tipo
    if (newIssue.issue_type === 'missing_device' && (!newIssue.device_id || !newIssue.reason)) {
      toast({
        title: "Errore",
        description: "Seleziona dispositivo e motivazione.",
        variant: "destructive",
      });
      return;
    }
    
    if (newIssue.issue_type === 'alarm_malfunction' && !newIssue.alarm_device_id) {
      toast({
        title: "Errore", 
        description: "Seleziona dispositivo associato all'allarme.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Costruisci i dati da inserire
      const issueData: any = {
        store_id: store.id,
        issue_type: newIssue.issue_type,
        description: newIssue.description
      };

      // Aggiungi titolo auto-generato basato sul tipo
      if (newIssue.issue_type === 'missing_device') {
        const device = storeDevices.find(d => d.id === newIssue.device_id);
        const reason = missingDeviceReasons.find(r => r.value === newIssue.reason);
        const deviceDisplayName = device ? `${device.name}${device.color ? ` (${device.color})` : ''}` : 'N/A';
        issueData.title = `Dispositivo mancante: ${deviceDisplayName} - ${reason?.label || 'N/A'}`;
        
        // Se è specificato un dispositivo associato, aggiungilo alla descrizione
        if (newIssue.associated_device_id && newIssue.associated_device_id !== 'none') {
          const associatedDevice = storeDevices.find(d => d.id === newIssue.associated_device_id);
          if (associatedDevice) {
            issueData.description = `${issueData.description ? issueData.description + ' ' : ''}Accessorio associato a: ${associatedDevice.name}`;
          }
        }
      } else if (newIssue.issue_type === 'alarm_malfunction') {
        const device = storeDevices.find(d => d.id === newIssue.alarm_device_id);
        issueData.title = `Allarme malfunzionante: ${device?.name || 'N/A'}`;
      } else {
        issueData.title = issueTypes.find(t => t.value === newIssue.issue_type)?.label || 'Problema';
      }

      const { error } = await supabase
        .from('store_issues')
        .insert(issueData);

      if (error) throw error;
      
      setNewIssue({
        issue_type: '',
        description: '',
        device_id: '',
        reason: '',
        associated_device_id: '',
        alarm_device_id: '',
        alarm_to_order: false,
        ticket_opened: false,
        ticket_number: ''
      });
      fetchIssues();
      
      toast({
        title: "Successo",
        description: "Problema registrato con successo.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la registrazione del problema.",
        variant: "destructive",
      });
    }
  };

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('store_issues')
        .update(updateData)
        .eq('id', issueId);

      if (error) throw error;
      
      fetchIssues();
      
      toast({
        title: "Successo",
        description: "Status aggiornato con successo.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dello status.",
        variant: "destructive",
      });
    }
  };

  const deleteIssue = async (issueId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo problema?")) return;
    
    try {
      const { error } = await supabase
        .from('store_issues')
        .delete()
        .eq('id', issueId);

      if (error) throw error;
      
      fetchIssues();
      
      toast({
        title: "Successo",
        description: "Problema eliminato con successo.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione del problema.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (storeSlug) {
      fetchStore();
    }
  }, [storeSlug]);

  useEffect(() => {
    if (store?.id) {
      fetchIssues();
      fetchStoreDevices();
    }
  }, [store]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Caricamento store...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Store non trovato</h2>
        <Button onClick={() => navigate('/stores')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna agli Store
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className={`${isMobile ? 'space-y-4' : 'flex items-center gap-4'}`}>
        <Button 
          variant="outline" 
          onClick={() => navigate('/stores')}
          size={isMobile ? "sm" : "default"}
          className={isMobile ? 'w-fit' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isMobile ? 'Indietro' : 'Torna agli Store'}
        </Button>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{store.name}</h1>
          <div className={`${isMobile ? 'flex flex-wrap gap-2 mt-2' : 'flex items-center gap-2 mt-2'}`}>
            <Badge className={store.category === 'White' ? 'badge-success' : 'badge-warning'}>
              {store.category}
            </Badge>
            <Badge className="badge-secondary">{store.chain}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informazioni Store */}
        <Card className="card-apple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informazioni Store
              </CardTitle>
              {profile?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingStoreInfo(!editingStoreInfo)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Modifica
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingStoreInfo ? (
              <StoreInfoForm
                store={store}
                onSave={updateStoreInfo}
                onCancel={() => setEditingStoreInfo(false)}
              />
            ) : (
              <StoreInfoDisplay store={store} />
            )}
          </CardContent>
        </Card>

        {/* Contatti */}
        <Card className="card-apple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contatti
              </CardTitle>
              {profile?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingContacts(!editingContacts)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Modifica
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingContacts ? (
              <ContactsForm
                store={store}
                onSave={updateContacts}
                onCancel={() => setEditingContacts(false)}
              />
            ) : (
              <ContactsDisplay store={store} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status e Problemi */}
      <Card className="card-apple">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Status Store
            </CardTitle>
            {profile?.role === 'admin' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Problema
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registra Nuovo Problema</DialogTitle>
                  </DialogHeader>
                  <IssueForm 
                    newIssue={newIssue}
                    setNewIssue={setNewIssue}
                    storeDevices={storeDevices}
                    onSubmit={createIssue}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tutto a posto!</h3>
              <p className="text-muted-foreground">Non ci sono problemi registrati per questo store.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onStatusUpdate={updateIssueStatus}
                  onDelete={deleteIssue}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualizzazione Tavoli Assegnati */}
      <StoreTablesVisualization storeId={store.id} issues={issues} />
    </div>
  );
}

function StoreInfoDisplay({ store }: { store: Store }) {
  return (
    <div className="space-y-4">
      {/* Riga 1: Posizione | Tavoli assegnati */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Posizione</Label>
          <p className="text-sm">{store.location}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Tavoli Assegnati</Label>
          <p className="text-sm font-semibold">{store.tables_count}</p>
        </div>
      </div>
      
      {/* Riga 2: Ha cartelli prezzo digitali | Ha banner promozionali */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Ha cartelli di prezzo digitali</Label>
          <p className="text-sm">
            {store.has_digital_price_tags === true ? 'Si' : 
             store.has_digital_price_tags === false ? 'No' : 'Non specificato'}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Ha banner promozionali</Label>
          <p className="text-sm">
            {store.has_promotional_banners === 'Si' ? 'Si' :
             store.has_promotional_banners === 'raramente' ? 'Raramente' :
             store.has_promotional_banners === 'Mai' ? 'Mai' : 'Non specificato'}
          </p>
        </div>
      </div>
      
      {/* Riga 3: Ultima visita effettuata */}
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Ultima visita effettuata</Label>
        <p className="text-sm">
          {store.last_visit 
            ? new Date(store.last_visit).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
              })
            : 'Nessuna visita registrata'
          }
        </p>
      </div>
    </div>
  );
}

function StoreInfoForm({ store, onSave, onCancel }: { 
  store: Store; 
  onSave: (storeInfo: any) => void; 
  onCancel: () => void;
}) {
  const [storeInfo, setStoreInfo] = useState({
    has_digital_price_tags: store.has_digital_price_tags,
    has_promotional_banners: store.has_promotional_banners || ''
  });

  const handleSave = () => {
    onSave(storeInfo);
  };

  return (
    <div className="space-y-4">
      {/* Riga 1: Posizione | Tavoli assegnati (sola lettura) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Posizione</Label>
          <p className="text-sm">{store.location}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Tavoli Assegnati</Label>
          <p className="text-sm font-semibold">{store.tables_count}</p>
        </div>
      </div>
      
      {/* Riga 2: Ha cartelli prezzo digitali | Ha banner promozionali (modificabili) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ha cartelli di prezzo digitali</Label>
          <Select 
            value={storeInfo.has_digital_price_tags === true ? 'true' : 
                   storeInfo.has_digital_price_tags === false ? 'false' : ''} 
            onValueChange={(value) => setStoreInfo(prev => ({ 
              ...prev, 
              has_digital_price_tags: value === 'true' ? true : value === 'false' ? false : null 
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona opzione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Si</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ha banner promozionali</Label>
          <Select 
            value={storeInfo.has_promotional_banners} 
            onValueChange={(value) => setStoreInfo(prev => ({ ...prev, has_promotional_banners: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona opzione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Si">Si</SelectItem>
              <SelectItem value="raramente">Raramente</SelectItem>
              <SelectItem value="Mai">Mai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Riga 3: Ultima visita effettuata (sola lettura) */}
      <div>
        <Label className="text-sm font-medium text-muted-foreground">Ultima visita effettuata</Label>
        <p className="text-sm">
          {store.last_visit 
            ? new Date(store.last_visit).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
              })
            : 'Nessuna visita registrata'
          }
        </p>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          Salva
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Annulla
        </Button>
      </div>
    </div>
  );
}

function ContactsDisplay({ store }: { store: Store }) {
  return (
    <>
      <div>
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Telefonia
        </Label>
        <div className="mt-2 space-y-2">
          {/* Email prima */}
          {store.email_technical && store.email_technical.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-primary">📧 Email</Label>
              {store.email_technical.map((email, index) => (
                <p key={index} className="text-sm font-medium">• {email}</p>
              ))}
            </div>
          )}
          
          {/* Telefono dopo */}
          {store.phone_technical && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">📞 Telefono</Label>
              <p className="text-sm">• {store.phone_technical}</p>
            </div>
          )}
          
          {(!store.email_technical || store.email_technical.length === 0) && !store.phone_technical && (
            <p className="text-sm text-muted-foreground">Nessun contatto specificato</p>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Informatica
        </Label>
        <div className="mt-2 space-y-2">
          {/* Email prima */}
          {store.email_informatics && store.email_informatics.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-primary">📧 Email</Label>
              {store.email_informatics.map((email, index) => (
                <p key={index} className="text-sm font-medium">• {email}</p>
              ))}
            </div>
          )}
          
          {/* Telefono dopo */}
          {store.phone_informatics && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">📞 Telefono</Label>
              <p className="text-sm">• {store.phone_informatics}</p>
            </div>
          )}
          
          {(!store.email_informatics || store.email_informatics.length === 0) && !store.phone_informatics && (
            <p className="text-sm text-muted-foreground">Nessun contatto specificato</p>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          Direttore
        </Label>
        <div className="mt-2">
          <Label className="text-xs text-primary">📧 Email</Label>
          <p className="text-sm font-medium">{store.director_email || 'Non specificato'}</p>
        </div>
      </div>
    </>
  );
}

function ContactsForm({ store, onSave, onCancel }: { 
  store: Store; 
  onSave: (contacts: any) => void; 
  onCancel: () => void;
}) {
  const [contacts, setContacts] = useState({
    phone_technical: store.phone_technical || '',
    phone_informatics: store.phone_informatics || '',
    email_technical: store.email_technical && store.email_technical.length > 0 ? store.email_technical : [''],
    email_informatics: store.email_informatics && store.email_informatics.length > 0 ? store.email_informatics : [''],
    director_email: store.director_email || ''
  });

  const [showPhoneTechnical, setShowPhoneTechnical] = useState(!!store.phone_technical);
  const [showPhoneInformatics, setShowPhoneInformatics] = useState(!!store.phone_informatics);

  const handleSave = () => {
    // Pulisci email vuote prima di salvare
    const cleanedContacts = {
      ...contacts,
      email_technical: contacts.email_technical.filter(email => email.trim() !== ''),
      email_informatics: contacts.email_informatics.filter(email => email.trim() !== ''),
      phone_technical: showPhoneTechnical ? contacts.phone_technical : '',
      phone_informatics: showPhoneInformatics ? contacts.phone_informatics : ''
    };
    onSave(cleanedContacts);
  };

  const addEmail = (field: 'email_technical' | 'email_informatics') => {
    setContacts(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeEmail = (field: 'email_technical' | 'email_informatics', index: number) => {
    setContacts(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateEmail = (field: 'email_technical' | 'email_informatics', index: number, value: string) => {
    setContacts(prev => ({
      ...prev,
      [field]: prev[field].map((email, i) => i === index ? value : email)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Sezione Telefonia */}
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Telefonia
        </Label>
        
        {/* Email Telefonia (prioritarie) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium flex items-center gap-2">
              📧 Email Telefonia
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addEmail('email_technical')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi Email
            </Button>
          </div>
          {contacts.email_technical.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => updateEmail('email_technical', index, e.target.value)}
                placeholder="Inserisci email telefonia"
                className="flex-1"
              />
              {contacts.email_technical.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEmail('email_technical', index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Telefono Telefonia (opzionale) */}
        {showPhoneTechnical ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium flex items-center gap-2">
                📞 Telefono Telefonia
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPhoneTechnical(false);
                  setContacts(prev => ({ ...prev, phone_technical: '' }));
                }}
              >
                Rimuovi
              </Button>
            </div>
            <Input
              value={contacts.phone_technical}
              onChange={(e) => setContacts(prev => ({ ...prev, phone_technical: e.target.value }))}
              placeholder="Numero di telefono reparto telefonia"
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPhoneTechnical(true)}
            className="self-start"
          >
            <Phone className="w-4 h-4 mr-1" />
            Aggiungi numero di telefono
          </Button>
        )}
      </div>

      {/* Sezione Informatica */}
      <div className="space-y-4">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Informatica
        </Label>
        
        {/* Email Informatica (prioritarie) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium flex items-center gap-2">
              📧 Email Informatica
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addEmail('email_informatics')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi Email
            </Button>
          </div>
          {contacts.email_informatics.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => updateEmail('email_informatics', index, e.target.value)}
                placeholder="Inserisci email informatica"
                className="flex-1"
              />
              {contacts.email_informatics.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEmail('email_informatics', index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Telefono Informatica (opzionale) */}
        {showPhoneInformatics ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium flex items-center gap-2">
                📞 Telefono Informatica
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPhoneInformatics(false);
                  setContacts(prev => ({ ...prev, phone_informatics: '' }));
                }}
              >
                Rimuovi
              </Button>
            </div>
            <Input
              value={contacts.phone_informatics}
              onChange={(e) => setContacts(prev => ({ ...prev, phone_informatics: e.target.value }))}
              placeholder="Numero di telefono reparto informatica"
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPhoneInformatics(true)}
            className="self-start"
          >
            <Phone className="w-4 h-4 mr-1" />
            Aggiungi numero di telefono
          </Button>
        )}
      </div>

      {/* Email Direttore */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          📧 Email Direttore
        </Label>
        <Input
          type="email"
          value={contacts.director_email}
          onChange={(e) => setContacts(prev => ({ ...prev, director_email: e.target.value }))}
          placeholder="Inserisci email del direttore"
        />
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} className="flex-1">
          Salva Contatti
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Annulla
        </Button>
      </div>
    </div>
  );
}

function IssueForm({ 
  newIssue, 
  setNewIssue, 
  storeDevices, 
  onSubmit 
}: {
  newIssue: any;
  setNewIssue: (fn: (prev: any) => any) => void;
  storeDevices: any[];
  onSubmit: () => void;
}) {
  const renderIssueFields = () => {
    switch (newIssue.issue_type) {
      case 'missing_device':
        // Controlla se il dispositivo selezionato è un accessorio con controlli sicuri
        const selectedDevice = storeDevices.find(d => d.id === newIssue.device_id);
        const isAccessoryDevice = selectedDevice ? (
          (selectedDevice.category && selectedDevice.category.toLowerCase().includes('accessori')) || 
          (selectedDevice.name && (
            selectedDevice.name.toLowerCase().includes('pencil') ||
            selectedDevice.name.toLowerCase().includes('keyboard') ||
            selectedDevice.name.toLowerCase().includes('case')
          ))
        ) : false;
        
        return (
          <>
            <div>
              <Label>Dispositivo/Accessorio</Label>
              <Select value={newIssue.device_id} onValueChange={(value) => setNewIssue(prev => ({ ...prev, device_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  {storeDevices.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} {device.color && `(${device.color})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isAccessoryDevice && (
              <div>
                <Label>Dispositivo associato (opzionale)</Label>
                <Select 
                  value={newIssue.associated_device_id} 
                  onValueChange={(value) => setNewIssue(prev => ({ ...prev, associated_device_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona dispositivo a cui è associato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {storeDevices
                      .filter(device => {
                        // Filtra solo dispositivi che NON sono accessori
                        const isNotAccessory = !(
                          (device.category && device.category.toLowerCase().includes('accessori')) ||
                          (device.name && (
                            device.name.toLowerCase().includes('pencil') ||
                            device.name.toLowerCase().includes('keyboard') ||
                            device.name.toLowerCase().includes('case')
                          ))
                        );
                        return isNotAccessory;
                      })
                      .map(device => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name} {device.color && `(${device.color})`}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Specifica a quale dispositivo principale era associato questo accessorio per una migliore identificazione
                </p>
              </div>
            )}
            
            <div>
              <Label>Motivazione</Label>
              <Select value={newIssue.reason} onValueChange={(value) => setNewIssue(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona motivazione" />
                </SelectTrigger>
                <SelectContent>
                  {missingDeviceReasons.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );
      
      case 'alarm_malfunction':
        return (
          <>
            <div>
              <Label>Dispositivo associato all'allarme</Label>
              <Select value={newIssue.alarm_device_id} onValueChange={(value) => setNewIssue(prev => ({ ...prev, alarm_device_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  {storeDevices.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} {device.color && `(${device.color})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="alarm_to_order"
                checked={newIssue.alarm_to_order}
                onCheckedChange={(checked) => setNewIssue(prev => ({ ...prev, alarm_to_order: checked }))}
              />
              <Label htmlFor="alarm_to_order">Allarme da ordinare?</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="ticket_opened"
                checked={newIssue.ticket_opened}
                onCheckedChange={(checked) => setNewIssue(prev => ({ ...prev, ticket_opened: checked }))}
              />
              <Label htmlFor="ticket_opened">Aperto ticket?</Label>
            </div>
            {newIssue.ticket_opened && (
              <div>
                <Label>Numero ticket</Label>
                <Input
                  value={newIssue.ticket_number}
                  onChange={(e) => setNewIssue(prev => ({ ...prev, ticket_number: e.target.value }))}
                  placeholder="Inserisci numero del ticket"
                />
              </div>
            )}
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo Problema</Label>
        <Select value={newIssue.issue_type} onValueChange={(value) => setNewIssue(prev => ({ ...prev, issue_type: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona tipo problema" />
          </SelectTrigger>
          <SelectContent>
            {issueTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {renderIssueFields()}
      
      <div>
        <Label>Descrizione {newIssue.issue_type === 'missing_device' ? '(opzionale)' : ''}</Label>
        <Textarea
          value={newIssue.description}
          onChange={(e) => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrizione dettagliata del problema"
        />
      </div>
      
      <Button onClick={onSubmit} className="w-full">
        Registra Problema
      </Button>
    </div>
  );
}

function IssueCard({ 
  issue, 
  onStatusUpdate, 
  onDelete 
}: { 
  issue: StoreIssue; 
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const issueType = issueTypes.find(t => t.value === issue.issue_type);
  const statusType = statusTypes.find(s => s.value === issue.status);
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-start justify-between'}`}>
          <div className="flex-1">
            <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'} mb-2`}>
              <h4 className="font-semibold">{issue.title}</h4>
              <Badge variant={statusType?.color as any}>
                {statusType?.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {issueType?.label} • {new Date(issue.created_at).toLocaleDateString()}
            </p>
            {issue.description && (
              <p className="text-sm mb-3">{issue.description}</p>
            )}
          </div>
          {profile?.role === 'admin' && (
            <div className={`${isMobile ? 'flex flex-col gap-2 w-full' : 'flex items-center gap-2 ml-4'}`}>
              <Select value={issue.status} onValueChange={(value) => onStatusUpdate(issue.id, value)}>
                <SelectTrigger className={`${isMobile ? 'w-full' : 'w-32'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size={isMobile ? "default" : "sm"}
                onClick={() => onDelete(issue.id)}
                className={isMobile ? "w-full justify-center gap-2" : ""}
              >
                <Trash2 className="w-4 h-4" />
                {isMobile && "Elimina problema"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}