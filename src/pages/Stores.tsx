import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store as StoreIcon, MapPin, Table, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import StoreForm from '@/components/StoreForm';

interface Store {
  id: string;
  name: string;
  category: string;
  chain: string;
  location: string;
  tables_count: number;
  assignedTableNames?: string[];
  missing_devices_count?: number;
}

interface ChainLogo {
  id: string;
  chain: string;
  logo_url: string;
}

// Helper function to generate slug from store name
const generateStoreSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export default function Stores() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [chainLogos, setChainLogos] = useState<ChainLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterChain, setFilterChain] = useState('all');
  const { toast } = useToast();
  const { profile } = useProfile();

  const fetchStores = async () => {
    try {
      // Recupera gli store con i nomi dei tavoli assegnati
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select(`
          *,
          store_tables(
            tables(
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;

      // Recupera i loghi delle catene
      const { data: logosData, error: logosError } = await supabase
        .from('chain_logos')
        .select('id, chain, logo_url');

      if (logosError) {
        console.error('Errore nel caricamento loghi:', logosError);
      } else {
        setChainLogos(logosData || []);
      }

      // Per ogni store, conta i problemi di tipo "missing_device" e prepara i nomi dei tavoli
      const storesWithIssues = await Promise.all(
        (storesData || []).map(async (store: any) => {
          const { data: issuesData, error: issuesError } = await supabase
            .from('store_issues')
            .select('id')
            .eq('store_id', store.id)
            .eq('issue_type', 'missing_device')
            .neq('status', 'resolved');

          if (issuesError) {
            console.error('Errore nel conteggio problemi:', issuesError);
          }

          // Estrai i nomi dei tavoli dalla query join
          const tableNames = store.store_tables?.map((st: any) => st.tables?.name).filter(Boolean) || [];

          return {
            ...store,
            assignedTableNames: tableNames,
            missing_devices_count: issuesData?.length || 0
          };
        })
      );

      // Ordina gli store: prima quelli con problemi, poi gli altri
      const sortedStores = storesWithIssues.sort((a, b) => {
        if (a.missing_devices_count > 0 && b.missing_devices_count === 0) return -1;
        if (a.missing_devices_count === 0 && b.missing_devices_count > 0) return 1;
        return b.missing_devices_count - a.missing_devices_count;
      });

      setStores(sortedStores);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il caricamento degli store.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo store?")) return;
    
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;
      
      toast({
        title: "Successo",
        description: "Store eliminato con successo.",
      });
      
      fetchStores();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione dello store.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || store.category === filterCategory;
    const matchesChain = filterChain === 'all' || store.chain === filterChain;
    return matchesSearch && matchesCategory && matchesChain;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestione Store</h1>
          <p className="text-muted-foreground">Gestisci tutti i tuoi store Apple nelle catene partner</p>
        </div>
        {profile?.role === 'admin' && <StoreForm onStoreCreated={fetchStores} />}
      </div>

      {/* Filters */}
      <Card className="card-apple">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cerca store per nome o posizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-apple"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="White">White</SelectItem>
                <SelectItem value="Tier 2">Tier 2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterChain} onValueChange={setFilterChain}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Catena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le catene</SelectItem>
                <SelectItem value="MediaWorld">MediaWorld</SelectItem>
                <SelectItem value="Comet">Comet</SelectItem>
                <SelectItem value="Euronics">Euronics</SelectItem>
                <SelectItem value="Unieuro">Unieuro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Store Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento store...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
           <Card 
            key={store.id} 
            className="card-apple card-hover animate-scale-in cursor-pointer" 
            onClick={() => navigate(`/stores/${generateStoreSlug(store.name)}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden">
                    {(() => {
                      const chainLogo = chainLogos.find(logo => logo.chain === store.chain);
                      return chainLogo ? (
                        <img 
                          src={chainLogo.logo_url} 
                          alt={`Logo ${store.chain}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <StoreIcon className="w-5 h-5 text-primary-foreground" />
                      );
                    })()}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={store.category === 'White' ? 'badge-success' : 'badge-warning'}>
                        {store.category}
                      </Badge>
                      <Badge className="badge-secondary">{store.chain}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {store.location}
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Tavoli assegnati</span>
                    <span className="font-semibold">({store.tables_count})</span>
                  </div>
                  {store.assignedTableNames && store.assignedTableNames.length > 0 ? (
                    <div className="text-sm">
                      {store.assignedTableNames.length <= 3 ? (
                        <span className="text-muted-foreground">
                          {store.assignedTableNames.join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {store.assignedTableNames.slice(0, 2).join(', ')}{' '}
                          <span className="font-medium">+{store.assignedTableNames.length - 2} altri</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Nessun tavolo assegnato</span>
                  )}
                </div>
                {store.missing_devices_count !== undefined && store.missing_devices_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      Prodotti mancanti
                    </span>
                    <span className="font-semibold text-destructive">{store.missing_devices_count}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/stores/${generateStoreSlug(store.name)}/tables`);
                    }}
                  >
                    <Table className="w-4 h-4 mr-2" />
                    Tavoli
                  </Button>
                  {profile?.role === 'admin' && (
                    <>
                      <Button
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implementare modal di modifica store
                          toast({
                            title: "In sviluppo",
                            description: "Funzionalità di modifica in arrivo.",
                          });
                        }}
                      >
                        Modifica
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStore(store.id);
                        }}
                      >
                        Elimina
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {!loading && filteredStores.length === 0 && (
        <div className="text-center py-12">
          <StoreIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessuno store trovato</h3>
          <p className="text-muted-foreground">Prova a modificare i filtri di ricerca</p>
        </div>
      )}
    </div>
  );
}