import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link2, Store, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Table } from '@/types/table';

interface Store {
  id: string;
  name: string;
  location: string;
  chain: string;
  category: string;
}

interface TableStoreAssociationProps {
  table: Table;
  trigger?: React.ReactNode;
  onAssociationChanged?: () => void;
}

export function TableStoreAssociation({ 
  table, 
  trigger,
  onAssociationChanged 
}: TableStoreAssociationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [associatedStores, setAssociatedStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Carica tutti gli store
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, location, chain, category')
        .order('name');

      if (storesError) throw storesError;

      // Carica gli store già associati a questo tavolo
      const { data: associationsData, error: associationsError } = await supabase
        .from('store_tables')
        .select(`
          stores (
            id,
            name,
            location,
            chain,
            category
          )
        `)
        .eq('table_id', table.id);

      if (associationsError) throw associationsError;

      setStores(storesData || []);
      const associated = associationsData?.map(item => item.stores).filter(Boolean) || [];
      setAssociatedStores(associated as Store[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreToggle = async (store: Store, isChecked: boolean) => {
    setIsSaving(true);
    try {
      if (isChecked) {
        // Associa il tavolo allo store
        const { error } = await supabase
          .from('store_tables')
          .insert({
            store_id: store.id,
            table_id: table.id
          });

        if (error) throw error;
        
        setAssociatedStores(prev => [...prev, store]);
        toast.success(`Tavolo associato a ${store.name}`);
      } else {
        // Rimuovi l'associazione
        const { error } = await supabase
          .from('store_tables')
          .delete()
          .eq('store_id', store.id)
          .eq('table_id', table.id);

        if (error) throw error;
        
        setAssociatedStores(prev => prev.filter(s => s.id !== store.id));
        toast.success(`Associazione rimossa da ${store.name}`);
      }
      
      onAssociationChanged?.();
    } catch (error) {
      console.error('Error updating association:', error);
      toast.error('Errore nell\'aggiornamento dell\'associazione');
    } finally {
      setIsSaving(false);
    }
  };

  const isStoreAssociated = (storeId: string) => {
    return associatedStores.some(store => store.id === storeId);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.chain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, table.id]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex-1">
      <Link2 className="w-4 h-4 mr-2" />
      Associa
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Associa Tavolo agli Store</DialogTitle>
          <DialogDescription>
            Seleziona gli store a cui associare il tavolo "{table.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Store già associati */}
          {associatedStores.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Store già associati:</h4>
              <div className="flex flex-wrap gap-2">
                {associatedStores.map(store => (
                  <Badge key={store.id} variant="secondary" className="gap-2">
                    <Store className="w-3 h-3" />
                    {store.name} - {store.location}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca store per nome, posizione o catena..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista store */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Caricamento store...</p>
            </div>
          ) : (
            <ScrollArea className="h-96 border rounded-lg">
              <div className="p-4 space-y-3">
                {filteredStores.map(store => {
                  const isAssociated = isStoreAssociated(store.id);
                  return (
                    <Card key={store.id} className="p-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isAssociated}
                          onCheckedChange={(checked) => 
                            handleStoreToggle(store, checked as boolean)
                          }
                          disabled={isSaving}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{store.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {store.chain}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {store.location} • {store.category}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                
                {filteredStores.length === 0 && (
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nessuno store trovato</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}