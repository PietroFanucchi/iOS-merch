import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";

interface Store {
  id: string;
  name: string;
  chain: string;
  location: string;
}

interface PriceTag {
  id: string;
  name: string;
  pdf_url: string;
  chain: string;
  deviceCount?: number;
}

export default function CartelliPrezzo() {
  const { launchSlug, storeSlug } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [priceTags, setPriceTags] = useState<PriceTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchName, setLaunchName] = useState<string>('');
  const [launchStatus, setLaunchStatus] = useState<string>('');
  const [isLaunchClosed, setIsLaunchClosed] = useState<boolean>(false);
  const [launchDates, setLaunchDates] = useState<Date[]>([]);

  useEffect(() => {
    if (storeSlug && launchSlug) {
      fetchStoreAndPriceTags();
    }
  }, [storeSlug, launchSlug]);

  const fetchStoreAndPriceTags = async () => {
    try {
      console.log('Store slug from URL:', storeSlug);
      console.log('Launch slug from URL:', launchSlug);
      
      // Convert slugs back to search patterns
      const storeSearchPattern = storeSlug?.replace(/-/g, ' ') || '';
      const launchSearchPattern = launchSlug?.replace(/-/g, ' ') || '';
      console.log('Store search pattern:', storeSearchPattern);
      console.log('Launch search pattern:', launchSearchPattern);
      
      // Fetch all stores using the safe public function
      const { data: allStores, error: storesError } = await supabase
        .rpc('get_stores_public');

      if (storesError) {
        throw storesError;
      }

      console.log('All stores:', allStores);

      // Find store by matching slug pattern
      const matchingStore = allStores?.find(s => {
        const generatedSlug = s.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        console.log(`Comparing generated slug "${generatedSlug}" with URL slug "${storeSlug}"`);
        return generatedSlug === storeSlug;
      });

      console.log('Matching store:', matchingStore);

      if (!matchingStore) {
        throw new Error('Store non trovato');
      }

      setStore(matchingStore);

      // Fetch all launches and find the one that matches the slug pattern
      const { data: allLaunches, error: launchesError } = await supabase
        .from('launches')
        .select('id, name, status');

      if (launchesError) {
        throw launchesError;
      }

      const matchingLaunch = allLaunches?.find(l => {
        const generatedSlug = l.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        console.log(`Comparing launch slug "${generatedSlug}" with URL slug "${launchSlug}"`);
        return generatedSlug === launchSlug;
      });

      if (!matchingLaunch) {
        throw new Error('Lancio non trovato');
      }

      console.log('Matching launch:', matchingLaunch);
      setLaunchName(matchingLaunch.name);
      setLaunchStatus(matchingLaunch.status);
      const isClosed = matchingLaunch.status === 'completed';
      setIsLaunchClosed(isClosed);

      // Fetch launch dates to calculate expiration
      const { data: launchDatesData, error: launchDatesError } = await supabase
        .from('launch_dates')
        .select('launch_date')
        .eq('launch_id', matchingLaunch.id)
        .order('launch_date');

      if (launchDatesError) {
        console.error('Error fetching launch dates:', launchDatesError);
      } else if (launchDatesData && launchDatesData.length > 0) {
        const dates = launchDatesData.map(item => new Date(item.launch_date));
        setLaunchDates(dates);
      }

      // If launch is closed, redirect to page not available
      if (isClosed) {
        navigate('/pagina-non-disponibile', { replace: true });
        return;
      }

      // Fetch launch devices to filter price tags
      const { data: launchDevicesData, error: launchDevicesError } = await supabase
        .from('launch_devices')
        .select('device_id')
        .eq('launch_id', matchingLaunch.id);

      if (launchDevicesError) {
        throw launchDevicesError;
      }

      console.log('Launch devices data:', launchDevicesData);

      // Get device details separately
      let deviceNames: string[] = [];
      if (launchDevicesData && launchDevicesData.length > 0) {
        const deviceIds = launchDevicesData.map(ld => ld.device_id);
        
        const { data: devicesData, error: devicesError } = await supabase
          .from('devices')
          .select('name')
          .in('id', deviceIds);

        if (devicesError) {
          throw devicesError;
        }

        deviceNames = devicesData?.map(d => d.name).filter(Boolean) || [];
      }

      console.log('Device names from launch:', deviceNames);

      // Count devices by name to show quantities in price tags
      const deviceCounts = new Map();
      deviceNames.forEach(deviceName => {
        const count = deviceCounts.get(deviceName) || 0;
        deviceCounts.set(deviceName, count + 1);
      });

      console.log('Device counts:', deviceCounts);

      // Fetch all price tags for the store's chain
      const { data: allPriceTagsData, error: priceTagsError } = await supabase
        .from('chain_price_tags')
        .select('*')
        .eq('chain', matchingStore.chain);

      if (priceTagsError) {
        throw priceTagsError;
      }

      console.log('Fetching price tags for chain:', matchingStore.chain);
      console.log('Price tags fetched:', allPriceTagsData);

      // Filter price tags using EXACT matching only and add device count
      const filteredPriceTags = (allPriceTagsData || []).filter(tag => {
        return deviceNames.some(deviceName => {
          const normalizedTagName = tag.name.toLowerCase().trim();
          const normalizedDeviceName = deviceName.toLowerCase().trim();
          
          console.log(`Comparing tag "${normalizedTagName}" with device "${normalizedDeviceName}"`);
          
          // ONLY exact match - no partial matching allowed
          if (normalizedTagName === normalizedDeviceName) {
            console.log(`✓ Exact match: "${normalizedTagName}" === "${normalizedDeviceName}"`);
            return true;
          }
          
          console.log(`✗ No exact match for "${normalizedTagName}" vs "${normalizedDeviceName}"`);
          return false;
        });
      }).map(tag => {
        // Add device count to each matched tag
        const matchingDeviceName = deviceNames.find(deviceName => 
          tag.name.toLowerCase().trim() === deviceName.toLowerCase().trim()
        );
        return {
          ...tag,
          deviceCount: matchingDeviceName ? deviceCounts.get(matchingDeviceName) : 1
        };
      });

      console.log('=== FILTERING SUMMARY ===');
      console.log('Available devices in launch:', deviceNames);
      console.log('Available price tags:', (allPriceTagsData || []).map(tag => tag.name));
      console.log('Filtered price tags:', filteredPriceTags.map(tag => tag.name));
      console.log('=========================');

      console.log('Filtered price tags:', filteredPriceTags);
      
      // If no devices in launch or no matching price tags, show all price tags for the chain
      if (deviceNames.length === 0 || filteredPriceTags.length === 0) {
        console.log('No devices in launch or no matching price tags found. Showing all price tags for chain:', matchingStore.chain);
        const allTagsWithCount = (allPriceTagsData || []).map(tag => ({
          ...tag,
          deviceCount: 1
        }));
        setPriceTags(allTagsWithCount);
      } else {
        setPriceTags(filteredPriceTags);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Errore",
        description: `Errore nel caricamento dei cartelli prezzo: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (priceTag: PriceTag) => {
    try {
      const response = await fetch(priceTag.pdf_url);
      if (!response.ok) {
        throw new Error('Errore nel download del file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${priceTag.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download completato",
        description: `${priceTag.name} scaricato con successo.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Errore download",
        description: "Errore durante il download del cartello prezzo.",
        variant: "destructive",
      });
    }
  };

  const downloadAll = async () => {
    if (priceTags.length === 0) return;

    for (const tag of priceTags) {
      if (tag.pdf_url) {
        await handleDownload(tag);
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento cartelli prezzo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Store non trovato</h2>
            <p className="text-muted-foreground">
              Lo store specificato non esiste o non è accessibile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Cartelli Prezzo</h1>
        </div>
      </div>

      {/* Price Tags Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cartelli Disponibili ({priceTags.length})
            </CardTitle>
            {priceTags.length > 0 && (
              <Button onClick={downloadAll} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Scarica Tutti
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {priceTags.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun cartello disponibile</h3>
              <p className="text-muted-foreground">
                Non sono presenti cartelli prezzo per i prodotti di questo lancio nella catena {store.chain}.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {priceTags.map((tag, index) => (
                  <div key={tag.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                           <p className="font-bold">
                             {tag.name}
                             {tag.deviceCount && tag.deviceCount > 1 && (
                               <span>
                                 {" "}(X{tag.deviceCount})
                               </span>
                             )}
                           </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(tag)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Scarica
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Expiration Notice */}
              {launchDates.length > 0 && (
                <div className="mt-6 p-4 border border-red-200 bg-red-50 rounded-lg">
                  <p className="text-red-600 text-sm font-medium text-center">
                    Questa pagina sarà disponibile fino al {format(addDays(launchDates[launchDates.length - 1], 2), "dd MMMM yyyy", { locale: it })}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}