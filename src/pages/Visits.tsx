import { useState, useEffect } from 'react';
import { format, addDays, startOfDay, startOfWeek, addWeeks, subWeeks, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Clock, Store as StoreIcon, CheckCircle, AlertCircle, Plus, X, Trash2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Store = {
  id: string;
  name: string;
  location: string;
  category: string;
  chain: string;
  tables_count: number;
  phone_technical?: string;
  phone_informatics?: string;
  director_email?: string;
  created_at: string;
  updated_at: string;
};

type Visit = {
  id: string;
  store_id: string;
  scheduled_date: string;
  visit_type: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  stores?: Store;
};

type TrainingSession = {
  id: string;
  tactician_id: string;
  store_id: string;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  stores?: Store;
  tacticians?: {
    id: string;
    name: string;
    role: string;
  };
};

type CalendarEvent = {
  id: string;
  type: 'visit' | 'training';
  store_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  stores?: Store;
  visit_type?: string;
  tactician_name?: string;
  tactician_role?: string;
};

type PendingStoreVisit = {
  id: string;
  store_id: string;
  visit_type: 'white' | 'tier2';
  imported_by?: string;
  created_at: string;
  updated_at: string;
  stores?: Store;
};

type StoreBox = {
  id: string;
  store: Store;
  visit_type: 'white' | 'tier2';
};

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  
  return (
    <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
      {status === 'scheduled' && 'Programmata'}
      {status === 'completed' && 'Completata'}
      {status === 'cancelled' && 'Annullata'}
    </Badge>
  );
};

