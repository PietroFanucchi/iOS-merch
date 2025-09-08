import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StoreFormProps {
  onStoreCreated: () => void;
}

export default function StoreForm({ onStoreCreated }: StoreFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    chain: '',
    location: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('stores')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Store creato",
        description: "Il nuovo store è stato creato con successo.",
      });

      setFormData({
        name: '',
        category: '',
        chain: '',
        location: ''
      });
      setOpen(false);
      onStoreCreated();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la creazione dello store.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuovo Store</DialogTitle>
          <DialogDescription>
            Aggiungi un nuovo store Apple alla tua rete
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Store</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Es. MediaWorld Milano Centro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="White">White</SelectItem>
                <SelectItem value="Tier 2">Tier 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chain">Catena</Label>
            <Select value={formData.chain} onValueChange={(value) => setFormData({ ...formData, chain: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona catena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MediaWorld">MediaWorld</SelectItem>
                <SelectItem value="Comet">Comet</SelectItem>
                <SelectItem value="Euronics">Euronics</SelectItem>
                <SelectItem value="Unieuro">Unieuro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Posizione</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Es. Milano, Lombardia"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.category || !formData.chain || !formData.location} className="flex-1 btn-primary">
              {loading ? "Creazione..." : "Crea Store"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}