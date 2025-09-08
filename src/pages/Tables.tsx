import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Table as TableIcon, Smartphone, Tablet, Monitor, Edit, Check, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TableForm } from '@/components/TableForm';
import { TableStoreAssociation } from '@/components/TableStoreAssociation';
import { TableDuplicateDialog } from '@/components/TableDuplicateDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Table } from '@/types/table';

const getTableTypeLabel = (type: string) => {
  switch (type) {
    case 'singolo':
      return 'Singolo';
    case 'doppio_back_to_back':
      return 'Doppio Back to Back';
    case 'doppio_free_standing':
      return 'Doppio Free Standing';
    default:
      return type;
  }
};

const deviceIcons = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Monitor,
  'Apple Watch': Smartphone,
  AirPods: Smartphone,
  'Apple TV': Monitor,
  Accessories: Smartphone,
};

export default function Tables() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [assignedTables, setAssignedTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const isTemplateView = !storeSlug; // Se non c'è storeId siamo nella vista template globale

  const fetchTables = async () => {
    try {
      if (isTemplateView) {
        // Vista template globale - mostra tutti i tavoli template
        const { data, error } = await supabase
          .from('tables')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTables((data as Table[]) || []);
      } else {
        // Prima trova lo store ID dal slug
        if (!storeSlug) return;
        
        const { data: allStores, error: storesError } = await supabase
          .from('stores')
          .select('id, name');

        if (storesError) throw storesError;

        const matchingStore = allStores?.find(s => {
          const generatedSlug = s.name.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          return generatedSlug === storeSlug;
        });

        if (!matchingStore) {
          throw new Error('Store non trovato');
        }

        setStoreId(matchingStore.id);

        // Vista store specifico - carica tutti i template e i tavoli già assegnati
        const [templatesResponse, assignedResponse] = await Promise.all([
          supabase.from('tables').select('*').order('created_at', { ascending: false }),
          supabase.from('store_tables').select(`
            table_id,
            tables (*)
          `).eq('store_id', matchingStore.id)
        ]);

        if (templatesResponse.error) throw templatesResponse.error;
        if (assignedResponse.error) throw assignedResponse.error;
        
        setTables((templatesResponse.data as Table[]) || []);
        
        const assigned = assignedResponse.data?.map(item => item.tables).filter(Boolean) || [];
        setAssignedTables(assigned as Table[]);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Errore nel caricamento dei tavoli');
    } finally {
      setIsLoading(false);
    }
  };

  const assignTableToStore = async (tableId: string) => {
    try {
      const { error } = await supabase
        .from('store_tables')
        .insert({
          store_id: storeId,
          table_id: tableId
        });

      if (error) throw error;
      
      // Sincronizza i price tags per questo store
      await syncPriceTagsWithChain();
      
      toast.success('Tavolo assegnato allo store');
      fetchTables(); // Ricarica i dati
    } catch (error) {
      console.error('Error assigning table:', error);
      toast.error('Errore nell\'assegnazione del tavolo');
    }
  };

  const removeTableFromStore = async (tableId: string) => {
    try {
      const { error } = await supabase
        .from('store_tables')
        .delete()
        .eq('store_id', storeId)
        .eq('table_id', tableId);

      if (error) throw error;
      
      // Sincronizza i price tags per questo store
      await syncPriceTagsWithChain();
      
      toast.success('Tavolo rimosso dallo store');
      fetchTables(); // Ricarica i dati
    } catch (error) {
      console.error('Error removing table:', error);
      toast.error('Errore nella rimozione del tavolo');
    }
  };

  const syncPriceTagsWithChain = async () => {
    try {
      // Ottieni le informazioni dello store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('chain')
        .eq('id', storeId)
        .single();

      if (storeError || !store) return;

      // Ottieni tutti i price tags dai tavoli assegnati a questo store
      const { data: storeTables, error: storeTablesError } = await supabase
        .from('store_tables')
        .select(`
          tables (
            price_tags
          )
        `)
        .eq('store_id', storeId);

      if (storeTablesError) return;

      // Estrai tutti i price tags unici
      const allPriceTags = new Set();
      storeTables?.forEach(storeTable => {
        const table = storeTable.tables as any;
        if (table?.price_tags) {
          table.price_tags.forEach((tag: any) => {
            if (tag.name && tag.name.trim()) {
              allPriceTags.add(tag.name.trim());
            }
          });
        }
      });

      // Rimuovi tutti i price tags esistenti per questa chain
      await supabase
        .from('chain_price_tags')
        .delete()
        .eq('chain', store.chain);

      // Inserisci i nuovi price tags
      if (allPriceTags.size > 0) {
        const priceTagsToInsert = Array.from(allPriceTags).map(name => ({
          chain: store.chain,
          name: name as string
        }));

        await supabase
          .from('chain_price_tags')
          .insert(priceTagsToInsert);
      }
    } catch (error) {
      console.error('Error syncing price tags:', error);
    }
  };

  const isTableAssigned = (tableId: string) => {
    return assignedTables.some(table => table.id === tableId);
  };

  useEffect(() => {
    fetchTables();
  }, [storeSlug]);

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isTemplateView ? 'Template Tavoli' : 'Assegna Tavoli allo Store'}
          </h1>
          <p className="text-muted-foreground">
            {isTemplateView 
              ? 'Crea e gestisci template di tavoli da assegnare agli store'
              : 'Seleziona i template di tavoli da assegnare a questo store'
            }
          </p>
        </div>
        {isTemplateView && (
          <TableForm onTableCreated={fetchTables} />
        )}
      </div>

      {/* Search */}
      <Card className="card-apple">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cerca tavoli per nome o descrizione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input-apple"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Caricamento tavoli...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTables.map((table) => (
            <Card 
              key={table.id} 
              className="card-apple animate-scale-in"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                      <TableIcon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                      <CardDescription>
                        {getTableTypeLabel(table.table_type)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="badge-primary">
                    {table.devices?.length || 0} dispositivi
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {table.devices && table.devices.length > 0 ? (
                    <div>
                      <h4 className="font-medium mb-3">Oggetti per categoria:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const categoryCounts = table.devices.reduce((acc: Record<string, number>, device: any) => {
                            const category = device.type || 'Altro';
                            acc[category] = (acc[category] || 0) + (device.quantity || 1);
                            return acc;
                          }, {});
                          
                           return Object.entries(categoryCounts).map(([category, count]: [string, number]) => (
                            <div key={category} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                              <span className="text-sm font-medium">{category}</span>
                              <Badge className="badge-secondary">×{count}</Badge>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <TableIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Clicca per configurare il tavolo</p>
                    </div>
                  )}
                   {isTemplateView ? (
                     <div className="space-y-2 pt-2 border-t border-border">
                       <div className="flex gap-2">
                         <TableForm 
                           table={table}
                           onTableCreated={fetchTables}
                           trigger={
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="flex-1"
                             >
                               <Edit className="w-4 h-4 mr-2" />
                               Modifica
                             </Button>
                           }
                         />
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="flex-1"
                           onClick={() => navigate(`/tables/${table.id}/configure`)}
                         >
                           <TableIcon className="w-4 h-4 mr-2" />
                           Configura
                         </Button>
                       </div>
                       <div className="flex gap-2">
                         <TableDuplicateDialog 
                           table={table}
                           onTableDuplicated={fetchTables}
                           trigger={
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="flex-1"
                             >
                               <Copy className="w-4 h-4 mr-2" />
                               Duplica
                             </Button>
                           }
                         />
                         <TableStoreAssociation 
                           table={table}
                           onAssociationChanged={fetchTables}
                         />
                       </div>
                     </div>
                  ) : (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      {isTableAssigned(table.id) ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-green-600 border-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTableFromStore(table.id);
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Assegnato
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignTableToStore(table.id);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Assegna
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <TableIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessun tavolo trovato</h3>
          <p className="text-muted-foreground">Prova a modificare il termine di ricerca</p>
        </div>
      )}
    </div>
  );
}
