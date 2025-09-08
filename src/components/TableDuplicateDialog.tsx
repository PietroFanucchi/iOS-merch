import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Table } from "@/types/table";

interface TableDuplicateDialogProps {
  table: Table;
  onTableDuplicated: () => void;
  trigger?: React.ReactNode;
}

export function TableDuplicateDialog({ table, onTableDuplicated, trigger }: TableDuplicateDialogProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(`${table.name} - Copia`);
  const [isLoading, setIsLoading] = useState(false);

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast.error("Inserisci un nome per il tavolo duplicato");
      return;
    }

    setIsLoading(true);
    
    try {
      // Duplica il tavolo con tutti i suoi dati
      const { error } = await supabase
        .from("tables")
        .insert({
          name: newName.trim(),
          table_type: table.table_type,
          devices: table.devices || [],
          // Note: price_tags might not be in the type but exists in DB
          price_tags: (table as any).price_tags || []
        });

      if (error) throw error;
      
      toast.success(`Tavolo "${newName}" duplicato con successo`);
      setOpen(false);
      setNewName(`${table.name} - Copia`); // Reset per il prossimo utilizzo
      onTableDuplicated();
    } catch (error) {
      console.error('Error duplicating table:', error);
      toast.error("Errore durante la duplicazione del tavolo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Duplica
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplica Tavolo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleDuplicate} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Stai duplicando il tavolo: <strong>{table.name}</strong>
          </div>
          
          <div>
            <Label htmlFor="newName">Nome del nuovo tavolo</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Inserisci il nome del nuovo tavolo"
              required
              autoFocus
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Il nuovo tavolo avrà gli stessi dispositivi e cartelli prezzo del tavolo originale.
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Duplicazione..." : "Duplica Tavolo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}