// Mobile Event Card Component for touch-friendly calendar view
const MobileEventCard = ({ 
  event, 
  onDelete, 
  onMoveToStoreList, 
  disabled 
}: { 
  event: CalendarEvent; 
  onDelete: (eventId: string) => void; 
  onMoveToStoreList: (eventId: string) => void;
  disabled: boolean;
}) => {
  if (event.type === 'training') {
    return (
      <div className={`p-3 bg-amber-50 border border-amber-200 rounded-lg ${disabled ? 'opacity-70' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-medium text-amber-800 mb-1">
              🎓 {event.stores?.name || 'Store sconosciuto'}
            </div>
            <div className="text-sm text-amber-600 mb-1">
              {event.tactician_name} ({event.tactician_role})
            </div>
            {event.scheduled_time && (
              <div className="text-sm text-amber-600 mb-2">
                Orario: {event.scheduled_time.slice(0, 5)}
              </div>
            )}
            <StatusBadge status={event.status} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 bg-card border border-border rounded-lg ${disabled ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-foreground mb-1">
            {event.stores?.name || 'Store sconosciuto'}
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {event.stores?.location}
          </div>
          <StatusBadge status={event.status} />
        </div>
        <div className="flex gap-1 ml-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMoveToStoreList(event.id)}
            className="h-8 px-2"
            disabled={disabled}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(event.id)}
            className="h-8 px-2 text-red-500 hover:text-red-600"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const DroppableDay = ({ day, events, onDeleteVisit, onMoveToStoreList }: { day: any; events: CalendarEvent[]; onDeleteVisit: (visitId: string) => void; onMoveToStoreList: (visitId: string) => void }) => {
  const isPastDate = new Date(day.dateStr) < new Date(format(new Date(), 'yyyy-MM-dd'));
  const isWeekend = day.dayName === 'Sab' || day.dayName === 'Dom';
  const isDisabled = isPastDate || isWeekend;

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.dateStr}`,
    disabled: isDisabled,
  });

  return (
    <div
      className={`min-h-[200px] border rounded-lg p-3 transition-colors ${
        day.isToday ? 'bg-primary/10 border-primary/30' : 'bg-card'
      } ${
        isDisabled ? 'opacity-50 bg-muted/50' : ''
      } ${
        isWeekend ? 'bg-muted border-muted-foreground/30' : ''
      }`}
    >
      <div 
        ref={setNodeRef}
        className={`text-center mb-3 p-2 rounded-md transition-colors ${
          isOver && !isDisabled ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 border-dashed' : 'border-2 border-transparent'
        }`}
      >
        <div className={`text-sm font-medium ${isWeekend ? 'text-muted-foreground' : 'text-foreground'}`}>
          {day.dayName}
          {isWeekend && <span className="ml-1 text-xs">(non disponibile)</span>}
        </div>
        <div className={`text-lg ${day.isToday ? 'font-bold text-primary' : 'text-foreground'} ${isWeekend ? 'text-muted-foreground' : ''}`}>
          {day.dayNumber}
        </div>
      </div>
      
      <div className="space-y-2">
        {events.map((event) => (
          <CalendarEventComponent
            key={event.id}
            event={event}
            onDelete={onDeleteVisit}
            disabled={isDisabled}
            onMoveToStoreList={onMoveToStoreList}
          />
        ))}
      </div>
    </div>
  );
};

const CalendarEventComponent = ({ event, onDelete, disabled, onMoveToStoreList }: { event: CalendarEvent; onDelete: (eventId: string) => void; disabled: boolean; onMoveToStoreList: (eventId: string) => void }) => {
  if (event.type === 'training') {
    // Rendering per training sessions - non draggabile, solo visualizzazione
    return (
      <div
        className={`p-2 bg-amber-50 border border-amber-200 rounded text-xs shadow-sm ${
          disabled ? 'cursor-not-allowed opacity-70' : ''
        }`}
      >
        <div className="font-medium truncate text-amber-800">
          🎓 {event.stores?.name || 'Store sconosciuto'}
        </div>
        <div className="text-amber-600 truncate text-xs">
          {event.tactician_name} ({event.tactician_role})
        </div>
        <div className="text-amber-600 truncate text-xs">
          {event.scheduled_time && `alle ${event.scheduled_time.slice(0, 5)}`}
        </div>
        <StatusBadge status={event.status} />
      </div>
    );
  }

  // Rendering per visite normali - componente draggabile esistente
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `visit-${event.id}`,
    disabled: disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => !disabled && onMoveToStoreList(event.id)}
      className={`p-2 bg-card border border-border rounded text-xs shadow-sm group relative ${
        disabled ? 'cursor-not-allowed' : 'cursor-move hover:shadow-md'
      }`}
      title={disabled ? '' : 'Doppio click per riportare in "Store da Programmare"'}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(event.id);
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
      <div className="font-medium truncate pr-6 text-foreground">
        {event.stores?.name || 'Store sconosciuto'}
      </div>
      <div className="text-muted-foreground truncate">
        {event.stores?.location}
      </div>
      <StatusBadge status={event.status} />
    </div>
  );
};

const DraggableVisit = ({ visit, onDelete, disabled, onMoveToStoreList }: { visit: Visit; onDelete: (visitId: string) => void; disabled: boolean; onMoveToStoreList: (visitId: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `visit-${visit.id}`,
    disabled: disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => !disabled && onMoveToStoreList(visit.id)}
      className={`p-2 bg-card border border-border rounded text-xs shadow-sm group relative ${
        disabled ? 'cursor-not-allowed' : 'cursor-move hover:shadow-md'
      }`}
      title={disabled ? '' : 'Doppio click per riportare in "Store da Programmare"'}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(visit.id);
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
      >
        <X className="w-3 h-3 text-red-500" />
      </button>
      <div className="font-medium truncate pr-6 text-foreground">
        {visit.stores?.name || 'Store sconosciuto'}
      </div>
      <div className="text-muted-foreground truncate">
        {visit.stores?.location}
      </div>
      <StatusBadge status={visit.status} />
    </div>
  );
};

const StoreBoxComponent = ({ storeBox, onRemove }: { storeBox: StoreBox; onRemove: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: storeBox.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-card border border-border rounded-lg shadow-sm cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StoreIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm text-card-foreground">{storeBox.store.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{storeBox.store.location}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            {storeBox.visit_type === 'white' ? 'White' : 'Tier 2'}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(storeBox.id);
          }}
          className="p-1 h-6 w-6"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

