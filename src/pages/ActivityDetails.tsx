import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Store, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface Store {
  id: string;
  name: string;
  chain: string;
  category: string;
  location: string;
}

interface ActivityStore {
  id: string;
  activity_id: string;
  store_id: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  hasVisitToday?: boolean;
}

export default function ActivityDetails() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activity, setActivity] = useState<Activity | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activityStores, setActivityStores] = useState<ActivityStore[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (activityId) {
      fetchActivityDetails();
      fetchStores();
      fetchActivityStores();
    }
  }, [activityId]);

  const fetchActivityDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("id", activityId)
        .single();

      if (error) throw error;
      setActivity(data);
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli dell'attività",
        variant: "destructive",
      });
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare gli store",
        variant: "destructive",
      });
    }
  };

  const fetchActivityStores = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("activity_stores")
        .select(`
          *,
          stores:store_id (
            id,
            name,
            chain,
            category,
            location
          )
        `)
        .eq("activity_id", activityId);

      if (error) throw error;
      
      // Fetch visits for today for all stores in this activity
      const storeIds = (data || []).map(item => item.store_id);
      let visitsToday: any[] = [];
      
      if (storeIds.length > 0) {
        const { data: visitData, error: visitError } = await supabase
          .from("visits")
          .select("store_id")
          .in("store_id", storeIds)
          .eq("scheduled_date", today);
        
        if (!visitError) {
          visitsToday = visitData || [];
        }
      }
      
      // Add visit info to activity stores
      const activityStoresWithVisits = (data || []).map(item => ({
        ...item,
        hasVisitToday: visitsToday.some(visit => visit.store_id === item.store_id)
      }));
      
      setActivityStores(activityStoresWithVisits);
      setSelectedStores(activityStoresWithVisits.map(item => item.store_id));
    } catch (error) {
      console.error("Error fetching activity stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateActivityStatus = async (newStatus: string) => {
    if (!activity) return;

    try {
      const { data, error } = await supabase
        .from("activities")
        .update({ status: newStatus })
        .eq("id", activity.id)
        .select()
        .single();

      if (error) throw error;

      setActivity(data);
      toast({
        title: "Successo",
        description: "Status attività aggiornato",
      });
    } catch (error) {
      console.error("Error updating activity status:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo status",
        variant: "destructive",
      });
    }
  };

  const toggleStoreSelection = async (storeId: string) => {
    const isSelected = selectedStores.includes(storeId);
    
    try {
      if (isSelected) {
        // Remove store from activity
        const { error } = await supabase
          .from("activity_stores")
          .delete()
          .eq("activity_id", activityId)
          .eq("store_id", storeId);

        if (error) throw error;

        setSelectedStores(prev => prev.filter(id => id !== storeId));
        setActivityStores(prev => prev.filter(item => item.store_id !== storeId));

        toast({
          title: "Successo",
          description: "Store rimosso dall'attività",
        });
      } else {
        // Add store to activity
        const { data, error } = await supabase
          .from("activity_stores")
          .insert({
            activity_id: activityId,
            store_id: storeId,
            completed: false
          })
          .select(`
            *,
            stores:store_id (
              id,
              name,
              chain,
              category,
              location
            )
          `)
          .single();

        if (error) throw error;

        setSelectedStores(prev => [...prev, storeId]);
        setActivityStores(prev => [...prev, data]);

        toast({
          title: "Successo",
          description: "Store aggiunto all'attività",
        });
      }
    } catch (error) {
      console.error("Error toggling store selection:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la selezione",
        variant: "destructive",
      });
    }
  };

  const toggleStoreCompletion = async (activityStoreId: string) => {
    const activityStore = activityStores.find(item => item.id === activityStoreId);
    if (!activityStore) return;

    const newCompletedState = !activityStore.completed;
    
    try {
      const { data, error } = await supabase
        .from("activity_stores")
        .update({ 
          completed: newCompletedState,
          completed_at: newCompletedState ? new Date().toISOString() : null
        })
        .eq("id", activityStoreId)
        .select(`
          *,
          stores:store_id (
            id,
            name,
            chain,
            category,
            location
          )
        `)
        .single();

      if (error) throw error;
      
      setActivityStores(prev => 
        prev.map(item => item.id === activityStoreId ? data : item)
      );

      toast({
        title: "Successo",
        description: newCompletedState ? "Attività completata per questo store" : "Attività marcata come non completata",
      });
    } catch (error) {
      console.error("Error toggling store completion:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    }
  };

  const selectAllStoresByCategory = async (category: string) => {
    const categoryStores = stores.filter(store => 
      store.category.toLowerCase() === category.toLowerCase()
    );
    const categoryStoreIds = categoryStores.map(store => store.id);
    const unselectedStores = categoryStores.filter(store => !selectedStores.includes(store.id));
    
    if (unselectedStores.length === 0) {
      toast({
        title: "Info",
        description: `Tutti gli store ${category} sono già selezionati`,
      });
      return;
    }

    try {
      // Aggiungi tutti gli store non selezionati della categoria
      const insertData = unselectedStores.map(store => ({
        activity_id: activityId,
        store_id: store.id,
        completed: false
      }));

      const { data, error } = await supabase
        .from("activity_stores")
        .insert(insertData)
        .select(`
          *,
          stores:store_id (
            id,
            name,
            chain,
            category,
            location
          )
        `);

      if (error) throw error;

      setSelectedStores(prev => [...prev, ...unselectedStores.map(s => s.id)]);
      setActivityStores(prev => [...prev, ...(data || [])]);

      toast({
        title: "Successo",
        description: `Aggiunti ${unselectedStores.length} store ${category} all'attività`,
      });
    } catch (error) {
      console.error("Error selecting stores by category:", error);
      toast({
        title: "Errore",
        description: "Impossibile selezionare gli store",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "completata":
        return "default";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "completata":
        return "Completata";
      default:
        return status;
    }
  };

  // Calcola statistiche
  const completedStores = activityStores.filter(item => item.completed).length;
  const totalStores = activityStores.length;
  const completionPercentage = totalStores > 0 ? Math.round((completedStores / totalStores) * 100) : 0;

  // Ordina store: prima quelli con visite oggi, poi non completati, poi completati
  const sortedActivityStores = [...activityStores].sort((a, b) => {
    // Prima priorità: visite programmate per oggi (solo per store non completati)
    if (!a.completed && !b.completed) {
      if (a.hasVisitToday !== b.hasVisitToday) {
        return a.hasVisitToday ? -1 : 1; // hasVisitToday = true va prima
      }
    }
    
    // Seconda priorità: stato di completamento
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // non completati prima
    }
    
    // Terza priorità: ordine alfabetico
    const storeAName = (a as any).stores?.name || '';
    const storeBName = (b as any).stores?.name || '';
    return storeAName.localeCompare(storeBName);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Attività non trovata</h2>
        <Button onClick={() => navigate("/activities")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alle attività
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/activities")}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{activity.name}</h1>
          <p className="text-muted-foreground">
            Creata il {new Date(activity.created_at).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(activity.status)}>
          {getStatusLabel(activity.status)}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="stores">Store ({selectedStores.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status Attività</CardTitle>
                <CardDescription>
                  Gestisci lo stato dell'attività
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Status Corrente</Label>
                    <Select
                      value={activity.status}
                      onValueChange={updateActivityStatus}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiche</CardTitle>
                <CardDescription>
                  Informazioni sull'attività
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-2">
                    <div className="text-2xl font-bold text-primary">
                      {totalStores}
                    </div>
                    <div className="text-xs text-muted-foreground">Store Coinvolti</div>
                  </div>
                  <div className="text-center p-2">
                    <div className="text-2xl font-bold text-primary">
                      {completionPercentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">Completamento</div>
                  </div>
                  <div className="text-center p-2">
                    <div className="text-2xl font-bold text-primary">
                      {Math.ceil((new Date().getTime() - new Date(activity.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-xs text-muted-foreground">Giorni Attivi</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Store Impattati ({totalStores})</CardTitle>
              <CardDescription>
                Store coinvolti nell'attività con stato di completamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalStores === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun store assegnato a questa attività
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedActivityStores.map((activityStore) => {
                    const store = (activityStore as any).stores;
                    if (!store) return null;
                    
                    return (
                      <div
                        key={activityStore.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          activityStore.completed 
                            ? 'bg-green-50 border-green-200 opacity-60' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                             <span className={`font-medium ${activityStore.completed ? 'line-through text-muted-foreground' : ''}`}>
                               {store.name}
                             </span>
                             {activityStore.hasVisitToday && !activityStore.completed && (
                               <Badge variant="secondary" className="text-xs px-2 py-0">
                                 Visita Oggi
                               </Badge>
                             )}
                             {activityStore.completed && (
                               <Check className="h-4 w-4 text-green-600" />
                             )}
                           </div>
                          <p className="text-sm text-muted-foreground">
                            {store.chain} • {store.location}
                          </p>
                          {activityStore.completed && activityStore.completed_at && (
                            <p className="text-xs text-green-600">
                              Completata il {new Date(activityStore.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant={activityStore.completed ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleStoreCompletion(activityStore.id)}
                          className="ml-4"
                        >
                          {activityStore.completed ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Annulla
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Completa
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Store</CardTitle>
              <CardDescription>
                Aggiungi o rimuovi store da questa attività
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Cerca store..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllStoresByCategory("White")}
                  >
                    Seleziona tutti White
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllStoresByCategory("Tier2")}
                  >
                    Seleziona tutti Tier2
                  </Button>
                </div>
                
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {stores.filter(store =>
                    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    store.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    store.chain.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((store) => {
                    const isSelected = selectedStores.includes(store.id);
                    return (
                      <div
                        key={store.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={store.id}
                          checked={isSelected}
                          onCheckedChange={() => toggleStoreSelection(store.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={store.id}
                              className="font-medium cursor-pointer"
                            >
                              {store.name}
                            </Label>
                            {isSelected && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {store.chain} • {store.location}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}