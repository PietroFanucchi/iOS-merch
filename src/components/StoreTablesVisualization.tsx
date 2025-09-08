import { useState, useEffect } from 'react';
import { Table as TableIcon, Eye, Smartphone, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Table } from '@/types/table';

interface StoreIssue {
  id: string;
  issue_type: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface StoreTablesVisualizationProps {
  storeId: string;
  issues: StoreIssue[];
}

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

export default function StoreTablesVisualization({ storeId, issues }: StoreTablesVisualizationProps) {
  const [assignedTables, setAssignedTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  
  // Include anche tablet - nasconde visualizzazione su schermi sotto 1200px
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1200);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2)); // Max zoom 200%
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 50%
  };

  useEffect(() => {
    fetchAssignedTables();
  }, [storeId]);

  const fetchAssignedTables = async () => {
    try {
      const { data, error } = await supabase
        .from('store_tables')
        .select(`
          table_id,
          tables (*)
        `)
        .eq('store_id', storeId);

      if (error) throw error;
      
      const tables = data?.map(item => item.tables).filter(Boolean) || [];
      setAssignedTables(tables as Table[]);
    } catch (error) {
      console.error('Error fetching assigned tables:', error);
      toast.error('Errore nel caricamento dei tavoli assegnati');
    } finally {
      setIsLoading(false);
    }
  };

  // Estrae i dispositivi mancanti dai problemi attivi con informazioni dettagliate
  const getMissingDevices = () => {
    return issues
      .filter(issue => issue.issue_type === 'missing_device' && issue.status !== 'resolved')
      .map(issue => {
        // Estrae nome del dispositivo e colore dal titolo - pattern aggiornato per includere il colore
        const titleMatch = issue.title.match(/Dispositivo mancante: (.+?) - (.+)/);
        if (titleMatch) {
          const deviceNameAndColor = titleMatch[1];
          const reason = titleMatch[2];
          
          // Estrai nome e colore se presente
          let deviceName = deviceNameAndColor;
          let deviceColor = null;
          
          // Pattern per estrarre il colore dalla stringa "iPhone 16 (White)"
          const colorMatch = deviceNameAndColor.match(/^(.+?)\s*\(([^)]+)\)$/);
          if (colorMatch) {
            deviceName = colorMatch[1].trim();
            deviceColor = colorMatch[2].trim();
          }
          
          return {
            name: deviceName,
            color: deviceColor,
            reason: reason,
            description: issue.description || '',
            issueId: issue.id
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  // Controlla se un dispositivo specifico è mancante
  const isDeviceMissing = (device: any, tableId: string) => {
    const missingDevices = getMissingDevices();
    
    // Per dispositivi non accessori, controlla nome e colore
    if (!device.attachedToDevice) {
      return missingDevices.some(missing => {
        if (!missing) return false;
        
        // Confronta il nome del dispositivo
        const nameMatches = missing.name === device.name;
        
        // Confronta il colore se entrambi hanno un colore specificato
        const deviceColor = device.color ? device.color.trim() : null;
        const missingColor = missing.color ? missing.color.trim() : null;
        
        // Se il problema specifica un colore, deve corrispondere esattamente
        if (missingColor) {
          return nameMatches && deviceColor === missingColor;
        }
        
        // Se il problema non specifica colore, ma il dispositivo ha un colore,
        // considera solo problemi generici (senza colore specificato)
        if (deviceColor && !missingColor) {
          return nameMatches;
        }
        
        // Se nessuno ha colore specificato, basta il nome
        return nameMatches;
      });
    }
    
    // Per accessori, deve essere più specifico considerando il dispositivo padre
    const parentDevice = assignedTables
      .find(table => table.id === tableId)
      ?.devices?.find(d => d.id === device.attachedToDevice);
    
    if (parentDevice) {
      // Cerca tra i problemi quello che specifica questo accessorio per questo dispositivo
      return missingDevices.some(missing => {
        if (missing?.name !== device.name) return false;
        
        // Controlla se la descrizione menziona specificamente il dispositivo padre
        const description = missing.description.toLowerCase();
        const parentName = parentDevice.name.toLowerCase();
        
        // Cerca pattern più specifici che indicano l'associazione
        const isAssociatedToParent = 
          description.includes(`associato a: ${parentName}`) ||
          description.includes(`collegato a: ${parentName}`) ||
          description.includes(`associato a ${parentName}`) ||
          description.includes(`collegato a ${parentName}`) ||
          // Se la descrizione contiene sia il nome dell'accessorio che del dispositivo padre
          (description.includes(device.name.toLowerCase()) && description.includes(parentName));
        
        return isAssociatedToParent;
      });
    }
    
    // Se non c'è un dispositivo padre o la logica sopra non trova corrispondenza,
    // controlla se il problema si riferisce specificamente a questo accessorio
    // (per accessori che non sono stati ancora associati quando il problema è stato creato)
    return missingDevices.some(missing => {
      if (missing?.name !== device.name) return false;
      
      // Se non c'è menzione di associazione nella descrizione, 
      // allora il problema si riferisce a questo accessorio generico
      const description = missing.description.toLowerCase();
      const hasAssociationKeywords = description.includes('associato') || 
                                    description.includes('collegato') ||
                                    description.includes('legato a');
      
      return !hasAssociationKeywords;
    });
  };

  // Renderizza la visualizzazione di un tavolo in modalità read-only
  const renderTableVisual = (table: Table) => {
    const commonTableStyle = "relative bg-white dark:bg-gray-100 border-2 border-gray-800 shadow-lg";
    
    const renderDevice = (device: any, index: number) => {
      const isMissing = isDeviceMissing(device, table.id);
      
      // Verifica che le posizioni siano valide
      const position = device.position || { x: 0, y: 0 };
      const x = typeof position.x === 'number' ? position.x : 0;
      const y = typeof position.y === 'number' ? position.y : 0;
      
      // Calcola altezza dinamica basata sul contenuto
      const nameLength = device.name ? device.name.length : 0;
      const hasColor = device.color && device.color.trim() !== '';
      const colorLength = hasColor ? device.color.length : 0;
      
      let dynamicHeight = 40; // Altezza base
      
      // Aumenta altezza per nomi lunghi (più di 15 caratteri)
      if (nameLength > 15) {
        dynamicHeight += 15;
      }
      // Aumenta ulteriormente per nomi molto lunghi (più di 30 caratteri)
      if (nameLength > 30) {
        dynamicHeight += 15;
      }
      
      // Aumenta altezza se ha colore
      if (hasColor) {
        dynamicHeight += 15;
        // Aumenta ulteriormente per colori lunghi
        if (colorLength > 20) {
          dynamicHeight += 15;
        }
      }
      
      // Assicurati che i valori siano dentro i limiti della tabella - dinamici come nel TableVisualizer
      const tableWidth = 1200; // Larghezza fissa del container della tabella
      const tableHeight = 505; // Altezza fissa del container della tabella
      const deviceWidth = 140; // Larghezza del dispositivo
      const deviceHeight = dynamicHeight; // Altezza dinamica calcolata sopra
      
      const maxX = tableWidth - deviceWidth;
      const maxY = tableHeight - deviceHeight;
      
      const safeX = Math.max(0, Math.min(x, maxX));
      const safeY = Math.max(0, Math.min(y, maxY));
      
      return (
        <div
          key={`${device.id || `device-${index}`}-${device.name || 'unnamed'}`}
          className={`absolute flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 rounded-md border-2 pointer-events-none p-1
            ${isMissing 
              ? 'bg-red-500 text-white border-red-600' 
              : 'bg-blue-500 text-white border-blue-600'
            }`}
          style={{
            left: `${safeX}px`,
            top: `${safeY}px`,
            width: '140px',
            height: `${dynamicHeight}px`,
            zIndex: device.attachedToDevice ? 20 : 10,
            maxWidth: '140px',
            overflow: 'hidden'
          }}
        >
          <span className="text-center leading-tight text-xs font-medium break-words hyphens-auto w-full">
            {device.name || 'Dispositivo senza nome'}
          </span>
          {device.color && device.color.trim() && (
            <span className="text-xs opacity-80 text-center break-words w-full mt-1">
              {device.color}
            </span>
          )}
          {device.quantity > 1 && (
            <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 text-xs px-1 py-0 min-w-0 h-4">
              x{device.quantity}
            </Badge>
          )}
        </div>
      );
    };

    const renderTable = () => {
      switch (table.table_type) {
        case 'singolo':
          return (
            <div className={`${commonTableStyle} w-full h-[505px] rounded-sm`}>
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300 rounded-sm">
                <div className="absolute top-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                <div className="absolute bottom-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute top-1/2 left-1 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
                <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>
                {(table.devices || []).map(renderDevice)}
              </div>
            </div>
          );
          
        case 'doppio_back_to_back':
          // Per il doppio back to back, dividiamo i dispositivi tra le due superfici
          const backToBackDevices = table.devices || [];
          
          // La larghezza totale del tavolo dal TableVisualizer (senza margini/padding)
          // Basandoci sui dati, i dispositivi vanno fino a 1700px, quindi la larghezza totale è circa 2000px
          const totalTableWidth = 2000;
          const midX = totalTableWidth / 2; // 1000px di divisione
          
          // Separa i dispositivi in base alla coordinata X
          const leftSurfaceDevices = backToBackDevices.filter(device => {
            const x = device.position?.x || 0;
            return x < midX; // Dispositivi sulla superficie sinistra
          });
          
          const rightSurfaceDevices = backToBackDevices.filter(device => {
            const x = device.position?.x || 0;
            return x >= midX; // Dispositivi sulla superficie destra
          });
          
          return (
            <div className={`${commonTableStyle} w-[116%] max-w-none h-[505px] rounded-sm flex`}>
              {/* Superficie sinistra */}
              <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300">
                <div className="absolute top-1 left-1 right-0 h-6 bg-gray-300 dark:bg-gray-400 rounded-l-sm border border-gray-400"></div>
                <div className="absolute bottom-1 left-1 right-0 h-6 bg-gray-300 dark:bg-gray-400 rounded-l-sm border border-gray-400"></div>
                <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute top-1/2 left-1 right-0 h-px bg-gray-600 transform -translate-y-1/2"></div>
                
                {/* Render dei dispositivi per la superficie sinistra */}
                {leftSurfaceDevices.map((device, index) => {
                  const x = device.position?.x || 0;
                  const y = device.position?.y || 0;
                  
                  // Calcola limiti per superficie sinistra (metà larghezza)
                  const surfaceWidth = totalTableWidth / 2; // 1000px per superficie sinistra
                  const surfaceHeight = 505;
                  const deviceWidth = 140;
                  
                  // Calcola altezza dinamica come nella funzione renderDevice principale
                  const nameLength = device.name ? device.name.length : 0;
                  const hasColor = device.color && device.color.trim() !== '';
                  const colorLength = hasColor ? device.color.length : 0;
                  
                  let dynamicHeight = 40;
                  if (nameLength > 15) dynamicHeight += 15;
                  if (nameLength > 30) dynamicHeight += 15;
                  if (hasColor) {
                    dynamicHeight += 15;
                    if (colorLength > 20) dynamicHeight += 15;
                  }
                  
                  const maxX = surfaceWidth - deviceWidth;
                  const maxY = surfaceHeight - dynamicHeight;
                  
                  const adjustedDevice = {
                    ...device,
                    position: {
                      x: Math.max(0, Math.min(x, maxX)),
                      y: Math.max(0, Math.min(y, maxY))
                    }
                  };
                  return renderDevice(adjustedDevice, index);
                })}
              </div>
              
              {/* Divisore centrale */}
              <div className="w-1 bg-gray-700 dark:bg-gray-800 shadow-inner"></div>
              
              {/* Superficie destra */}
              <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300">
                <div className="absolute top-1 left-0 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-r-sm border border-gray-400"></div>
                <div className="absolute bottom-1 left-0 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-r-sm border border-gray-400"></div>
                <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute top-1/2 left-0 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
                
                {/* Render dei dispositivi per la superficie destra - aggiustiamo le coordinate X */}
                {rightSurfaceDevices.map((device, index) => {
                  const x = device.position?.x || 0;
                  const y = device.position?.y || 0;
                  
                  // Calcola limiti per superficie destra
                  const surfaceWidth = totalTableWidth / 2; // 1000px per superficie destra
                  const surfaceHeight = 505;
                  const deviceWidth = 140;
                  
                  // Calcola altezza dinamica
                  const nameLength = device.name ? device.name.length : 0;
                  const hasColor = device.color && device.color.trim() !== '';
                  const colorLength = hasColor ? device.color.length : 0;
                  
                  let dynamicHeight = 40;
                  if (nameLength > 15) dynamicHeight += 15;
                  if (nameLength > 30) dynamicHeight += 15;
                  if (hasColor) {
                    dynamicHeight += 15;
                    if (colorLength > 20) dynamicHeight += 15;
                  }
                  
                  const maxX = surfaceWidth - deviceWidth;
                  const maxY = surfaceHeight - dynamicHeight;
                  
                  const adjustedDevice = {
                    ...device,
                    position: {
                      x: Math.max(0, Math.min(x - midX, maxX)), // Sottrai l'offset e applica i limiti
                      y: Math.max(0, Math.min(y, maxY))
                    }
                  };
                  return renderDevice(adjustedDevice, index + leftSurfaceDevices.length);
                })}
              </div>
            </div>
          );
          
        case 'doppio_free_standing':
          // Per il doppio free standing, dividiamo i dispositivi tra le due superfici
          const devices = table.devices || [];
          const midY = 505; // Altezza di una superficie
          
          // Separa i dispositivi in base alla coordinata Y
          const topSurfaceDevices = devices.filter(device => {
            const y = device.position?.y || 0;
            return y < midY + 50; // 50px di margine per i dispositivi vicini al confine
          });
          
          const bottomSurfaceDevices = devices.filter(device => {
            const y = device.position?.y || 0;
            return y >= midY + 50;
          });
          
          return (
            <div className="space-y-6">
              {/* Prima superficie */}
              <div className={`${commonTableStyle} w-full h-[505px] rounded-sm relative`}>
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300 rounded-sm">
                  <div className="absolute top-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                  <div className="absolute bottom-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                  <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
                  <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
                  <div className="absolute top-1/2 left-1 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
                  <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>
                </div>
                {/* Render dei dispositivi per la prima superficie */}
                {topSurfaceDevices.map((device, index) => {
                  const adjustedDevice = {
                    ...device,
                    position: {
                      x: device.position?.x || 0,
                      y: device.position?.y || 0
                    }
                  };
                  return renderDevice(adjustedDevice, index);
                })}
              </div>
              
              {/* Seconda superficie */}
              <div className={`${commonTableStyle} w-full h-[505px] rounded-sm relative`}>
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300 rounded-sm">
                  <div className="absolute top-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                  <div className="absolute bottom-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                  <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
                  <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
                  <div className="absolute top-1/2 left-1 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
                  <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>
                </div>
                {/* Render dei dispositivi per la seconda superficie - aggiustiamo le coordinate Y */}
                {bottomSurfaceDevices.map((device, index) => {
                  const adjustedDevice = {
                    ...device,
                    position: {
                      x: device.position?.x || 0,
                      y: (device.position?.y || 0) - (midY + 60) // Sottrai l'offset per posizionare correttamente
                    }
                  };
                  return renderDevice(adjustedDevice, index + topSurfaceDevices.length);
                })}
              </div>
            </div>
          );
          
        default:
          return <div className="text-center py-8">Tipo tavolo non supportato</div>;
      }
    };

    return (
      <div className="w-full">
        {renderTable()}
      </div>
    );
  };

  useEffect(() => {
    fetchAssignedTables();
  }, [storeId]);

  if (isLoading) {
    return (
      <Card className="card-apple">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Visualizzazione Tavoli Assegnati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Caricamento tavoli...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-apple">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Visualizzazione Tavoli Assegnati
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Rappresentazione visiva dei tavoli assegnati a questo store. I dispositivi in rosso indicano prodotti mancanti.
        </p>
      </CardHeader>
      <CardContent>
        {assignedTables.length === 0 ? (
          <div className="text-center py-8">
            <TableIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun tavolo assegnato</h3>
            <p className="text-muted-foreground">Questo store non ha ancora tavoli assegnati.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {assignedTables.map((table) => (
              <div key={table.id} className="space-y-4">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                       <TableIcon className="w-4 h-4 text-primary-foreground" />
                     </div>
                     <div>
                       <h3 className="font-semibold">{table.name}</h3>
                       <p className="text-sm text-muted-foreground">
                         {getTableTypeLabel(table.table_type)}
                       </p>
                     </div>
                   </div>
                   <div className="flex items-center gap-4">
                     {/* Controlli zoom per desktop */}
                     {!isSmallScreen && (
                       <div className="flex items-center gap-1">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={handleZoomOut}
                           disabled={zoom <= 0.5}
                           title="Riduci zoom"
                         >
                           <Minus className="w-4 h-4" />
                         </Button>
                         <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                           {Math.round(zoom * 100)}%
                         </span>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={handleZoomIn}
                           disabled={zoom >= 2}
                           title="Aumenta zoom"
                         >
                           <Plus className="w-4 h-4" />
                         </Button>
                       </div>
                     )}
                     <Badge className="badge-primary">
                       {table.devices?.length || 0} dispositivi
                     </Badge>
                   </div>
                 </div>
                
                <div className="border rounded-lg p-4 bg-muted/30">
                  {isSmallScreen ? (
                    // Vista mobile/tablet - mostra solo il messaggio
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
                      <Smartphone className="w-16 h-16 text-muted-foreground" />
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Visualizzazione tavolo non disponibile su dispositivi mobili</h3>
                        <p className="text-muted-foreground">
                          Per visualizzare i tavoli e i dispositivi, accedi da desktop
                        </p>
                        <div className="text-sm text-muted-foreground mt-4">
                          <p>Dispositivi totali: <span className="font-medium">{table.devices?.length || 0}</span></p>
                          {getMissingDevices().length > 0 && (
                            <p className="text-red-600">
                              Dispositivi mancanti: <span className="font-medium">{getMissingDevices().length}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                   ) : (
                     // Vista desktop - mostra la visualizzazione completa con scroll e zoom
                     <div className="w-full overflow-x-auto overflow-y-hidden">
                       <div 
                         className="relative select-none min-w-fit transition-transform origin-top-left"
                         style={{ transform: `scale(${zoom})` }}
                       >
                         {renderTableVisual(table)}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}