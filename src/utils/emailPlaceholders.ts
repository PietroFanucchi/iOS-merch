import { supabase } from '@/integrations/supabase/client';

interface DeviceWithQuantity {
  name: string;
  color: string;
  quantity: number;
}

export async function generateProductList(storeId: string, launchId: string): Promise<string> {
  try {
    // 1. Ottenere i dispositivi del lancio
    const { data: launchDevices, error: launchDevicesError } = await supabase
      .from('launch_devices')
      .select('device_id')
      .eq('launch_id', launchId);

    if (launchDevicesError) throw launchDevicesError;

    const launchDeviceIds = launchDevices?.map(ld => ld.device_id) || [];

    if (launchDeviceIds.length === 0) {
      return '• Nessun prodotto configurato per questo lancio';
    }

    // 2. Ottenere i tavoli associati allo store
    const { data: storeTables, error: storeTablesError } = await supabase
      .from('store_tables')
      .select('table_id, tables!inner(devices)')
      .eq('store_id', storeId);

    if (storeTablesError) throw storeTablesError;

    // 3. Ottenere i dettagli dei dispositivi del lancio
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('id, name, color')
      .in('id', launchDeviceIds);

    if (devicesError) throw devicesError;

    // 4. Trovare i dispositivi del lancio presenti nei tavoli dello store
    const storeDevices: DeviceWithQuantity[] = [];
    const deviceMap = new Map<string, { name: string; color: string }>();
    
    // Creare mappa dei dispositivi del lancio
    devices?.forEach(device => {
      deviceMap.set(device.id, { 
        name: device.name, 
        color: device.color || '' 
      });
    });

    // Analizzare i tavoli dello store
    storeTables?.forEach(storeTable => {
      const tableDevices = Array.isArray(storeTable.tables?.devices) ? storeTable.tables.devices : [];
      
      tableDevices.forEach((tableDevice: any) => {
        // Verificare se questo dispositivo è parte del lancio
        if (launchDeviceIds.includes(tableDevice.deviceId)) {
          const deviceInfo = deviceMap.get(tableDevice.deviceId);
          if (deviceInfo) {
            storeDevices.push({
              name: deviceInfo.name,
              color: deviceInfo.color,
              quantity: tableDevice.quantity || 1
            });
          }
        }
      });
    });

    // 5. Raggruppare per nome e colore
    const groupedDevices = new Map<string, number>();
    
    storeDevices.forEach(device => {
      const key = `${device.name}|${device.color}`;
      const currentQuantity = groupedDevices.get(key) || 0;
      groupedDevices.set(key, currentQuantity + device.quantity);
    });

    // 6. Generare l'elenco puntato
    if (groupedDevices.size === 0) {
      return '• Nessun prodotto del lancio configurato per questo store';
    }

    const productList: string[] = [];
    
    groupedDevices.forEach((quantity, key) => {
      const [name, color] = key.split('|');
      const colorText = color ? ` (${color})` : '';
      productList.push(`• ${name}${colorText} X${quantity}`);
    });

    return productList.join('\n');

  } catch (error) {
    console.error('Errore nella generazione della lista prodotti:', error);
    return '• Errore nel caricamento della lista prodotti';
  }
}

export async function replacePlaceholders(
  content: string, 
  storeId: string, 
  launchId: string,
  additionalPlaceholders: Record<string, string> = {}
): Promise<string> {
  let result = content;

  // Sostituire [prodotti_lancio] con la lista generata dinamicamente
  if (content.includes('[prodotti_lancio]')) {
    const productList = await generateProductList(storeId, launchId);
    result = result.replace(/\[prodotti_lancio\]/g, productList);
  }

  // Sostituire altri placeholder statici
  Object.entries(additionalPlaceholders).forEach(([key, value]) => {
    const placeholder = `[${key}]`;
    result = result.replace(new RegExp(`\\${placeholder}`, 'g'), value);
  });

  return result;
}