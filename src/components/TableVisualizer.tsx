import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Minus, Link2, Smartphone } from 'lucide-react';
import type { TableType } from '@/types/table';
import { useIsMobile } from '@/hooks/use-mobile';

interface Device {
  id: string;
  name: string;
  type: string;
  color?: string;
  quantity: number;
  position: { x: number; y: number };
  code?: string;
  deviceId?: string | null;
  attachedAccessories?: Device[];
  attachedToDevice?: string | null;
}

interface TableVisualizerProps {
  tableType: TableType;
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  onAddDevice: () => void;
  associationMode?: {active: boolean, priceTag: any} | null;
  onDeviceClickForAssociation?: (deviceId: string) => void;
}

export default function TableVisualizer({ 
  tableType, 
  devices, 
  onDevicesChange, 
  onAddDevice,
  associationMode,
  onDeviceClickForAssociation
}: TableVisualizerProps) {
  const isMobile = useIsMobile();
  const [draggedDevice, setDraggedDevice] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapLines, setSnapLines] = useState<{x: number[], y: number[]}>({x: [], y: []});
  const [zoom, setZoom] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);

  const SNAP_THRESHOLD = 15; // Pixel di distanza per lo snap
  
  // Get device pixel ratio for better cross-platform compatibility
  const getDevicePixelRatio = () => {
    return window.devicePixelRatio || 1;
  };
  
  // Adjust dimensions based on device pixel ratio for better Mac compatibility
  const getScaledDimensions = () => {
    const ratio = getDevicePixelRatio();
    const baseScale = ratio > 1.5 ? 1 / (ratio * 0.7) : 1; // Adjust scaling for high DPI displays
    return {
      deviceWidth: Math.round(120 * baseScale),
      deviceHeight: Math.round(40 * baseScale),
      snapThreshold: Math.round(SNAP_THRESHOLD * baseScale)
    };
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2)); // Max zoom 200%
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 50%
  };

  const isAccessory = (deviceType: string) => {
    return deviceType.toLowerCase().includes('accessori') || 
           deviceType.toLowerCase().includes('pencil') ||
           deviceType.toLowerCase().includes('keyboard') ||
           deviceType.toLowerCase().includes('case');
  };

  const findDeviceAt = (x: number, y: number, excludeId: string) => {
    const { deviceWidth, deviceHeight } = getScaledDimensions();
    
    return devices.find(device => {
      if (device.id === excludeId) return false;
      
      const deviceRect = {
        left: device.position.x,
        top: device.position.y,
        right: device.position.x + deviceWidth,
        bottom: device.position.y + deviceHeight
      };
      
      return x >= deviceRect.left && x <= deviceRect.right &&
             y >= deviceRect.top && y <= deviceRect.bottom;
    });
  };

  const getSnapPosition = (x: number, y: number, currentDeviceId: string) => {
    const { deviceWidth, deviceHeight, snapThreshold } = getScaledDimensions();
    const otherDevices = devices.filter(d => d.id !== currentDeviceId && !d.attachedToDevice);
    const snapX: number[] = [];
    const snapY: number[] = [];
    
    // Aggiungi posizioni degli altri dispositivi per lo snap
    otherDevices.forEach(device => {
      snapX.push(device.position.x); // Allineamento sinistra
      snapX.push(device.position.x + deviceWidth); // Allineamento destra (width dispositivo)
      snapY.push(device.position.y); // Allineamento alto
      snapY.push(device.position.y + deviceHeight); // Allineamento basso (height dispositivo)
    });
    
    // Trova la posizione snap più vicina
    let snappedX = x;
    let snappedY = y;
    const activeSnapX: number[] = [];
    const activeSnapY: number[] = [];
    
    // Snap X
    for (const snapPosX of snapX) {
      if (Math.abs(x - snapPosX) <= snapThreshold) {
        snappedX = snapPosX;
        activeSnapX.push(snapPosX);
        break;
      }
    }
    
    // Snap Y
    for (const snapPosY of snapY) {
      if (Math.abs(y - snapPosY) <= snapThreshold) {
        snappedY = snapPosY;
        activeSnapY.push(snapPosY);
        break;
      }
    }
    
    setSnapLines({ x: activeSnapX, y: activeSnapY });
    
    return { x: snappedX, y: snappedY };
  };

  const handleMouseDown = (e: React.MouseEvent, deviceId: string) => {
    e.preventDefault();
    
    // Se siamo in modalità associazione, gestisci il click per associazione
    if (associationMode?.active && onDeviceClickForAssociation) {
      onDeviceClickForAssociation(deviceId);
      return;
    }
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    // Se l'accessorio è attaccato a un dispositivo, non permettere il drag
    if (device.attachedToDevice) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedDevice(deviceId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedDevice || !tableRef.current) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    const newX = e.clientX - tableRect.left - dragOffset.x;
    const newY = e.clientY - tableRect.top - dragOffset.y;

    // Bounds checking - calcola la larghezza effettiva basata sul tipo di tavolo
    let effectiveTableWidth;
    
    if (tableType === 'doppio_back_to_back') {
      // Per il tavolo doppio back_to_back, usa una larghezza fissa doppia
      effectiveTableWidth = tableRef.current.scrollWidth;
    } else {
      effectiveTableWidth = tableRect.width;
    }
    
    const { deviceWidth, deviceHeight } = getScaledDimensions();
    const maxX = effectiveTableWidth - deviceWidth;
    const maxY = tableRect.height - deviceHeight;

    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));

    // Applica lo snap
    const snappedPosition = getSnapPosition(boundedX, boundedY, draggedDevice);

    const updatedDevices = devices.map(device => {
      if (device.id === draggedDevice) {
        return { ...device, position: { x: snappedPosition.x, y: snappedPosition.y } };
      }
      // Se questo dispositivo ha accessori attaccati, muovili insieme
      if (device.attachedToDevice === draggedDevice) {
        // Calcola gli accessori del dispositivo principale per determinare la posizione
        const mainDevice = devices.find(d => d.id === draggedDevice);
        if (mainDevice) {
          const attachedDevices = devices.filter(d => d.attachedToDevice === draggedDevice);
          const deviceIndex = attachedDevices.findIndex(d => d.id === device.id);
          
          // Determina se il dispositivo è nella parte nord o sud del tavolo
          const tableHeight = 505;
          let centerY = tableHeight / 2;
          
          // Per doppio free standing, aggiusta il calcolo per il secondo tavolo
          if (tableType === 'doppio_free_standing' && snappedPosition.y > tableHeight + 20) {
            // Il dispositivo è nel secondo tavolo (considerando lo spazio tra i tavoli)
            const secondTableStartY = tableHeight + 24; // space-y-6 = 24px
            const relativeY = snappedPosition.y - secondTableStartY;
            centerY = secondTableStartY + tableHeight / 2;
          }
          
          const isNorthSide = snappedPosition.y < centerY;
          
          if (isNorthSide) {
            // Parte nord: accessori vanno verso l'alto
            let totalHeight = -45; // Spazio iniziale sopra il dispositivo principale (aumentato per evitare sovrapposizioni)
            for (let i = 0; i < deviceIndex; i++) {
              const prevAccessory = attachedDevices[i];
              const hasColor = prevAccessory.color && prevAccessory.color.trim() !== '';
              
              // Calcola l'altezza dinamica basata sulla lunghezza del testo
              const nameLength = prevAccessory.name.length;
              const colorLength = hasColor ? prevAccessory.color!.length : 0;
              
              let dynamicHeight = 35; // Altezza base
              
              // Aggiusta per nome lungo (più di 15 caratteri tendono a mandare a capo)
              if (nameLength > 15) {
                dynamicHeight += 15; // Riga extra per il nome
              }
              
              // Aggiusta per colore lungo (più di 20 caratteri tendono a mandare a capo)
              if (hasColor) {
                dynamicHeight += 15; // Riga per il colore
                if (colorLength > 20) {
                  dynamicHeight += 15; // Riga extra per colore lungo
                }
              }
              
              totalHeight -= (dynamicHeight + 5); // Sottrai per andare verso l'alto
            }
            
            return { 
              ...device, 
              position: { 
                x: snappedPosition.x + 5, 
                y: snappedPosition.y + totalHeight 
              } 
            };
          } else {
            // Parte sud: accessori vanno verso il basso (comportamento originale)
            let totalHeight = 45; // Spazio iniziale dal dispositivo principale
            for (let i = 0; i < deviceIndex; i++) {
              const prevAccessory = attachedDevices[i];
              const hasColor = prevAccessory.color && prevAccessory.color.trim() !== '';
              
              // Calcola l'altezza dinamica basata sulla lunghezza del testo
              const nameLength = prevAccessory.name.length;
              const colorLength = hasColor ? prevAccessory.color!.length : 0;
              
              let dynamicHeight = 35; // Altezza base
              
              // Aggiusta per nome lungo (più di 15 caratteri tendono a mandare a capo)
              if (nameLength > 15) {
                dynamicHeight += 15; // Riga extra per il nome
              }
              
              // Aggiusta per colore lungo (più di 20 caratteri tendono a mandare a capo)
              if (hasColor) {
                dynamicHeight += 15; // Riga per il colore
                if (colorLength > 20) {
                  dynamicHeight += 15; // Riga extra per colore lungo
                }
              }
              
              totalHeight += dynamicHeight + 5;
            }
            
            return { 
              ...device, 
              position: { 
                x: snappedPosition.x + 5, 
                y: snappedPosition.y + totalHeight 
              } 
            };
          }
        }
      }
      return device;
    });
    onDevicesChange(updatedDevices);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!draggedDevice || !tableRef.current) {
      setDraggedDevice(null);
      return;
    }

    const draggedDeviceObj = devices.find(d => d.id === draggedDevice);
    if (!draggedDeviceObj) {
      setDraggedDevice(null);
      return;
    }

    const tableRect = tableRef.current.getBoundingClientRect();
    const dropX = e.clientX - tableRect.left - dragOffset.x;
    const dropY = e.clientY - tableRect.top - dragOffset.y;

    // Se è un accessorio, controlla se viene rilasciato sopra un dispositivo
    if (isAccessory(draggedDeviceObj.type)) {
      const targetDevice = findDeviceAt(dropX, dropY, draggedDevice);
      
      if (targetDevice && !isAccessory(targetDevice.type)) {
        // Calcola la posizione per il nuovo accessorio nella stack
        const existingAccessories = devices.filter(d => d.attachedToDevice === targetDevice.id);
        
        // Determina se il dispositivo è nella parte nord o sud del tavolo
        const tableHeight = 505;
        let centerY = tableHeight / 2;
        
        // Per doppio free standing, aggiusta il calcolo per il secondo tavolo
        if (tableType === 'doppio_free_standing' && targetDevice.position.y > tableHeight + 20) {
          // Il dispositivo è nel secondo tavolo (considerando lo spazio tra i tavoli)
          const secondTableStartY = tableHeight + 24; // space-y-6 = 24px
          centerY = secondTableStartY + tableHeight / 2;
        }
        
        const isNorthSide = targetDevice.position.y < centerY;
        
        let newPosition;
        if (isNorthSide) {
          // Parte nord: accessori vanno verso l'alto
          let totalHeight = -45; // Spazio iniziale sopra il dispositivo principale (aumentato per evitare sovrapposizioni)
          for (const accessory of existingAccessories) {
            const hasColor = accessory.color && accessory.color.trim() !== '';
            
            // Calcola l'altezza dinamica basata sulla lunghezza del testo
            const nameLength = accessory.name.length;
            const colorLength = hasColor ? accessory.color!.length : 0;
            
            let dynamicHeight = 35; // Altezza base
            
            // Aggiusta per nome lungo (più di 15 caratteri tendono a mandare a capo)
            if (nameLength > 15) {
              dynamicHeight += 15; // Riga extra per il nome
            }
            
            // Aggiusta per colore lungo (più di 20 caratteri tendono a mandare a capo)
            if (hasColor) {
              dynamicHeight += 15; // Riga per il colore
              if (colorLength > 20) {
                dynamicHeight += 15; // Riga extra per colore lungo
              }
            }
            
            totalHeight -= (dynamicHeight + 5); // Sottrai per andare verso l'alto
          }
          newPosition = { 
            x: targetDevice.position.x + 5, 
            y: targetDevice.position.y + totalHeight 
          };
        } else {
          // Parte sud: accessori vanno verso il basso (comportamento originale)
          let totalHeight = 45; // Spazio iniziale dal dispositivo principale
          for (const accessory of existingAccessories) {
            const hasColor = accessory.color && accessory.color.trim() !== '';
            
            // Calcola l'altezza dinamica basata sulla lunghezza del testo
            const nameLength = accessory.name.length;
            const colorLength = hasColor ? accessory.color!.length : 0;
            
            let dynamicHeight = 35; // Altezza base
            
            // Aggiusta per nome lungo (più di 15 caratteri tendono a mandare a capo)
            if (nameLength > 15) {
              dynamicHeight += 15; // Riga extra per il nome
            }
            
            // Aggiusta per colore lungo (più di 20 caratteri tendono a mandare a capo)
            if (hasColor) {
              dynamicHeight += 15; // Riga per il colore
              if (colorLength > 20) {
                dynamicHeight += 15; // Riga extra per colore lungo
              }
            }
            
            totalHeight += dynamicHeight + 5;
          }
          newPosition = { 
            x: targetDevice.position.x + 5, 
            y: targetDevice.position.y + totalHeight 
          };
        }
        
        // Attacca l'accessorio al dispositivo
        const updatedDevices = devices.map(device => {
          if (device.id === draggedDevice) {
            return {
              ...device,
              attachedToDevice: targetDevice.id,
              position: newPosition
            };
          }
          return device;
        });
        
        onDevicesChange(updatedDevices);
        setDraggedDevice(null);
        return;
      }
    }

    setDraggedDevice(null);
    setSnapLines({ x: [], y: [] }); // Reset snap lines
  };

  const removeDevice = (deviceId: string) => {
    const updatedDevices = devices.filter(device => {
      // Rimuovi il dispositivo principale
      if (device.id === deviceId) return false;
      
      // Rimuovi accessori attaccati al dispositivo che stiamo rimuovendo
      if (device.attachedToDevice === deviceId) return false;
      
      return true;
    }).map(device => {
      // Rimuovi il dispositivo dalle liste di accessori
      if (device.attachedAccessories) {
        return {
          ...device,
          attachedAccessories: device.attachedAccessories.filter(acc => acc.id !== deviceId)
        };
      }
      return device;
    });
    
    onDevicesChange(updatedDevices);
  };

  const renderTable = () => {
    const commonTableStyle = "relative bg-white dark:bg-gray-100 border-2 border-gray-800 shadow-lg";
    
    switch (tableType) {
      case 'singolo':
        return (
          <div className={`${commonTableStyle} w-full h-[505px] rounded-sm table-visualizer`}>
            {/* Superficie del tavolo */}
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300 rounded-sm">
              {/* Bordo superiore */}
              <div className="absolute top-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
              {/* Bordo inferiore */}
              <div className="absolute bottom-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
              {/* Linee laterali per struttura */}
              <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
              <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
              {/* Linea di separazione orizzontale al centro */}
              <div className="absolute top-1/2 left-1 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
              {/* Linea laterale sinistra come riferimento per 2 metri */}
              <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>
            </div>
          </div>
        );
        
      case 'doppio_back_to_back':
        // Separa i dispositivi per le due superfici
        const backToBackDevices = devices.filter(d => !d.attachedToDevice);
        const totalTableWidth = 2000;
        const midX = totalTableWidth / 2; // 1000px
        
        const leftSurfaceDevices = backToBackDevices.filter(device => {
          const x = device.position?.x || 0;
          return x < midX;
        });
        
        const rightSurfaceDevices = backToBackDevices.filter(device => {
          const x = device.position?.x || 0;
          return x >= midX;
        });

        return (
          <div className={`${commonTableStyle} w-[116%] max-w-none h-[505px] rounded-sm flex`}>
            {/* Primo tavolo */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300">
              {/* Bordo superiore */}
              <div className="absolute top-1 left-1 right-0 h-6 bg-gray-300 dark:bg-gray-400 rounded-l-sm border border-gray-400"></div>
              {/* Bordo inferiore */}
              <div className="absolute bottom-1 left-1 right-0 h-6 bg-gray-300 dark:bg-gray-400 rounded-l-sm border border-gray-400"></div>
              {/* Linea laterale sinistra */}
              <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
              {/* Linea di separazione orizzontale al centro */}
              <div className="absolute top-1/2 left-1 right-0 h-px bg-gray-600 transform -translate-y-1/2"></div>
              {/* Linea laterale sinistra come riferimento per 2 metri */}
              <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>

              {/* Dispositivi superficie sinistra */}
              {leftSurfaceDevices.map((device) => {
                const isInAssociationMode = associationMode?.active || false;
                const isAssociated = associationMode?.priceTag && device.deviceId === associationMode.priceTag.device_id;

                return (
                  <div
                    key={device.id}
                    className="absolute z-10"
                    style={{
                      left: device.position.x,
                      top: device.position.y,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, device.id)}
                  >
                    <div className="relative">
                      <div className={`relative ${getDeviceColor(device.type)} text-white text-xs p-2 rounded shadow-lg min-w-[120px] max-w-[160px] cursor-move border-2 border-transparent
                        ${draggedDevice === device.id ? 'opacity-75 transform rotate-1' : ''} 
                        ${isInAssociationMode ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                        ${isAssociated ? 'ring-2 ring-green-500' : ''}
                      `}>
                        {isInAssociationMode && (
                          <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                            isAssociated ? 'bg-green-500' : 'bg-blue-500'
                          }`}>
                            <Link2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <button
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          onClick={() => removeDevice(device.id)}
                        >
                          <X className="w-2 h-2" />
                        </button>
                        
                        <div className="font-medium truncate pr-4">
                          {device.name}
                        </div>
                        
                        {device.color && (
                          <div className="text-xs opacity-90 truncate">
                            {device.color}
                          </div>
                        )}
                        
                        {device.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {device.quantity}x
                          </Badge>
                        )}
                        {device.code && (
                          <div className="text-xs opacity-75 truncate">
                            {device.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Accessori dei dispositivi sulla superficie sinistra */}
              {devices.filter(d => d.attachedToDevice && leftSurfaceDevices.some(ld => ld.id === d.attachedToDevice)).map((accessory) => (
                <div
                  key={accessory.id}
                  className="absolute z-20 transition-transform"
                  style={{
                    left: accessory.position.x,
                    top: accessory.position.y,
                  }}
                >
                  <div className={`relative ${getDeviceColor(accessory.type)} text-white p-2 rounded shadow-lg min-w-[100px] max-w-[160px] opacity-90`}>
                    <button
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      onClick={() => removeDevice(accessory.id)}
                    >
                      <X className="w-1 h-1" />
                    </button>
                    <div className="font-medium text-xs pr-3 break-words whitespace-normal leading-tight">
                      {accessory.name}
                    </div>
                    {accessory.color && (
                      <div className="text-xs opacity-90 break-words whitespace-normal leading-tight mt-1">
                        {accessory.color}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Divisorio centrale */}
            <div className="w-2 bg-gray-800 relative">
              {/* Elementi di giunzione */}
              <div className="absolute top-1 left-0 right-0 h-6 bg-gray-600"></div>
              <div className="absolute bottom-1 left-0 right-0 h-6 bg-gray-600"></div>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-900 transform -translate-y-1/2"></div>
            </div>
            
            {/* Secondo tavolo */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300">
              {/* Bordo superiore */}
              <div className="absolute top-1 left-0 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-r-sm border border-gray-400"></div>
              {/* Bordo inferiore */}
              <div className="absolute bottom-1 left-0 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-r-sm border border-gray-400"></div>
              {/* Linea laterale destra */}
              <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
              {/* Linea di separazione orizzontale al centro */}
              <div className="absolute top-1/2 left-0 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
              {/* Linea laterale destra come riferimento per 2 metri */}
              <div className="absolute top-0 right-8 bottom-0 w-1 bg-gray-600"></div>

              {/* Dispositivi superficie destra - aggiusta coordinate X per visualizzazione */}
              {rightSurfaceDevices.map((device) => {
                const isInAssociationMode = associationMode?.active || false;
                const isAssociated = associationMode?.priceTag && device.deviceId === associationMode.priceTag.device_id;

                return (
                  <div
                    key={device.id}
                    className="absolute z-10"
                    style={{
                      left: device.position.x - midX, // Sottrai offset per visualizzazione corretta
                      top: device.position.y,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, device.id)}
                  >
                    <div className="relative">
                      <div className={`relative ${getDeviceColor(device.type)} text-white text-xs p-2 rounded shadow-lg min-w-[120px] max-w-[160px] cursor-move border-2 border-transparent
                        ${draggedDevice === device.id ? 'opacity-75 transform rotate-1' : ''} 
                        ${isInAssociationMode ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                        ${isAssociated ? 'ring-2 ring-green-500' : ''}
                      `}>
                        {isInAssociationMode && (
                          <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                            isAssociated ? 'bg-green-500' : 'bg-blue-500'
                          }`}>
                            <Link2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <button
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          onClick={() => removeDevice(device.id)}
                        >
                          <X className="w-2 h-2" />
                        </button>
                        
                        <div className="font-medium truncate pr-4">
                          {device.name}
                        </div>
                        
                        {device.color && (
                          <div className="text-xs opacity-90 truncate">
                            {device.color}
                          </div>
                        )}
                        
                        {device.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {device.quantity}x
                          </Badge>
                        )}
                        {device.code && (
                          <div className="text-xs opacity-75 truncate">
                            {device.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Accessori dei dispositivi sulla superficie destra */}
              {devices.filter(d => d.attachedToDevice && rightSurfaceDevices.some(rd => rd.id === d.attachedToDevice)).map((accessory) => (
                <div
                  key={accessory.id}
                  className="absolute z-20 transition-transform"
                  style={{
                    left: accessory.position.x - midX, // Sottrai offset per visualizzazione corretta
                    top: accessory.position.y,
                  }}
                >
                  <div className={`relative ${getDeviceColor(accessory.type)} text-white p-2 rounded shadow-lg min-w-[100px] max-w-[160px] opacity-90`}>
                    <button
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      onClick={() => removeDevice(accessory.id)}
                    >
                      <X className="w-1 h-1" />
                    </button>
                    <div className="font-medium text-xs pr-3 break-words whitespace-normal leading-tight">
                      {accessory.name}
                    </div>
                    {accessory.color && (
                      <div className="text-xs opacity-90 break-words whitespace-normal leading-tight mt-1">
                        {accessory.color}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'doppio_free_standing':
        return (
          <div className="w-full space-y-6 table-visualizer">
            {/* Primo tavolo */}
            <div className={`${commonTableStyle} w-full h-[505px] rounded-sm`}>
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300 rounded-sm">
                <div className="absolute top-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                <div className="absolute bottom-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
                {/* Linea di separazione orizzontale al centro */}
                <div className="absolute top-1/2 left-1 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
                {/* Linea laterale sinistra come riferimento per 2 metri */}
                <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>
              </div>
            </div>
            {/* Secondo tavolo */}
            <div className={`${commonTableStyle} w-full h-[505px] rounded-sm`}>
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-200 dark:to-gray-300 rounded-sm">
                <div className="absolute top-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                <div className="absolute bottom-1 left-1 right-1 h-6 bg-gray-300 dark:bg-gray-400 rounded-sm border border-gray-400"></div>
                <div className="absolute top-0 left-2 bottom-0 w-px bg-gray-400"></div>
                <div className="absolute top-0 right-2 bottom-0 w-px bg-gray-400"></div>
                {/* Linea di separazione orizzontale al centro */}
                <div className="absolute top-1/2 left-1 right-1 h-px bg-gray-600 transform -translate-y-1/2"></div>
                {/* Linea laterale sinistra come riferimento per 2 metri */}
                <div className="absolute top-0 left-8 bottom-0 w-1 bg-gray-600"></div>
              </div>
            </div>
          </div>
        );
        
      default:
        return <div className={`${commonTableStyle} w-full h-96 rounded-sm`}></div>;
    }
  };

  const getDeviceColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'iphone': return 'bg-blue-500';
      case 'ipad': return 'bg-purple-500';
      case 'mac': return 'bg-gray-500';
      case 'watch': return 'bg-red-500';
      case 'accessori': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Funzione per verificare se un dispositivo è associato al cartello selezionato
  const isDeviceAssociated = (deviceId: string) => {
    if (!associationMode?.active) return false;
    const associatedDevices = associationMode.priceTag.associatedDevices || [];
    return associatedDevices.includes(deviceId);
  };

  return (
    <Card className="card-apple">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Layout Tavolo - {tableType.replace('_', ' ')}</CardTitle>
          <div className="flex items-center gap-2">
            {/* Controlli zoom */}
            <div className="flex items-center gap-1 mr-2">
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
            
            <Button onClick={onAddDevice} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Dispositivo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          // Vista mobile - mostra solo il messaggio
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
            <Smartphone className="w-16 h-16 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Visualizzazione tavolo non disponibile su telefono</h3>
              <p className="text-muted-foreground">
                Per utilizzare la configurazione del tavolo, accedi da desktop o tablet
              </p>
            </div>
          </div>
        ) : (
          // Vista desktop - mostra la visualizzazione completa
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <div 
              ref={tableRef}
              className="relative select-none min-w-fit transition-transform origin-top-left"
              style={{ transform: `scale(${zoom})` }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setDraggedDevice(null);
                setSnapLines({ x: [], y: [] });
              }}
            >
              {renderTable()}
              
              {/* Snap Lines */}
              {snapLines.x.map((x, index) => (
                <div
                  key={`snap-x-${index}`}
                  className="absolute bg-blue-500 opacity-50 pointer-events-none"
                  style={{
                    left: x,
                    top: 0,
                    width: '2px',
                    height: '100%'
                  }}
                />
              ))}
              {snapLines.y.map((y, index) => (
                <div
                  key={`snap-y-${index}`}
                  className="absolute bg-blue-500 opacity-50 pointer-events-none"
                  style={{
                    left: 0,
                    top: y,
                    width: '100%',
                    height: '2px'
                  }}
                />
              ))}
              
              {/* Connessioni (catene) tra dispositivi e accessori */}
              {devices.filter(device => device.attachedToDevice).map((accessory) => {
                const parentDevice = devices.find(d => d.id === accessory.attachedToDevice);
                if (!parentDevice) return null;

                const startX = parentDevice.position.x + 60; // Centro dispositivo
                const startY = parentDevice.position.y + 40; // Bottom dispositivo
                const endX = accessory.position.x + 40; // Centro accessorio
                const endY = accessory.position.y + 5; // Top accessorio

                return (
                  <svg
                    key={`connection-${accessory.id}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 5
                    }}
                  >
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    <circle
                      cx={startX}
                      cy={startY}
                      r="3"
                      fill="#3b82f6"
                    />
                    <circle
                      cx={endX}
                      cy={endY}
                      r="3"
                      fill="#3b82f6"
                    />
                  </svg>
                );
              })}

              {/* Dispositivi */}
              {devices.filter(device => !device.attachedToDevice && tableType !== 'doppio_back_to_back').map((device) => {
                const isAssociated = isDeviceAssociated(device.id);
                const isInAssociationMode = associationMode?.active;
                
                return (
                  <div key={device.id}>
                    {/* Dispositivo principale */}
                    <div
                      className={`absolute transition-all duration-200 hover:scale-105 ${
                        draggedDevice === device.id ? 'z-50' : 'z-10'
                      } ${
                        isInAssociationMode 
                          ? 'cursor-pointer' 
                          : 'cursor-move'
                      } ${
                        isInAssociationMode && isAssociated 
                          ? 'ring-2 ring-green-400 ring-offset-2' 
                          : ''
                      }`}
                      style={{
                        left: device.position.x,
                        top: device.position.y,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, device.id)}
                      title={
                        isInAssociationMode 
                          ? isAssociated 
                            ? `Clicca per rimuovere associazione con "${associationMode.priceTag.name}"` 
                            : `Clicca per associare a "${associationMode.priceTag.name}"`
                          : 'Trascina per spostare'
                      }
                    >
                      <div className={`relative ${getDeviceColor(device.type)} text-white text-xs p-2 rounded shadow-lg min-w-[120px] max-w-[160px] ${
                        isInAssociationMode && isAssociated ? 'ring-1 ring-green-300' : ''
                      }`}>
                        {/* Icona associazione quando in modalità associazione */}
                        {isInAssociationMode && (
                          <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                            isAssociated ? 'bg-green-500' : 'bg-blue-500'
                          }`}>
                            <Link2 className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <button
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          onClick={() => removeDevice(device.id)}
                        >
                          <X className="w-2 h-2" />
                        </button>
                        
                        {/* Nome del dispositivo */}
                        <div className="font-medium truncate pr-4">
                          {device.name}
                        </div>
                        
                        {/* Colore su riga separata */}
                        {device.color && (
                          <div className="text-xs opacity-90 truncate">
                            {device.color}
                          </div>
                        )}
                        
                        {device.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {device.quantity}x
                          </Badge>
                        )}
                        {device.code && (
                          <div className="text-xs opacity-75 truncate">
                            {device.code}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Accessori attaccati */}
              {devices.filter(device => device.attachedToDevice && tableType !== 'doppio_back_to_back').map((accessory) => (
                <div
                  key={accessory.id}
                  className="absolute z-20 transition-transform"
                  style={{
                    left: accessory.position.x,
                    top: accessory.position.y,
                  }}
                >
                  <div className={`relative ${getDeviceColor(accessory.type)} text-white p-2 rounded shadow-lg min-w-[100px] max-w-[160px] opacity-90`}>
                    <button
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      onClick={() => removeDevice(accessory.id)}
                    >
                      <X className="w-1 h-1" />
                    </button>
                    <div className="font-medium text-xs pr-3 break-words whitespace-normal leading-tight">
                      {accessory.name}
                    </div>
                    {accessory.color && (
                      <div className="text-xs opacity-90 break-words whitespace-normal leading-tight mt-1">
                        {accessory.color}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {devices.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p>Nessun dispositivo posizionato</p>
                    <p className="text-sm">Aggiungi dispositivi o analizza un planogramma</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>💡 Trascina i dispositivi per posizionarli sul tavolo</p>
              <p>💡 I dispositivi si allineano automaticamente tra loro</p>
              <p>💡 Trascina un accessorio sopra un dispositivo per collegarlo</p>
              <p>💡 Clicca sulla X per rimuovere un dispositivo</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}