import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, MapPin, Users, Clock, Mail, Edit2, Trash2, CalendarIcon, X, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Launch {
  id: string;
  name: string;
  description?: string;
  status: string;
  launch_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  white_stores_count?: number;
  tier2_stores_count?: number;
}

const statusColors = {
  draft: 'bg-green-100 text-green-800',
  opened: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800', 
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  draft: 'Aperto',
  opened: 'Aperto',
  completed: 'Chiuso',
  scheduled: 'Programmato',
  in_progress: 'In Corso',
  cancelled: 'Annullato'
};

// Helper function to generate slug from launch name
const generateLaunchSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const Launches = () => {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [editLaunch, setEditLaunch] = useState({
    name: "",
    description: "",
    dates: [] as Date[]
  });
  const [newLaunch, setNewLaunch] = useState({
    name: "",
    description: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useProfile();

  useEffect(() => {
    fetchLaunches();
  }, []);

  const fetchLaunches = async () => {
    try {
      const { data: launches, error: launchesError } = await supabase
        .from('launches')
        .select('*')
        .order('created_at', { ascending: false });

      if (launchesError) throw launchesError;
      
      // Per ogni lancio, calcola il numero di store per categoria basandosi sui dispositivi selezionati
      const processedData = await Promise.all((launches || []).map(async (launch) => {
        try {
          // Recupera i dispositivi selezionati per questo lancio
          const { data: launchDevices, error: devicesError } = await supabase
            .from('launch_devices')
            .select('device_id')
            .eq('launch_id', launch.id);

          if (devicesError) throw devicesError;

          if (!launchDevices || launchDevices.length === 0) {
            return {
              ...launch,
              white_stores_count: 0,
              tier2_stores_count: 0
            };
          }

          const deviceIds = launchDevices.map(d => d.device_id);

          // Trova tutti i tavoli che contengono questi dispositivi
          const { data: tablesData, error: tablesError } = await supabase
            .from('tables')
            .select('id, devices');

          if (tablesError) throw tablesError;

          const relevantTableIds = (tablesData || []).filter(table => {
            const tableDevices = Array.isArray(table.devices) ? table.devices : [];
            return tableDevices.some((tableDevice: any) => {
              return deviceIds.includes(tableDevice.deviceId);
            });
          }).map(table => table.id);

          if (relevantTableIds.length === 0) {
            return {
              ...launch,
              white_stores_count: 0,
              tier2_stores_count: 0
            };
          }

          // Trova tutti gli store collegati a questi tavoli
          const { data: storeData, error: storeError } = await supabase
            .from('store_tables')
            .select('stores(category)')
            .in('table_id', relevantTableIds);

          if (storeError) throw storeError;

          // Conta gli store per categoria, rimuovendo duplicati
          const uniqueStoreCategories = new Set();
          storeData?.forEach((item: any) => {
            if (item.stores && item.stores.category) {
              uniqueStoreCategories.add(item.stores.category);
            }
          });

          // Conta effettivamente gli store unici per categoria
          const { data: uniqueStores, error: uniqueStoresError } = await supabase
            .from('store_tables')
            .select('store_id, stores(category)')
            .in('table_id', relevantTableIds);

          if (uniqueStoresError) throw uniqueStoresError;

          const storesByCategory = new Map();
          uniqueStores?.forEach((item: any) => {
            if (item.stores && item.stores.category && item.store_id) {
              const category = item.stores.category;
              if (!storesByCategory.has(category)) {
                storesByCategory.set(category, new Set());
              }
              storesByCategory.get(category).add(item.store_id);
            }
          });

          const whiteStores = storesByCategory.get('White')?.size || 0;
          const tier2Stores = storesByCategory.get('Tier 2')?.size || 0;

          return {
            ...launch,
            white_stores_count: whiteStores,
            tier2_stores_count: tier2Stores
          };

        } catch (error) {
          console.error('Error processing launch:', launch.id, error);
          return {
            ...launch,
            white_stores_count: 0,
            tier2_stores_count: 0
          };
        }
      }));
      
      setLaunches(processedData);
    } catch (error) {
      console.error('Error fetching launches:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i lanci",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLaunch = async () => {
    if (!newLaunch.name.trim()) {
      toast({
        title: "Errore",
        description: "Il nome del lancio è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('launches')
        .insert([{
          name: newLaunch.name.trim(),
          description: newLaunch.description.trim() || null
        }]);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Lancio creato con successo",
      });

      setNewLaunch({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      fetchLaunches();
    } catch (error) {
      console.error('Error creating launch:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il lancio",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = async (e: React.MouseEvent, launch: Launch) => {
    e.stopPropagation();
    setSelectedLaunch(launch);
    
    // Carica le date esistenti per questo lancio
    try {
      const { data: launchDates, error } = await supabase
        .from('launch_dates')
        .select('launch_date')
        .eq('launch_id', launch.id)
        .order('launch_date');

      if (error) throw error;

      const dates = launchDates?.map(item => new Date(item.launch_date)) || [];
      
      setEditLaunch({
        name: launch.name,
        description: launch.description || "",
        dates: dates
      });
    } catch (error) {
      console.error('Error loading launch dates:', error);
      toast({
        title: "Attenzione",
        description: "Errore nel caricamento delle date del lancio",
        variant: "destructive",
      });
      
      setEditLaunch({
        name: launch.name,
        description: launch.description || "",
        dates: []
      });
    }
    
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, launch: Launch) => {
    e.stopPropagation();
    setSelectedLaunch(launch);
    setIsDeleteDialogOpen(true);
  };

  const updateLaunch = async () => {
    if (!editLaunch.name.trim() || !selectedLaunch) {
      toast({
        title: "Errore",
        description: "Il nome del lancio è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      // Aggiorna i dati principali del lancio
      const { error: launchError } = await supabase
        .from('launches')
        .update({
          name: editLaunch.name.trim(),
          description: editLaunch.description.trim() || null
        })
        .eq('id', selectedLaunch.id);

      if (launchError) throw launchError;

      // Gestisci le date del lancio
      // Prima elimina tutte le date esistenti
      const { error: deleteError } = await supabase
        .from('launch_dates')
        .delete()
        .eq('launch_id', selectedLaunch.id);

      if (deleteError) throw deleteError;

      // Poi inserisci le nuove date se ce ne sono
      if (editLaunch.dates.length > 0) {
        const datesToInsert = editLaunch.dates.map(date => ({
          launch_id: selectedLaunch.id,
          launch_date: format(date, 'yyyy-MM-dd')
        }));

        const { error: insertError } = await supabase
          .from('launch_dates')
          .insert(datesToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Successo",
        description: "Lancio aggiornato con successo",
      });

      setIsEditDialogOpen(false);
      setSelectedLaunch(null);
      fetchLaunches();
    } catch (error) {
      console.error('Error updating launch:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il lancio",
        variant: "destructive",
      });
    }
  };

  const addDate = (date: Date | undefined) => {
    if (!date) return;
    
    const dateExists = editLaunch.dates.some(existingDate => 
      format(existingDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    if (!dateExists) {
      setEditLaunch({
        ...editLaunch,
        dates: [...editLaunch.dates, date].sort((a, b) => a.getTime() - b.getTime())
      });
    }
  };

  const removeDate = (dateToRemove: Date) => {
    setEditLaunch({
      ...editLaunch,
      dates: editLaunch.dates.filter(date => 
        format(date, 'yyyy-MM-dd') !== format(dateToRemove, 'yyyy-MM-dd')
      )
    });
  };

  const deleteLaunch = async () => {
    if (!selectedLaunch) return;

    try {
      const { error } = await supabase
        .from('launches')
        .delete()
        .eq('id', selectedLaunch.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Lancio eliminato con successo",
      });

      setIsDeleteDialogOpen(false);
      setSelectedLaunch(null);
      fetchLaunches();
    } catch (error) {
      console.error('Error deleting launch:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il lancio",
        variant: "destructive",
      });
    }
  };

  const toggleLaunchStatus = async (e: React.MouseEvent, launch: Launch) => {
    e.stopPropagation();
    
    const isClosed = launch.status === 'completed';
    const newStatus = isClosed ? 'draft' : 'completed';

    try {
      const { error } = await supabase
        .from('launches')
        .update({ status: newStatus })
        .eq('id', launch.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: `Lancio ${isClosed ? 'riaperto' : 'chiuso'} con successo`,
      });

      fetchLaunches();
    } catch (error) {
      console.error('Error toggling launch status:', error);
      toast({
        title: "Errore",
        description: `Impossibile ${isClosed ? 'riaprire' : 'chiudere'} il lancio`,
        variant: "destructive",
      });
    }
  };

  const filteredLaunches = launches.filter(launch =>
    launch.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento lanci...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lanci Prodotti</h1>
          <p className="text-muted-foreground">
            Gestisci i lanci di nuovi prodotti e coordina gli aggiornamenti nei negozi
          </p>
        </div>
        
        {profile?.role === 'admin' && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Lancio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Lancio</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli del nuovo lancio prodotto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome del Lancio *</Label>
                  <Input
                    id="name"
                    value={newLaunch.name}
                    onChange={(e) => setNewLaunch({ ...newLaunch, name: e.target.value })}
                    placeholder="Es. iPhone 15 Pro Launch"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    value={newLaunch.description}
                    onChange={(e) => setNewLaunch({ ...newLaunch, description: e.target.value })}
                    placeholder="Descrizione opzionale del lancio..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={createLaunch}>Crea Lancio</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Cerca lanci..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredLaunches.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nessun lancio trovato</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Non ci sono lanci che corrispondono alla ricerca." : "Non sono ancora stati creati lanci."}
          </p>
          {!searchTerm && profile?.role === 'admin' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crea il primo lancio
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredLaunches.map((launch) => (
            <Card 
              key={launch.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/launches/${generateLaunchSlug(launch.name)}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{launch.name}</CardTitle>
                    <CardDescription>
                      Creato il {format(new Date(launch.created_at), 'dd MMMM yyyy', { locale: it })}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[launch.status]}>
                    {statusLabels[launch.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {launch.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {launch.description}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>Store White: {launch.white_stores_count || 0}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>Store Tier 2: {launch.tier2_stores_count || 0}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  {profile?.role === 'admin' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEditClick(e, launch)}
                        className="h-8"
                        disabled={launch.status === 'completed'}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Modifica
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => toggleLaunchStatus(e, launch)}
                        className="h-8"
                      >
                        {launch.status === 'completed' ? (
                          <>
                            <Unlock className="h-4 w-4 mr-1" />
                            Riapri
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-1" />
                            Chiudi
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDeleteClick(e, launch)}
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Elimina
                      </Button>
                    </>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog di modifica */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Lancio</DialogTitle>
            <DialogDescription>
              Modifica i dettagli del lancio selezionato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome del Lancio *</Label>
              <Input
                id="edit-name"
                value={editLaunch.name}
                onChange={(e) => setEditLaunch({ ...editLaunch, name: e.target.value })}
                placeholder="Es. iPhone 15 Pro Launch"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={editLaunch.description}
                onChange={(e) => setEditLaunch({ ...editLaunch, description: e.target.value })}
                placeholder="Descrizione opzionale del lancio..."
                rows={3}
              />
            </div>
            
            {/* Gestione Date del Lancio */}
            <div className="space-y-3">
              <Label>Date del Lancio</Label>
              
              {/* Date Picker */}
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Aggiungi data
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={undefined}
                      onSelect={addDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      disabled={(date) => date < new Date("1900-01-01")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Lista Date Selezionate */}
              {editLaunch.dates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Date selezionate:</p>
                  <div className="grid gap-2">
                    {editLaunch.dates.map((date, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <span className="text-sm">
                          {format(date, 'dd MMMM yyyy', { locale: it })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDate(date)}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Aggiungi le date in cui questo lancio sarà attivo. Puoi aggiungere più date selezionandole dal calendario.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={updateLaunch}>Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma eliminazione */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il lancio "{selectedLaunch?.name}"? 
              Questa azione non può essere annullata e verranno eliminati anche tutti i dati associati al lancio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteLaunch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Launches;