import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TableType, Table } from "@/types/table";

interface TableFormProps {
  onTableCreated: () => void;
  table?: Table; // Per la modifica
  trigger?: React.ReactNode; // Per customizzare il trigger
}

export function TableForm({ onTableCreated, table, trigger }: TableFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(table?.name || "");
  const [tableType, setTableType] = useState<TableType | "">(table?.table_type || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditing = !!table;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !tableType) {
      toast.error("Compila tutti i campi richiesti");
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditing) {
        // Modifica tavolo esistente
        const { error } = await supabase
          .from("tables")
          .update({
            name: name.trim(),
            table_type: tableType,
          })
          .eq('id', table.id);

        if (error) throw error;
        toast.success("Tavolo modificato con successo");
      } else {
        // Crea nuovo tavolo
        const { error } = await supabase
          .from("tables")
          .insert({
            name: name.trim(),
            table_type: tableType,
          });

        if (error) throw error;
        toast.success("Tavolo creato con successo");
      }

      if (!isEditing) {
        setName("");
        setTableType("");
      }
      setOpen(false);
      onTableCreated();
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} table:`, error);
      toast.error(`Errore nella ${isEditing ? 'modifica' : 'creazione'} del tavolo`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Tavolo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifica Tavolo' : 'Crea Nuovo Tavolo'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome Tavolo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il nome del tavolo"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="table_type">Tipologia</Label>
            <Select value={tableType} onValueChange={(value: TableType) => setTableType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="singolo">Singolo</SelectItem>
                <SelectItem value="doppio_back_to_back">Doppio Back to Back</SelectItem>
                <SelectItem value="doppio_free_standing">Doppio Free Standing</SelectItem>
                <SelectItem value="test">Test (con immagine)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (isEditing ? "Modifica..." : "Creazione...") 
                : (isEditing ? "Modifica Tavolo" : "Crea Tavolo")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}