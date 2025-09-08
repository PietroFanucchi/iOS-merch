import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export default function Activities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le attività",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async () => {
    if (!newActivityName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("activities")
        .insert([{ name: newActivityName }])
        .select()
        .single();

      if (error) throw error;

      setActivities([data, ...activities]);
      setNewActivityName("");
      setCreateDialogOpen(false);
      toast({
        title: "Successo",
        description: "Attività creata con successo",
      });
    } catch (error) {
      console.error("Error creating activity:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'attività",
        variant: "destructive",
      });
    }
  };

  const updateActivity = async () => {
    if (!selectedActivity) return;

    try {
      const { data, error } = await supabase
        .from("activities")
        .update({ name: selectedActivity.name })
        .eq("id", selectedActivity.id)
        .select()
        .single();

      if (error) throw error;

      setActivities(activities.map(activity => 
        activity.id === selectedActivity.id ? data : activity
      ));
      setEditDialogOpen(false);
      setSelectedActivity(null);
      toast({
        title: "Successo",
        description: "Attività aggiornata con successo",
      });
    } catch (error) {
      console.error("Error updating activity:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'attività",
        variant: "destructive",
      });
    }
  };

  const deleteActivity = async () => {
    if (!selectedActivity) return;

    try {
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", selectedActivity.id);

      if (error) throw error;

      setActivities(activities.filter(activity => activity.id !== selectedActivity.id));
      setDeleteDialogOpen(false);
      setSelectedActivity(null);
      toast({
        title: "Successo",
        description: "Attività eliminata con successo",
      });
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'attività",
        variant: "destructive",
      });
    }
  };

  const updateActivityStatus = async (activityId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .update({ status: newStatus })
        .eq("id", activityId)
        .select()
        .single();

      if (error) throw error;

      setActivities(activities.map(activity => 
        activity.id === activityId ? data : activity
      ));
      
      if (selectedActivity && selectedActivity.id === activityId) {
        setSelectedActivity(data);
      }

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

  const handleActivityClick = (activity: Activity) => {
    navigate(`/activities/${activity.id}`);
  };

  const handleEditClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setDeleteDialogOpen(true);
  };

  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Caricamento attività...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attività</h1>
          <p className="text-muted-foreground">Gestisci le attività del sistema</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Attività
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuova Attività</DialogTitle>
              <DialogDescription>
                Inserisci i dettagli per la nuova attività.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="name"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  className="col-span-3"
                  placeholder="Nome attività"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={createActivity}>Crea Attività</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca attività..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              {searchTerm ? "Nessuna attività trovata" : "Nessuna attività presente"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleActivityClick(activity)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                   <CardTitle className="text-lg">
                     {activity.name}
                   </CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(activity);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(activity);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Creata il {new Date(activity.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusBadgeVariant(activity.status)}>
                    {getStatusLabel(activity.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Attività</DialogTitle>
            <DialogDescription>
              Modifica i dettagli dell'attività.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-name"
                value={selectedActivity?.name || ""}
                onChange={(e) => 
                  setSelectedActivity(selectedActivity ? 
                    { ...selectedActivity, name: e.target.value } : null
                  )
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={updateActivity}>Salva Modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Attività</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'attività "{selectedActivity?.name}"? 
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={deleteActivity}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedActivity?.name}</DialogTitle>
            <DialogDescription>
              Gestisci i dettagli dell'attività
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Status Panel */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Status Attività</Label>
              <Select
                value={selectedActivity?.status || "pending"}
                onValueChange={(value) => {
                  if (selectedActivity) {
                    updateActivityStatus(selectedActivity.id, value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completata">Completata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Store Selection Panel */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Store Impattati</Label>
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Funzionalità di selezione store in arrivo...
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}