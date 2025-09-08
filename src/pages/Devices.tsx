import { useState, useEffect } from 'react';
import { Search, Smartphone, Tablet, Monitor, Watch, Package, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeviceForm } from '@/components/DeviceForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Device, DeviceCategory } from '@/types/device';

const categoryIcons = {
  iPhone: Smartphone,
  iPad: Tablet,
  Mac: Monitor,
  Watch: Watch,
  Accessori: Package,
};

const categoryColors = {
  iPhone: 'badge-primary',
  iPad: 'badge-secondary', 
  Mac: 'badge-success',
  Watch: 'badge-warning',
  Accessori: 'badge-neutral',
};

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<DeviceCategory | 'all'>('all');

  const fetchDevices = async () => {
    console.log('fetchDevices called'); // Debug log
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices((data as Device[]) || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Errore durante il caricamento dei dispositivi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect fetchDevices triggered'); // Debug log
    fetchDevices();
  }, []); // Empty dependency array

  const deleteDevice = async (deviceId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo dispositivo?")) return;
    
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      
      toast.success("Dispositivo eliminato con successo");
      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error("Errore durante l'eliminazione del dispositivo");
    }
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || device.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestione Dispositivi</h1>
          <p className="text-muted-foreground">Crea e gestisci i dispositivi da utilizzare nei tavoli</p>
        </div>
        <DeviceForm onDeviceCreated={fetchDevices} />
      </div>

      {/* Filters */}
      <Card className="card-apple">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cerca dispositivi per nome, modello o descrizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-apple"
              />
            </div>
            <Select value={filterCategory} onValueChange={(value: DeviceCategory | 'all') => setFilterCategory(value)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="iPhone">iPhone</SelectItem>
                <SelectItem value="iPad">iPad</SelectItem>
                <SelectItem value="Mac">Mac</SelectItem>
                <SelectItem value="Watch">Watch</SelectItem>
                <SelectItem value="Accessori">Accessori</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento dispositivi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => {
            const IconComponent = categoryIcons[device.category];
            const badgeClass = categoryColors[device.category];
            
            return (
              <Card key={device.id} className="card-apple card-hover animate-scale-in">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {device.name}
                          {device.color && ` (${device.color})`}
                        </CardTitle>
                        {device.model && (
                          <CardDescription>{device.model}</CardDescription>
                        )}
                      </div>
                    </div>
                    <Badge className={badgeClass}>
                      {device.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {device.description && (
                      <p className="text-sm text-muted-foreground">{device.description}</p>
                    )}
                    
                    {device.image_url && (
                      <div className="rounded-lg overflow-hidden border border-border">
                        <img 
                          src={device.image_url} 
                          alt={device.name}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t border-border">
                        <DeviceForm 
                          device={device}
                          onDeviceCreated={fetchDevices}
                          trigger={
                            <Button variant="outline" size="sm" className="flex-1 btn-secondary">
                              <Edit className="w-4 h-4 mr-2" />
                              Modifica
                            </Button>
                          }
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 btn-ghost"
                          onClick={() => deleteDevice(device.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Elimina
                        </Button>
                      </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nessun dispositivo trovato</h3>
          <p className="text-muted-foreground">Prova a modificare i filtri di ricerca</p>
        </div>
      )}
    </div>
  );
}