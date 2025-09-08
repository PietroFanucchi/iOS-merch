import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Users, Table, TrendingUp, Apple, MapPin, Building, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';


interface Store {
  id: string;
  name: string;
  category: string;
  chain: string;
  location: string;
  tables_count: number;
  created_at: string;
}

interface Visit {
  id: string;
  store_id: string;
  scheduled_date: string;
  visit_type: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  stores?: {
    name: string;
    location: string;
    chain: string;
  };
}

interface MissingProduct {
  table_id: string;
  table_name: string;
  store_name: string;
  store_id: string;
  missing_devices: number;
  missing_price_tags: number;
  device_details?: Array<{
    id: string;
    name: string;
    category: string;
    model?: string;
    color?: string;
    image_url?: string;
  }>;
  missing_device_info?: {
    device_name: string;
    cause: string;
  };
}

interface Stats {
  totalStores: number;
  whiteStores: number;
  tier2Stores: number;
  totalMissingProducts: number;
  chainDistribution: Record<string, number>;
}

// Helper function to generate slug from store name
const generateStoreSlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);
  const [missingProducts, setMissingProducts] = useState<MissingProduct[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalStores: 0,
    whiteStores: 0,
    tier2Stores: 0,
    totalMissingProducts: 0,
    chainDistribution: {}
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const storesData = data || [];
      setStores(storesData);

      // Calculate stats
      const totalStores = storesData.length;
      const whiteStores = storesData.filter(store => store.category === 'White').length;
      const tier2Stores = storesData.filter(store => store.category === 'Tier 2').length;
      const totalTables = storesData.reduce((sum, store) => sum + store.tables_count, 0);
      
      const chainDistribution = storesData.reduce((acc, store) => {
        acc[store.chain] = (acc[store.chain] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        totalStores,
        whiteStores,
        tier2Stores,
        totalMissingProducts: 0, // Will be updated after fetchMissingProducts
        chainDistribution
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei dati.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingVisits = async () => {
    try {
      const today = new Date();
      const tomorrow = format(addDays(today, 1), 'yyyy-MM-dd');
      const dayAfterTomorrow = format(addDays(today, 2), 'yyyy-MM-dd');
      
      console.log('Today:', format(today, 'yyyy-MM-dd'));
      console.log('Tomorrow:', tomorrow);
      console.log('Day after tomorrow:', dayAfterTomorrow);
      
      // Get visits for tomorrow and day after tomorrow
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('id, store_id, scheduled_date, visit_type, status')
        .gte('scheduled_date', tomorrow)
        .lte('scheduled_date', dayAfterTomorrow)
        .eq('status', 'scheduled')
        .order('scheduled_date');

      console.log('Visits query result:', { visitsData, visitsError });
      console.log('Query parameters used:', { tomorrow, dayAfterTomorrow });

      if (visitsError) throw visitsError;

      // Get all stores using the public function to avoid RLS issues
      const { data: allStores, error: storesError } = await supabase
        .rpc('get_stores_public');

      if (storesError) {
        console.error('Error fetching stores:', storesError);
        throw storesError;
      }

      console.log('All stores data:', allStores);

      // Map visits with store details
      const visitsWithStores = (visitsData || []).map((visit) => {
        const storeData = allStores?.find(store => store.id === visit.store_id);
        
        console.log('Mapping visit:', visit.id, 'with store:', storeData);
        
        return {
          ...visit,
          stores: storeData ? {
            name: storeData.name,
            location: storeData.location,
            chain: storeData.chain
          } : null
        };
      });

      console.log('Final visits with stores:', visitsWithStores);
      setUpcomingVisits(visitsWithStores as Visit[]);
    } catch (error) {
      console.error('Errore caricamento visite:', error);
    }
  };

  const fetchMissingProducts = async () => {
    try {
      // Recupera gli store che hanno issue di tipo "missing_device" attivi con dettagli completi
      const { data: missingDeviceIssues, error: issuesError } = await supabase
        .from('store_issues')
        .select(`
          id,
          title,
          description,
          store_id,
          stores(name, location)
        `)
        .eq('issue_type', 'missing_device')
        .in('status', ['open', 'in_progress']);

      if (issuesError) throw issuesError;

      const missingProductsData: MissingProduct[] = [];
      
      // Processa gli issue di missing_device per estrarre dispositivo e causa
      missingDeviceIssues?.forEach((issue: any) => {
        // Estrai il nome del dispositivo e la causa dal titolo
        // Formato titolo: "Dispositivo mancante: [NOME_DISPOSITIVO] - [CAUSA]"
        const titleMatch = issue.title.match(/Dispositivo mancante: (.+) - (.+)/);
        const deviceName = titleMatch ? titleMatch[1] : 'Dispositivo sconosciuto';
        const cause = titleMatch ? titleMatch[2] : 'Causa non specificata';
        
        missingProductsData.push({
          table_id: issue.id, // Usa issue id come identificativo unico
          table_name: 'Dispositivi mancanti',
          store_name: issue.stores?.name || 'Store sconosciuto',
          store_id: issue.store_id,
          missing_devices: 1,
          missing_price_tags: 0,
          missing_device_info: {
            device_name: deviceName,
            cause: cause
          }
        });
      });

      // Inoltre recupera le tabelle con dispositivi o price_tags vuoti
      const { data: tablesData, error } = await supabase
        .from('tables')
        .select(`
          id,
          name,
          devices,
          price_tags,
          store_tables(
            store_id,
            stores(name, location)
          )
        `);

      if (error) throw error;
      
      // Aggiungi tavoli con dispositivi/price_tags vuoti
      tablesData?.forEach((table: any) => {
        const devices = table.devices || [];
        const priceTags = table.price_tags || [];
        const storeTable = table.store_tables?.[0];
        
        if (storeTable && (devices.length === 0 || priceTags.length === 0)) {
          missingProductsData.push({
            table_id: table.id,
            table_name: table.name,
            store_name: storeTable.stores?.name || 'Store sconosciuto',
            store_id: storeTable.store_id,
            missing_devices: devices.length === 0 ? 1 : 0,
            missing_price_tags: priceTags.length === 0 ? 1 : 0,
          });
        }
      });

      setMissingProducts(missingProductsData.slice(0, 6)); // Aumentato il limite a 6
      
      // Update total missing products count in stats
      setStats(prevStats => ({
        ...prevStats,
        totalMissingProducts: missingProductsData.length
      }));
    } catch (error) {
      console.error('Errore caricamento prodotti mancanti:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchStores(), fetchUpcomingVisits(), fetchMissingProducts()]);
  }, []);

  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento statistiche...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-apple card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store Totali</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{stats.totalStores}</div>
            <p className="text-xs text-muted-foreground">
              {stats.whiteStores} White • {stats.tier2Stores} Tier 2
            </p>
          </CardContent>
        </Card>

          <Card className="card-apple card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store White</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.whiteStores}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalStores > 0 ? Math.round((stats.whiteStores / stats.totalStores) * 100) : 0}% del totale
              </p>
            </CardContent>
          </Card>

          <Card className="card-apple card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store Tier 2</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.tier2Stores}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalStores > 0 ? Math.round((stats.tier2Stores / stats.totalStores) * 100) : 0}% del totale
              </p>
            </CardContent>
          </Card>

          <Card className="card-apple card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prodotti Mancanti</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMissingProducts}</div>
              <p className="text-xs text-muted-foreground">
                Problemi segnalati
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Missing Products */}
        <Card className="card-apple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Prodotti Mancanti
            </CardTitle>
            <CardDescription>
              Tavoli con dispositivi o cartellini prezzo mancanti
            </CardDescription>
          </CardHeader>
           <CardContent>
            <div className="space-y-4">
              {missingProducts.length > 0 ? (
                missingProducts.map((product) => (
                  <div 
                    key={product.table_id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                    onClick={() => navigate(`/stores/${generateStoreSlug(product.store_name)}`)}
                  >
                    <div className="flex-1">
                      {product.missing_device_info ? (
                        <>
                          <h4 className="font-medium">
                            {product.store_name} - {product.missing_device_info.device_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-destructive text-destructive-foreground rounded-md text-xs px-2 py-1">
                              {product.missing_device_info.cause}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="font-medium">{product.store_name} - {product.table_name}</h4>
                          <div className="flex gap-1 mt-1">
                            {product.missing_devices > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Dispositivi mancanti
                              </Badge>
                            )}
                            {product.missing_price_tags > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Cartelli prezzo mancanti
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">Nessun prodotto mancante</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Visits */}
        <Card className="card-apple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Visite dei Prossimi Due Giorni
            </CardTitle>
            <CardDescription>
              Visite programmate domani e dopodomani
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingVisits.length > 0 ? (
              upcomingVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium">{visit.stores?.name || 'Store sconosciuto'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {visit.visit_type === 'white' ? 'White' : 'Tier 2'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{visit.stores?.chain}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {format(new Date(visit.scheduled_date), 'dd/MM', { locale: it })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(visit.scheduled_date), 'EEEE', { locale: it })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Nessuna visita programmata</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}