const DroppableStoreArea = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'store-area',
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors rounded-lg ${
        isOver ? 'bg-blue-50 border-2 border-blue-400 border-dashed' : ''
      }`}
    >
      {children}
    </div>
  );
};

export default function Visits() {
  const isMobile = useIsMobile();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [pendingStoreVisits, setPendingStoreVisits] = useState<PendingStoreVisit[]>([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedItem, setDraggedItem] = useState<StoreBox | Visit | null>(null);
  const [draggedType, setDraggedType] = useState<'store' | 'visit' | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedVisitType, setSelectedVisitType] = useState<'white' | 'tier2'>('white');
  
  // Filtri per la tab "Tutte le Visite"
  const [dateFilter, setDateFilter] = useState<'2weeks' | '1month' | 'all' | 'custom'>('2weeks');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;
  
  const { toast } = useToast();

  // Converte PendingStoreVisit in StoreBox per compatibilità
  const storeBoxes: StoreBox[] = pendingStoreVisits.map(pending => ({
    id: pending.id,
    store: pending.stores!,
    visit_type: pending.visit_type
  }));

  // Combina tutti gli elementi draggabili per SortableContext
  const allDraggableItems = [
    ...storeBoxes.map(box => box.id),
    ...visits.map(visit => `visit-${visit.id}`)
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-completa visite scadute al caricamento
  const autoCompleteExpiredVisits = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('visits')
        .update({ status: 'completed' })
        .lt('scheduled_date', today)
        .eq('status', 'scheduled');

      if (error) throw error;
      
      console.log('Visite scadute auto-completate');
    } catch (error) {
      console.error('Errore auto-completamento visite:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Fetch visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          stores(*)
        `)
        .order('scheduled_date');

      if (visitsError) throw visitsError;
      setVisits(visitsData as Visit[] || []);

      // Fetch training sessions
      const { data: trainingsData, error: trainingsError } = await supabase
        .from('training_sessions')
        .select(`
          *,
          stores(*),
          tacticians(id, name, role)
        `)
        .order('scheduled_date');

      if (trainingsError) throw trainingsError;
      setTrainingSessions(trainingsData as TrainingSession[] || []);

      // Fetch pending store visits
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_store_visits')
        .select(`
          *,
          stores(*)
        `)
        .order('created_at');

      if (pendingError) throw pendingError;
      setPendingStoreVisits(pendingData as PendingStoreVisit[] || []);

      // Auto-completa visite scadute
      await autoCompleteExpiredVisits();
      
      // Ricarica i dati dopo l'auto-completamento
      const { data: updatedVisitsData, error: updatedError } = await supabase
        .from('visits')
        .select(`
          *,
          stores(*)
        `)
        .order('scheduled_date');

      if (!updatedError) {
        const visitsData = updatedVisitsData as Visit[] || [];
        setVisits(visitsData);
        
        // Combina visits e training sessions per il calendario
        const combinedEvents: CalendarEvent[] = [
          ...visitsData.map(visit => ({
            id: visit.id,
            type: 'visit' as const,
            store_id: visit.store_id,
            scheduled_date: visit.scheduled_date,
            status: visit.status,
            notes: visit.notes,
            stores: visit.stores,
            visit_type: visit.visit_type
          })),
          ...trainingsData.map(training => ({
            id: training.id,
            type: 'training' as const,
            store_id: training.store_id,
            scheduled_date: training.scheduled_date,
            scheduled_time: training.scheduled_time,
            status: training.status as 'scheduled' | 'completed' | 'cancelled',
            notes: training.notes,
            stores: training.stores,
            tactician_name: training.tacticians?.name,
            tactician_role: training.tacticians?.role
          }))
        ];
        
        setCalendarEvents(combinedEvents);
        filterVisits(visitsData, dateFilter, customDate, searchTerm);
      }

    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati.",
        variant: "destructive",
      });
    }
  };

  // Genera calendario della settimana corrente
  const generateWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeek, i);
      days.push({
        date: day,
        dateStr: format(day, 'yyyy-MM-dd'),
        dayName: DAYS_OF_WEEK[i],
        dayNumber: format(day, 'd'),
        isToday: format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      });
    }
    return days;
  };

  const weekDays = generateWeekDays();

  // Filtra visite per giorno
  // Funzione per filtrare le visite
  const filterVisits = (visitsData: Visit[], filter: string, customDate?: Date, search?: string) => {
    let filtered = [...visitsData];
    
    // Filtro per data
    const now = new Date();
    switch (filter) {
      case '2weeks':
        const twoWeeksAgo = subWeeks(now, 2);
        filtered = filtered.filter(visit => new Date(visit.scheduled_date) >= twoWeeksAgo);
        break;
      case '1month':
        const oneMonthAgo = subMonths(now, 1);
        filtered = filtered.filter(visit => new Date(visit.scheduled_date) >= oneMonthAgo);
        break;
      case 'custom':
        if (customDate) {
          const customDateStr = format(customDate, 'yyyy-MM-dd');
          filtered = filtered.filter(visit => visit.scheduled_date === customDateStr);
        }
        break;
      case 'all':
      default:
        // Mostra tutte le visite
        break;
    }
    
    // Filtro per ricerca
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(visit => 
        visit.stores?.name?.toLowerCase().includes(searchLower) ||
        visit.stores?.location?.toLowerCase().includes(searchLower) ||
        visit.visit_type?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredVisits(filtered);
    setCurrentPage(1); // Reset alla prima pagina quando cambiano i filtri
  };

  const getEventsForDay = (dateStr: string) => {
    return calendarEvents.filter(event => event.scheduled_date === dateStr);
  };

  const importStores = async (category: 'white' | 'tier2') => {
    try {
      const categoryMap = { 'white': 'White', 'tier2': 'Tier 2' };
      const categoryStores = stores.filter(store => store.category === categoryMap[category]);
      
      // Filtra solo store che non sono già stati importati
      const alreadyImportedStoreIds = pendingStoreVisits.map(p => p.store_id);
      const storesToImport = categoryStores.filter(store => !alreadyImportedStoreIds.includes(store.id));
      
      if (storesToImport.length > 0) {
        const newPendingVisits = storesToImport.map(store => ({
          store_id: store.id,
          visit_type: category
        }));

        const { error } = await supabase
          .from('pending_store_visits')
          .insert(newPendingVisits);

        if (error) throw error;

        // Ricarica i dati
        await fetchData();

        toast({
          title: "Store importati",
          description: `${newPendingVisits.length} store ${category} sono stati aggiunti come box da programmare.`,
        });
      } else {
        toast({
          title: "Nessuno store da importare",
          description: `Tutti gli store ${categoryMap[category]} sono già stati importati o non esistono.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Errore importazione store:', error);
      toast({
        title: "Errore",
        description: "Impossibile importare gli store.",
        variant: "destructive",
      });
    }
  };

  const importSpecificStore = async () => {
    if (!selectedStoreId || !selectedVisitType) return;

    try {
      // Verifica se lo store è già stato importato
      const isAlreadyImported = pendingStoreVisits.some(p => p.store_id === selectedStoreId);
      
      if (isAlreadyImported) {
        toast({
          title: "Store già importato",
          description: "Questo store è già presente nella lista.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('pending_store_visits')
        .insert({
          store_id: selectedStoreId,
          visit_type: selectedVisitType
        });

      if (error) throw error;

      await fetchData();
      setShowImportDialog(false);
      setSelectedStoreId('');

      const selectedStore = stores.find(s => s.id === selectedStoreId);
      toast({
        title: "Store importato",
        description: `${selectedStore?.name} è stato aggiunto alla lista.`,
      });
    } catch (error) {
      console.error('Errore importazione store:', error);
      toast({
        title: "Errore",
        description: "Impossibile importare lo store.",
        variant: "destructive",
      });
    }
  };

  const removeStoreBox = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pending_store_visits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Errore rimozione store box:', error);
    }
  };

  const clearAllStoreBoxes = async () => {
    try {
      const { error } = await supabase
        .from('pending_store_visits')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      await fetchData();

      toast({
        title: "Box eliminati",
        description: "Tutti i box degli store sono stati rimossi.",
      });
    } catch (error) {
      console.error('Errore eliminazione box:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare i box.",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    if (active.id.toString().startsWith('visit-')) {
      const visitId = active.id.toString().replace('visit-', '');
      const visit = visits.find(v => v.id === visitId);
      setDraggedItem(visit || null);
      setDraggedType('visit');
    } else {
      const storeBox = storeBoxes.find(box => box.id === active.id);
      setDraggedItem(storeBox || null);
      setDraggedType('store');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag end - over:', over?.id, 'active:', active.id, 'draggedType:', draggedType);
    setDraggedItem(null);
    setDraggedType(null);

    if (!over) {
      // Se non c'è un target valido e si tratta di una visita, riportala negli store da programmare
      if (draggedType === 'visit') {
        const visitId = active.id.toString().replace('visit-', '');
        const visit = visits.find(v => v.id === visitId);
        
        if (!visit) return;

        try {
          // Crea un nuovo pending store visit
          const { error: insertError } = await supabase
            .from('pending_store_visits')
            .insert({
              store_id: visit.store_id,
              visit_type: visit.visit_type as 'white' | 'tier2'
            });

          if (insertError) throw insertError;

          // Rimuovi la visita originale
          const { error: deleteError } = await supabase
            .from('visits')
            .delete()
            .eq('id', visitId);

          if (deleteError) throw deleteError;

          await fetchData();

          toast({
            title: "Store riportato",
            description: `${visit.stores?.name} è stato riportato nella lista da programmare.`,
          });
        } catch (error) {
          console.error('Errore spostamento store:', error);
          toast({
            title: "Errore",
            description: "Impossibile spostare lo store.",
            variant: "destructive",
          });
        }
      }
      return;
    }

    // Se è stato rilasciato sull'area Store da Programmare
    if (over.id === 'store-area' && draggedType === 'visit') {
      const visitId = active.id.toString().replace('visit-', '');
      const visit = visits.find(v => v.id === visitId);
      
      if (!visit) return;

      try {
        // Crea un nuovo pending store visit
        const { error: insertError } = await supabase
          .from('pending_store_visits')
          .insert({
            store_id: visit.store_id,
            visit_type: visit.visit_type as 'white' | 'tier2'
          });

        if (insertError) throw insertError;

        // Rimuovi la visita originale
        const { error: deleteError } = await supabase
          .from('visits')
          .delete()
          .eq('id', visitId);

        if (deleteError) throw deleteError;

        await fetchData();

        toast({
          title: "Store riportato",
          description: `${visit.stores?.name} è stato riportato nella lista da programmare.`,
        });
      } catch (error) {
        console.error('Errore spostamento store:', error);
        toast({
          title: "Errore",
          description: "Impossibile spostare lo store.",
          variant: "destructive",
        });
      }
      return;
    }

    // Se è stato rilasciato su un giorno del calendario
    if (over.id.toString().startsWith('day-')) {
      const dateStr = over.id.toString().replace('day-', '');
      
      // Impedisci di programmare nel passato
      const targetDate = new Date(dateStr);
      const today = new Date(format(new Date(), 'yyyy-MM-dd'));
      
      if (targetDate < today) {
        toast({
          title: "Errore",
          description: "Non puoi programmare visite nel passato.",
          variant: "destructive",
        });
        return;
      }

      // Impedisci di programmare nei weekend
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = Domenica, 6 = Sabato
        toast({
          title: "Errore",
          description: "Non puoi programmare visite nei weekend.",
          variant: "destructive",
        });
        return;
      }

      try {
        if (draggedType === 'store') {
          // Gestisci trascinamento di un store box
          const storeBox = storeBoxes.find(box => box.id === active.id);
          if (!storeBox) return;

          // Crea la visita nel database
          const { error: visitError } = await supabase
            .from('visits')
            .insert({
              store_id: storeBox.store.id,
              scheduled_date: dateStr,
              visit_type: storeBox.visit_type,
              status: 'scheduled'
            });

          if (visitError) throw visitError;

          // Rimuovi il pending store visit
          const { error: deleteError } = await supabase
            .from('pending_store_visits')
            .delete()
            .eq('id', storeBox.id);

          if (deleteError) throw deleteError;
          
          toast({
            title: "Visita programmata",
            description: `Visita per ${storeBox.store.name} programmata per ${format(new Date(dateStr), 'dd/MM/yyyy', { locale: it })}.`,
          });

        } else if (draggedType === 'visit') {
          // Gestisci trascinamento di una visita esistente
          const visitId = active.id.toString().replace('visit-', '');
          
          const { error } = await supabase
            .from('visits')
            .update({ scheduled_date: dateStr })
            .eq('id', visitId);

          if (error) throw error;

          toast({
            title: "Visita riprogrammata",
            description: `Visita riprogrammata per ${format(new Date(dateStr), 'dd/MM/yyyy', { locale: it })}.`,
          });
        }

        // Ricarica i dati
        await fetchData();

      } catch (error) {
        console.error('Errore programmazione visita:', error);
        toast({
          title: "Errore",
          description: "Impossibile programmare la visita.",
          variant: "destructive",
        });
      }
    }
  };

  const deleteVisit = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      await fetchData();

      toast({
        title: "Visita cancellata",
        description: "La visita è stata cancellata con successo.",
      });
    } catch (error) {
      console.error('Errore cancellazione visita:', error);
      toast({
        title: "Errore",
        description: "Impossibile cancellare la visita.",
        variant: "destructive",
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? addWeeks(prev, -1) : addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const moveVisitToStoreList = async (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    try {
      // Crea un nuovo pending store visit
      const { error: insertError } = await supabase
        .from('pending_store_visits')
        .insert({
          store_id: visit.store_id,
          visit_type: visit.visit_type as 'white' | 'tier2'
        });

      if (insertError) throw insertError;

      // Rimuovi la visita originale
      const { error: deleteError } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (deleteError) throw deleteError;

      await fetchData();

      toast({
        title: "Store riportato",
        description: `${visit.stores?.name} è stato riportato nella lista da programmare.`,
      });
    } catch (error) {
      console.error('Errore spostamento store:', error);
      toast({
        title: "Errore",
        description: "Impossibile spostare lo store.",
        variant: "destructive",
      });
    }
  };

  // Gestione del cambiamento dei filtri
  useEffect(() => {
    filterVisits(visits, dateFilter, customDate, searchTerm);
  }, [dateFilter, customDate, searchTerm, visits]);

  // Calcolo della paginazione
  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, endIndex);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestione Visite</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Programma e gestisci le visite agli store
          </p>
        </div>
      </div>

      <DndContext
        sensors={isMobile ? [] : sensors} // Disabilita drag&drop su mobile
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className={isMobile ? "grid w-full grid-cols-2" : ""}>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="all">Tutte le Visite</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4 sm:space-y-6">
            {/* Area Store Box */}
            <Card>
              <DroppableStoreArea>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Store da Programmare ({storeBoxes.length})</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Importa store e trascinali nel calendario per programmare le visite
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            {isMobile ? 'Importa' : 'Importa Store'}
                          </Button>
                        </DialogTrigger>
                         <DialogContent className={isMobile ? "w-[95vw] max-w-[95vw]" : ""}>
                           <DialogHeader>
                             <DialogTitle>Importa Store Specifico</DialogTitle>
                           </DialogHeader>
                           <div className="space-y-4">
                             <div className="grid grid-cols-1 gap-4">
                               <div>
                                 <label className="text-sm font-medium mb-2 block">Seleziona Store</label>
                                 <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                                   <SelectTrigger>
                                     <SelectValue placeholder="Scegli uno store..." />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {stores.filter(store => !pendingStoreVisits.some(p => p.store_id === store.id)).map((store) => (
                                       <SelectItem key={store.id} value={store.id}>
                                         {store.name} - {store.location}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               </div>
                               <div>
                                 <label className="text-sm font-medium mb-2 block">Tipo Visita</label>
                                 <Select value={selectedVisitType} onValueChange={(value: 'white' | 'tier2') => setSelectedVisitType(value)}>
                                   <SelectTrigger>
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="white">White</SelectItem>
                                     <SelectItem value="tier2">Tier 2</SelectItem>
                                   </SelectContent>
                                 </Select>
                               </div>
                             </div>
                             <div className="flex gap-2 justify-end">
                               <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                                 Annulla
                               </Button>
                               <Button onClick={importSpecificStore} disabled={!selectedStoreId}>
                                 Importa
                               </Button>
                             </div>
                           </div>
                        </DialogContent>
                      </Dialog>
                      {!isMobile && (
                        <>
                          <Button onClick={() => importStores('white')} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Importa Store White
                          </Button>
                          <Button onClick={() => importStores('tier2')} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Importa Store Tier2
                          </Button>
                        </>
                      )}
                      {/* Mobile compact buttons */}
                      {isMobile && (
                        <div className="flex gap-1">
                          <Button onClick={() => importStores('white')} variant="outline" size="sm">
                            White
                          </Button>
                          <Button onClick={() => importStores('tier2')} variant="outline" size="sm">
                            Tier2
                          </Button>
                        </div>
                      )}
                      {storeBoxes.length > 0 && (
                        <Button onClick={clearAllStoreBoxes} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Elimina Tutti</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                {storeBoxes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <StoreIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuno store importato. Clicca sui pulsanti sopra per importare gli store.</p>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                    <SortableContext items={allDraggableItems} strategy={verticalListSortingStrategy}>
                      {storeBoxes.map((box) => (
                        <StoreBoxComponent key={box.id} storeBox={box} onRemove={removeStoreBox} />
                      ))}
                    </SortableContext>
                  </div>
                )}
              </CardContent>
              </DroppableStoreArea>
            </Card>

            {/* Calendario Settimanale */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Calendario Settimanale</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Settimana del {format(currentWeek, 'dd/MM/yyyy', { locale: it })}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => navigateWeek('prev')} variant="outline" size="sm">
                      <span className="hidden sm:inline">← Settimana Precedente</span>
                      <span className="sm:hidden">← Prec</span>
                    </Button>
                    <Button onClick={goToCurrentWeek} variant="outline" size="sm">
                      Oggi
                    </Button>
                    <Button onClick={() => navigateWeek('next')} variant="outline" size="sm">
                      <span className="hidden sm:inline">Settimana Successiva →</span>
                      <span className="sm:hidden">Succ →</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={isMobile ? "p-2" : "overflow-x-auto"}>
                {isMobile ? (
                  // Vista mobile: lista verticale dei giorni
                  <div className="space-y-3">
                    <SortableContext items={allDraggableItems} strategy={verticalListSortingStrategy}>
                      {weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day.dateStr);
                        const isPastDate = new Date(day.dateStr) < new Date(format(new Date(), 'yyyy-MM-dd'));
                        const isWeekend = day.dayName === 'Sab' || day.dayName === 'Dom';
                        const isDisabled = isPastDate || isWeekend;
                        
                        return (
                          <Card key={day.dateStr} className={`${day.isToday ? 'border-primary' : ''} ${isDisabled ? 'opacity-50' : ''}`}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className={`font-medium ${day.isToday ? 'text-primary' : ''}`}>
                                    {day.dayName} {day.dayNumber}
                                  </h4>
                                  {isWeekend && <span className="text-xs text-muted-foreground">(non disponibile)</span>}
                                </div>
                                <Badge variant={dayEvents.length > 0 ? 'default' : 'secondary'} className="text-xs">
                                  {dayEvents.length} visite
                                </Badge>
                              </div>
                            </CardHeader>
                            {dayEvents.length > 0 && (
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  {dayEvents.map((event) => (
                                    <MobileEventCard
                                      key={event.id}
                                      event={event}
                                      onDelete={deleteVisit}
                                      onMoveToStoreList={moveVisitToStoreList}
                                      disabled={isDisabled}
                                    />
                                  ))}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </SortableContext>
                  </div>
                ) : (
                  // Vista desktop: griglia originale
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[600px]">
                    <SortableContext items={allDraggableItems} strategy={verticalListSortingStrategy}>
                      {weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day.dateStr);
                        return (
                          <DroppableDay
                            key={day.dateStr}
                            day={day}
                            events={dayEvents}
                            onDeleteVisit={deleteVisit}
                            onMoveToStoreList={moveVisitToStoreList}
                          />
                        );
                      })}
                    </SortableContext>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <CardTitle>Tutte le Visite ({filteredVisits.length})</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Lista delle visite con filtri e paginazione
                    </p>
                  </div>
                  
                  {/* Filtri */}
                  <div className={`flex ${isMobile ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
                    <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                      <Input
                        placeholder="Cerca store..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={isMobile ? "w-full" : "w-40"}
                      />
                      <Select value={dateFilter} onValueChange={(value: '2weeks' | '1month' | 'all' | 'custom') => setDateFilter(value)}>
                        <SelectTrigger className={isMobile ? "w-full" : "w-40"}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2weeks">Ultime 2 settimane</SelectItem>
                          <SelectItem value="1month">Ultimo mese</SelectItem>
                          <SelectItem value="all">Tutte</SelectItem>
                          <SelectItem value="custom">Data specifica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {dateFilter === 'custom' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`justify-start text-left font-normal ${isMobile ? 'w-full' : 'w-40'}`}>
                            <Calendar className="mr-2 h-4 w-4" />
                            {customDate ? format(customDate, 'dd/MM/yyyy') : 'Seleziona data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={customDate}
                            onSelect={setCustomDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {visits.length === 0 
                        ? 'Nessuna visita programmata al momento.' 
                        : 'Nessuna visita trovata con i filtri selezionati.'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedVisits.map((visit) => (
                        <div key={visit.id} className={`${isMobile ? 'p-3' : 'p-4'} border rounded-lg`}>
                          <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                            <div className={`${isMobile ? 'space-y-2' : 'flex items-center gap-4'}`}>
                              <StoreIcon className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-muted-foreground ${isMobile ? 'inline' : ''}`} />
                              <div className={isMobile ? 'inline ml-2' : ''}>
                                <h3 className="font-medium text-foreground">{visit.stores?.name || 'Store sconosciuto'}</h3>
                                <p className="text-sm text-muted-foreground">{visit.stores?.location}</p>
                                <div className={`${isMobile ? 'flex flex-wrap' : 'flex items-center'} gap-2 mt-1`}>
                                  <Badge variant="outline">
                                    {visit.visit_type === 'white' ? 'White' : 'Tier 2'}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(visit.scheduled_date), 'dd/MM/yyyy', { locale: it })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`${isMobile ? 'flex justify-end' : 'flex items-center gap-2'}`}>
                              <StatusBadge status={visit.status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Paginazione */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                                }}
                                className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1)
                              ) {
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage(page);
                                      }}
                                      isActive={currentPage === page}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              } else if (
                                page === currentPage - 2 ||
                                page === currentPage + 2
                              ) {
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              }
                              return null;
                            })}
                            
                            <PaginationItem>
                              <PaginationNext 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                }}
                                className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DragOverlay>
          {draggedItem ? (
            <div className="p-3 bg-card border border-border rounded-lg shadow-lg opacity-90">
              <div className="flex items-center gap-2 mb-1">
                <StoreIcon className="w-4 h-4" />
                <span className="font-medium text-sm text-card-foreground">
                  {draggedType === 'store' 
                    ? (draggedItem as StoreBox).store.name 
                    : (draggedItem as Visit).stores?.name || 'Store sconosciuto'
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {draggedType === 'store' 
                  ? (draggedItem as StoreBox).store.location 
                  : (draggedItem as Visit).stores?.location
                }
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}