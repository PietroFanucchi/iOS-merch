import { useState, useEffect } from 'react';
import { User, Plus, Trash2, Edit, Calendar, Clock, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Tactician {
  id: string;
  name: string;
  city?: string;
  role: 'tattico' | 'BA';
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

interface TrainingSession {
  id: string;
  tactician_id: string;
  store_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
}

export default function Tacticians() {
  const [tacticians, setTacticians] = useState<Tactician[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [editingTactician, setEditingTactician] = useState<Tactician | null>(null);
  const [selectedTacticianForTraining, setSelectedTacticianForTraining] = useState<Tactician | null>(null);
  const [newTacticianName, setNewTacticianName] = useState('');
  const [newTacticianCity, setNewTacticianCity] = useState('');
  const [newTacticianRole, setNewTacticianRole] = useState<'tattico' | 'BA'>('tattico');
  const [newTacticianPhone, setNewTacticianPhone] = useState('');
  const [editTacticianName, setEditTacticianName] = useState('');
  const [editTacticianCity, setEditTacticianCity] = useState('');
  const [editTacticianRole, setEditTacticianRole] = useState<'tattico' | 'BA'>('tattico');
  const [editTacticianPhone, setEditTacticianPhone] = useState('');
  const [trainingDate, setTrainingDate] = useState<Date>();
  const [trainingTime, setTrainingTime] = useState('');
  const [trainingStoreId, setTrainingStoreId] = useState('');
  const [trainingNotes, setTrainingNotes] = useState('');
  const { toast } = useToast();

  // Function to normalize phone number to Italian format
  const normalizePhoneNumber = (phone: string): string | null => {
    if (!phone || !phone.trim()) return null;
    
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    
    // If already starts with +39, return as is
    if (cleanPhone.startsWith('+39')) {
      return cleanPhone;
    }
    
    // If starts with 39 without +, add +
    if (cleanPhone.startsWith('39')) {
      return '+' + cleanPhone;
    }
    
    // If starts with 3 (mobile) or 0 (landline), add +39
    if (cleanPhone.match(/^[30]/)) {
      return '+39' + cleanPhone;
    }
    
    // For any other case, add +39
    return '+39' + cleanPhone;
  };

  const fetchTacticians = async () => {
    try {
      const { data, error } = await supabase
        .from('tacticians')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Type cast the role field to ensure proper typing
      const typedTacticians: Tactician[] = (data || []).map(tactician => ({
        ...tactician,
        role: tactician.role as 'tattico' | 'BA'
      }));
      
      setTacticians(typedTacticians);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei tattici.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTactician = async () => {
    if (!newTacticianName.trim()) return;

    try {
      const { error } = await supabase
        .from('tacticians')
        .insert([{ 
          name: newTacticianName.trim(),
          city: newTacticianCity.trim() || null,
          role: newTacticianRole,
          phone_number: normalizePhoneNumber(newTacticianPhone)
        }]);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Tattico creato con successo.",
      });

      setNewTacticianName('');
      setNewTacticianCity('');
      setNewTacticianRole('tattico');
      setNewTacticianPhone('');
      setIsCreateDialogOpen(false);
      fetchTacticians();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la creazione del tattico.",
        variant: "destructive",
      });
    }
  };

  const updateTactician = async () => {
    if (!editingTactician || !editTacticianName.trim()) return;

    try {
      const { error } = await supabase
        .from('tacticians')
        .update({ 
          name: editTacticianName.trim(),
          city: editTacticianCity.trim() || null,
          role: editTacticianRole,
          phone_number: normalizePhoneNumber(editTacticianPhone)
        })
        .eq('id', editingTactician.id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Tattico aggiornato con successo.",
      });

      setEditingTactician(null);
      setEditTacticianName('');
      setEditTacticianCity('');
      setEditTacticianRole('tattico');
      setEditTacticianPhone('');
      setIsEditDialogOpen(false);
      fetchTacticians();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento del tattico.",
        variant: "destructive",
      });
    }
  };

  const deleteTactician = async (tacticianId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo tattico? Verrà rimosso anche da tutte le visite assegnate.")) return;

    try {
      console.log('Attempting to delete tactician with ID:', tacticianId);
      
      // First, remove tactician assignments from all visits
      const { error: unassignError } = await supabase
        .from('launch_stores')
        .update({ tactician_id: null })
        .eq('tactician_id', tacticianId);

      if (unassignError) {
        console.error('Error removing tactician assignments:', unassignError);
        throw unassignError;
      }

      console.log('Tactician assignments removed from visits');

      // Then delete the tactician
      const { error: deleteError } = await supabase
        .from('tacticians')
        .delete()
        .eq('id', tacticianId);

      if (deleteError) {
        console.error('Error deleting tactician:', deleteError);
        throw deleteError;
      }

      console.log('Tactician deleted successfully');
      toast({
        title: "Successo",
        description: "Tattico eliminato con successo e rimosso da tutte le visite.",
      });

      fetchTacticians();
    } catch (error) {
      console.error('Delete tactician error:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione del tattico.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (tactician: Tactician) => {
    setEditingTactician(tactician);
    setEditTacticianName(tactician.name);
    setEditTacticianCity(tactician.city || '');
    setEditTacticianRole(tactician.role);
    setEditTacticianPhone(tactician.phone_number || '');
    setIsEditDialogOpen(true);
  };

  const fetchTrainingSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      // Type cast the status field to ensure proper typing
      const typedSessions: TrainingSession[] = (data || []).map(session => ({
        ...session,
        status: session.status as 'scheduled' | 'completed' | 'cancelled'
      }));
      setTrainingSessions(typedSessions);
    } catch (error) {
      console.error('Error fetching training sessions:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, location')
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const createTrainingSession = async () => {
    if (!selectedTacticianForTraining || !trainingDate || !trainingTime || !trainingStoreId) return;

    try {
      const { error } = await supabase
        .from('training_sessions')
        .insert([{
          tactician_id: selectedTacticianForTraining.id,
          store_id: trainingStoreId,
          scheduled_date: format(trainingDate, 'yyyy-MM-dd'),
          scheduled_time: trainingTime,
          notes: trainingNotes.trim() || null
        }]);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Sessione di training programmata con successo.",
      });

      resetTrainingForm();
      setIsTrainingDialogOpen(false);
      fetchTrainingSessions();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la programmazione del training.",
        variant: "destructive",
      });
    }
  };

  const completeTraining = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('training_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Training marcato come completato.",
      });

      fetchTrainingSessions();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento del training.",
        variant: "destructive",
      });
    }
  };

  const cancelTraining = async (sessionId: string) => {
    if (!confirm("Eliminare questa sessione di training?")) return;

    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Training eliminato.",
      });

      fetchTrainingSessions();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione del training.",
        variant: "destructive",
      });
    }
  };

  const openTrainingDialog = (tactician: Tactician) => {
    setSelectedTacticianForTraining(tactician);
    setIsTrainingDialogOpen(true);
  };

  const resetTrainingForm = () => {
    setSelectedTacticianForTraining(null);
    setTrainingDate(undefined);
    setTrainingTime('');
    setTrainingStoreId('');
    setTrainingNotes('');
  };

  const getTacticianTraining = (tacticianId: string) => {
    return trainingSessions
      .filter(session => session.tactician_id === tacticianId)
      .sort((a, b) => {
        // Prima ordina per data di training (più recente)
        const dateCompare = new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        // Se le date sono uguali, ordina per data di creazione (più recente)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0];
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchTacticians(),
        fetchTrainingSessions(),
        fetchStores()
      ]);
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestione Tattici</h1>
          <p className="text-muted-foreground">Gestisci i tattici che si occupano dei lanci</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuovo Tattico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Tattico</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Tattico</label>
                <Input
                  value={newTacticianName}
                  onChange={(e) => setNewTacticianName(e.target.value)}
                  placeholder="Inserisci il nome del tattico"
                  onKeyPress={(e) => e.key === 'Enter' && createTactician()}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Città (opzionale)</label>
                <Input
                  value={newTacticianCity}
                  onChange={(e) => setNewTacticianCity(e.target.value)}
                  placeholder="Inserisci la città"
                  onKeyPress={(e) => e.key === 'Enter' && createTactician()}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefono (opzionale)</label>
                <Input
                  value={newTacticianPhone}
                  onChange={(e) => setNewTacticianPhone(e.target.value)}
                  placeholder="Es: 333 123 4567 (sarà convertito in +39)"
                  onKeyPress={(e) => e.key === 'Enter' && createTactician()}
                />
                <p className="text-xs text-muted-foreground">
                  Il numero sarà automaticamente formattato con il prefisso italiano +39
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Ruolo</label>
                <Select value={newTacticianRole} onValueChange={(value: 'tattico' | 'BA') => setNewTacticianRole(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona il ruolo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border">
                    <SelectItem value="tattico">Tattico</SelectItem>
                    <SelectItem value="BA">BA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={createTactician} disabled={!newTacticianName.trim()}>
                  Crea Tattico
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annulla
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-apple">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tacticians.length}</p>
                <p className="text-muted-foreground">Tattici Totali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-apple">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{trainingSessions.length}</p>
                  <p className="text-muted-foreground">Formazioni Totali</p>
                </div>
              </div>
              <Dialog open={isTrainingDialogOpen} onOpenChange={(open) => {
                setIsTrainingDialogOpen(open);
                if (!open) resetTrainingForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nuova Formazione
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crea Nuova Formazione</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tattico</label>
                      <Select value={selectedTacticianForTraining?.id || ''} onValueChange={(value) => {
                        const tactician = tacticians.find(t => t.id === value);
                        setSelectedTacticianForTraining(tactician || null);
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona tattico" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border">
                          {tacticians.map((tactician) => (
                            <SelectItem key={tactician.id} value={tactician.id}>
                              {tactician.name} - {tactician.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Training</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !trainingDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {trainingDate ? format(trainingDate, "dd/MM/yyyy") : "Seleziona data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={trainingDate}
                            onSelect={setTrainingDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ora Training</label>
                      <Input
                        type="time"
                        value={trainingTime}
                        onChange={(e) => setTrainingTime(e.target.value)}
                        placeholder="Seleziona ora"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Store</label>
                      <Select value={trainingStoreId} onValueChange={setTrainingStoreId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona store" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border">
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} - {store.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Note (max 100 caratteri)</label>
                      <Textarea
                        value={trainingNotes}
                        onChange={(e) => setTrainingNotes(e.target.value)}
                        placeholder="Inserisci note per il training..."
                        maxLength={100}
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {trainingNotes.length}/100
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={createTrainingSession} 
                        disabled={!selectedTacticianForTraining || !trainingDate || !trainingTime || !trainingStoreId}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Programma Training
                      </Button>
                      <Button variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>
                        Annulla
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tacticians Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento tattici...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tacticians.map((tactician) => {
            const training = getTacticianTraining(tactician.id);
            return (
              <Card key={tactician.id} className="card-apple card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{tactician.name}</CardTitle>
                        {training?.status === 'completed' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Ultimo training effettuato: {new Date(training.scheduled_date).toLocaleDateString('it-IT')}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge className={tactician.role === 'BA' ? 'badge-warning' : 'badge-secondary'}>
                            {tactician.role === 'BA' ? 'BA' : 'Tattico'}
                          </Badge>
                          {tactician.city && (
                            <Badge className="badge-outline">{tactician.city}</Badge>
                          )}
                          {tactician.phone_number && (
                            <Badge className="badge-outline">{tactician.phone_number}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {training && training.status === 'scheduled' && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Training il {new Date(training.scheduled_date).toLocaleDateString('it-IT')} alle {training.scheduled_time} a {stores.find(s => s.id === training.store_id)?.name}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => completeTraining(training.id)}
                            title="Completa training"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => cancelTraining(training.id)}
                            title="Cancella training"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => openEditDialog(tactician)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifica
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => deleteTactician(tactician.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && tacticians.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessun tattico trovato</h3>
          <p className="text-muted-foreground mb-4">Inizia creando il primo tattico</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crea Primo Tattico
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Tattico</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Tattico</label>
              <Input
                value={editTacticianName}
                onChange={(e) => setEditTacticianName(e.target.value)}
                placeholder="Inserisci il nome del tattico"
                onKeyPress={(e) => e.key === 'Enter' && updateTactician()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Città (opzionale)</label>
              <Input
                value={editTacticianCity}
                onChange={(e) => setEditTacticianCity(e.target.value)}
                placeholder="Inserisci la città"
                onKeyPress={(e) => e.key === 'Enter' && updateTactician()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefono (opzionale)</label>
              <Input
                value={editTacticianPhone}
                onChange={(e) => setEditTacticianPhone(e.target.value)}
                placeholder="Es: 333 123 4567 (sarà convertito in +39)"
                onKeyPress={(e) => e.key === 'Enter' && updateTactician()}
              />
              <p className="text-xs text-muted-foreground">
                Il numero sarà automaticamente formattato con il prefisso italiano +39
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ruolo</label>
              <Select value={editTacticianRole} onValueChange={(value: 'tattico' | 'BA') => setEditTacticianRole(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona il ruolo" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  <SelectItem value="tattico">Tattico</SelectItem>
                  <SelectItem value="BA">BA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={updateTactician} disabled={!editTacticianName.trim()}>
                Salva Modifiche
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}