import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Target, Upload, Trash2, ZoomIn, ZoomOut, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Device {
  id: string;
  name: string;
  type: string;
  color: string;
  quantity: number;
  position: { x: number; y: number };
  accessories?: Device[];
}

interface DeviceSlot {
  id: string;
  position: { x: number; y: number }; // Coordinate fisse relative al centro della lavagna (in pixel)
  deviceId?: string;
}

interface BoardDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface TestTableVisualizerProps {
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  onAddDevice: () => void;
  tableId: string;
  existingImageUrl?: string;
  existingSlots?: DeviceSlot[];
  onSlotsChange?: (slots: DeviceSlot[]) => void; // Nuova callback per comunicare i cambiamenti degli slot
}

export function TestTableVisualizer({ 
  devices, 
  onDevicesChange, 
  onAddDevice,
  tableId,
  existingImageUrl,
  existingSlots = [],
  onSlotsChange
}: TestTableVisualizerProps) {
  const [tableImage, setTableImage] = useState<string | null>(existingImageUrl || null);
  const [slots, setSlots] = useState<DeviceSlot[]>(existingSlots);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [fixedBoardDimensions, setFixedBoardDimensions] = useState<BoardDimensions | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [tempImageScale, setTempImageScale] = useState(1);
  const [viewZoom, setViewZoom] = useState(1); // Zoom per l'intera visualizzazione
  
  // Calcola il minWidth dinamico per il container scrollabile
  const calculateScrollContainerMinWidth = () => {
    if (!imageDimensions.width || !fixedBoardDimensions) return 1200;
    
    const currentScale = isResizing ? tempImageScale : imageScale;
    const scaledImageWidth = imageDimensions.width * currentScale;
    
    // Applica il viewZoom direttamente alle dimensioni
    const zoomedBoardWidth = fixedBoardDimensions.width * viewZoom;
    const zoomedImageWidth = scaledImageWidth * viewZoom;
    
    // Il minWidth deve essere almeno la larghezza della lavagna zoomata + padding per dispositivi
    const minWidthForBoard = Math.max(zoomedBoardWidth, zoomedImageWidth) + 364;
    
    return minWidthForBoard;
  };
  
  // Stati per il drag system dei dispositivi (come nel TableVisualizer standard)
  const [draggedDevice, setDraggedDevice] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [snapLines, setSnapLines] = useState<{x: number[], y: number[]}>({x: [], y: []});
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const SNAP_THRESHOLD = 15;

  // Calcola le dimensioni dinamiche della lavagna basate sull'immagine scalata + padding fisso
  const calculateDynamicBoardDimensions = (scale: number = 1) => {
    if (!imageDimensions.width || !imageDimensions.height) return null;
    
    const padding = 140 * viewZoom; // Padding scalato con il zoom
    const scaledWidth = imageDimensions.width * scale * viewZoom;
    const scaledHeight = imageDimensions.height * scale * viewZoom;
    
    return {
      width: scaledWidth + padding,
      height: scaledHeight + padding,
      centerX: (scaledWidth + padding) / 2,
      centerY: (scaledHeight + padding) / 2
    };
  };

  // Carica le dimensioni dell'immagine esistente e crea la lavagna dinamica
  useEffect(() => {
    if (existingImageUrl && !imageDimensions.width) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        
        // Carica la scala dell'immagine esistente dal database
        loadImageScale();
      };
      img.src = existingImageUrl;
    }
  }, [existingImageUrl, imageDimensions.width]);

  // Aggiorna le dimensioni della lavagna quando cambiano scala, dimensioni immagine o zoom
  useEffect(() => {
    if (imageDimensions.width && imageDimensions.height) {
      const currentScale = isResizing ? tempImageScale : imageScale;
      const dynamicBoard = calculateDynamicBoardDimensions(currentScale);
      setFixedBoardDimensions(dynamicBoard);
    }
  }, [imageDimensions.width, imageDimensions.height, imageScale, tempImageScale, isResizing, viewZoom]);

  const loadImageScale = async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('image_scale')
        .eq('id', tableId)
        .single();
        
      if (error) throw error;
      
      const scale = data?.image_scale || 1;
      setImageScale(scale);
      setTempImageScale(scale);
    } catch (error) {
      console.error('Error loading image scale:', error);
      // Fallback a scala 1 se non riesce a caricare
      setImageScale(1);
      setTempImageScale(1);
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${tableId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('table-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('table-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Errore caricamento",
        description: "Impossibile caricare l'immagine",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const saveToDatabase = async (imageUrl: string, scale: number = 1) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ 
          image_url: imageUrl, 
          slots: slots as any,
          image_scale: scale
        })
        .eq('id', tableId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving to database:', error);
      toast({
        title: "Errore salvataggio",
        description: "Impossibile salvare i dati nel database",
        variant: "destructive"
      });
    }
  };

  const processImageFile = async (file: File, replaceExisting = false) => {
    const imageUrl = await uploadImageToStorage(file);
    if (!imageUrl) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        setImageDimensions({ width: img.width, height: img.height });
        
        // Le dimensioni della lavagna verranno calcolate dinamicamente dal useEffect
        // quando si aggiornano imageDimensions e imageScale
        setTableImage(imageUrl);
        
        // Se stiamo sostituendo, resetta gli slot ma mantieni i dispositivi
        if (replaceExisting) {
          const newSlots: DeviceSlot[] = [];
          setSlots(newSlots);
          onSlotsChange?.(newSlots);
        }
        
        // Imposta la modalità resize per permettere il ridimensionamento
        setIsResizing(true);
        setImageScale(1);
        setTempImageScale(1);
        
        toast({
          title: replaceExisting ? "Immagine sostituita" : "Immagine caricata",
          description: "Regola la dimensione dell'immagine e salva la configurazione"
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Se c'è già un'immagine, chiedi conferma prima di sostituire
      if (tableImage) {
        setPendingFile(file);
        setShowReplaceConfirm(true);
      } else {
        processImageFile(file);
      }
    }
  };

  const handleReplaceConfirm = () => {
    if (pendingFile) {
      processImageFile(pendingFile, true);
      setPendingFile(null);
    }
    setShowReplaceConfirm(false);
  };

  const handleReplaceCancel = () => {
    setPendingFile(null);
    setShowReplaceConfirm(false);
    // Reset del file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveImageConfiguration = async () => {
    if (!tableImage) return;
    
    setImageScale(tempImageScale);
    await saveToDatabase(tableImage, tempImageScale);
    setIsResizing(false);
    
    toast({
      title: "Configurazione salvata",
      description: "La dimensione dell'immagine è stata salvata. Ora puoi creare gli slot per i dispositivi."
    });
  };

  const handleCancelImageConfiguration = () => {
    // Ripristina l'immagine e la lavagna originali
    setTableImage(null);
    setImageDimensions({ width: 0, height: 0 });
    setFixedBoardDimensions(null);
    setIsResizing(false);
    setImageScale(1);
    setTempImageScale(1);
    
    toast({
      title: "Caricamento annullato",
      description: "L'immagine è stata rimossa"
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      // Se c'è già un'immagine, chiedi conferma prima di sostituire
      if (tableImage) {
        setPendingFile(files[0]);
        setShowReplaceConfirm(true);
      } else {
        processImageFile(files[0]);
      }
    } else {
      toast({
        title: "Errore",
        description: "Per favore carica solo file immagine",
        variant: "destructive"
      });
    }
  };

  const handleBoardClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCreatingSlot || !tableImage || !boardRef.current || !fixedBoardDimensions) return;
    
    // Trova l'elemento immagine DOM
    const imgElement = boardRef.current.querySelector('img');
    if (!imgElement) return;
    
    // Ottieni le dimensioni e posizione reali dell'immagine renderizzata
    const imgRect = imgElement.getBoundingClientRect();
    
    // Coordinate del click relative all'immagine renderizzata
    const clickX = event.clientX - imgRect.left;
    const clickY = event.clientY - imgRect.top;
    
    // Verifica che il click sia dentro l'immagine
    if (clickX < 0 || clickX > imgRect.width || clickY < 0 || clickY > imgRect.height) {
      toast({
        title: "Posizione non valida",
        description: "Clicca sull'immagine del tavolo per creare uno slot",
        variant: "destructive"
      });
      return;
    }
    
    // Converti le coordinate del click in coordinate fisse della lavagna
    // Le coordinate relative all'immagine (0-1)
    const relativeX = clickX / imgRect.width;
    const relativeY = clickY / imgRect.height;
    
    // Converti in coordinate della lavagna fissa (centro a 600,400)
    const boardX = (relativeX - 0.5) * fixedBoardDimensions.width + fixedBoardDimensions.centerX;
    const boardY = (relativeY - 0.5) * fixedBoardDimensions.height + fixedBoardDimensions.centerY;
    
    const newSlot: DeviceSlot = {
      id: `slot-${Date.now()}`,
      position: { x: boardX, y: boardY }
    };
    
    const updatedSlots = [...slots, newSlot];
    setSlots(updatedSlots);
    setIsCreatingSlot(false);
    
    // Notifica la pagina principale dei cambiamenti degli slot
    onSlotsChange?.(updatedSlots);
    
    // Salva immediatamente gli slot aggiornati
    try {
      const { error } = await supabase
        .from('tables')
        .update({ slots: updatedSlots as any })
        .eq('id', tableId);
        
      if (error) throw error;
      
      toast({
        title: "Slot creato e salvato",
        description: "Trascina un dispositivo sulla freccia per assegnarlo"
      });
    } catch (error) {
      console.error('Error saving slots:', error);
      toast({
        title: "Errore salvataggio slot",
        description: "Lo slot è stato creato ma non salvato",
        variant: "destructive"
      });
    }
  };

  const handleDeviceDrop = (event: React.DragEvent, slotId: string) => {
    event.preventDefault();
    const deviceId = event.dataTransfer.getData('text/plain');
    
    const updatedSlots = slots.map(slot => 
      slot.id === slotId ? { ...slot, deviceId } : slot
    );
    setSlots(updatedSlots);
    
    // Posiziona il dispositivo a destra dell'area (usando la lavagna fissa)
    if (fixedBoardDimensions) {
      const rightMargin = fixedBoardDimensions.width * 0.9;
      const updatedDevices = devices.map(device => 
        device.id === deviceId 
          ? { ...device, position: { x: rightMargin, y: 100 } }
          : device
      );
      onDevicesChange(updatedDevices);
    }
    
    toast({
      title: "Dispositivo assegnato",
      description: "Il dispositivo è stato posizionato nello slot"
    });
  };

  const handleSlotDragStart = (event: React.DragEvent, slotId: string) => {
    setDraggedSlot(slotId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSlotDrag = (event: React.MouseEvent, slotId: string) => {
    if (event.buttons !== 1 || !boardRef.current || !fixedBoardDimensions) return;
    
    // Trova l'elemento immagine DOM
    const imgElement = boardRef.current.querySelector('img');
    if (!imgElement) return;
    
    // Ottieni le dimensioni e posizione reali dell'immagine renderizzata
    const imgRect = imgElement.getBoundingClientRect();
    
    // Coordinate del drag relative all'immagine renderizzata
    const dragX = event.clientX - imgRect.left;
    const dragY = event.clientY - imgRect.top;
    
    // Verifica che il drag sia dentro l'immagine
    if (dragX < 0 || dragX > imgRect.width || dragY < 0 || dragY > imgRect.height) return;
    
    // Converti in coordinate della lavagna fissa
    const relativeX = dragX / imgRect.width;
    const relativeY = dragY / imgRect.height;
    
    const boardX = (relativeX - 0.5) * fixedBoardDimensions.width + fixedBoardDimensions.centerX;
    const boardY = (relativeY - 0.5) * fixedBoardDimensions.height + fixedBoardDimensions.centerY;
    
    const updatedSlots = slots.map(slot => 
      slot.id === slotId 
        ? { ...slot, position: { x: boardX, y: boardY } }
        : slot
    );
    setSlots(updatedSlots);
    
    // Notifica la pagina principale dei cambiamenti degli slot
    onSlotsChange?.(updatedSlots);
  };

  const handleSlotDragEnd = async () => {
    if (draggedSlot) {
      // Salva la nuova posizione nel database
      try {
        const { error } = await supabase
          .from('tables')
          .update({ slots: slots as any })
          .eq('id', tableId);
          
        if (error) throw error;
      } catch (error) {
        console.error('Error saving slot position:', error);
      }
      
      setDraggedSlot(null);
    }
  };

  // Sistema di drag mouse-based per dispositivi (come nel TableVisualizer standard)
  const getDevicePixelRatio = () => {
    return window.devicePixelRatio || 1;
  };
  
  const getScaledDimensions = () => {
    const ratio = getDevicePixelRatio();
    const baseScale = ratio > 1.5 ? 1 / (ratio * 0.7) : 1;
    return {
      deviceWidth: Math.round(120 * baseScale * viewZoom),
      deviceHeight: Math.round(40 * baseScale * viewZoom),
      snapThreshold: Math.round(SNAP_THRESHOLD * baseScale * viewZoom)
    };
  };

  const getSnapPosition = (x: number, y: number, currentDeviceId: string) => {
    const { deviceWidth, deviceHeight, snapThreshold } = getScaledDimensions();
    const otherDevices = devices.filter(d => d.id !== currentDeviceId);
    const snapX: number[] = [];
    const snapY: number[] = [];
    
    // Aggiungi posizioni degli altri dispositivi per lo snap (scalate con viewZoom)
    otherDevices.forEach(device => {
      const scaledX = device.position.x * viewZoom;
      const scaledY = device.position.y * viewZoom;
      snapX.push(scaledX);
      snapX.push(scaledX + deviceWidth);
      snapY.push(scaledY);  
      snapY.push(scaledY + deviceHeight);
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

  const handleDeviceMouseDown = (e: React.MouseEvent, deviceId: string) => {
    e.preventDefault();
    
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedDevice(deviceId);
  };

  const handleDeviceMouseMove = (e: React.MouseEvent) => {
    if (!draggedDevice || !boardRef.current || !fixedBoardDimensions) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const newX = e.clientX - boardRect.left - dragOffset.x;
    const newY = e.clientY - boardRect.top - dragOffset.y;

    // Bounds checking (considera il viewZoom)
    const { deviceWidth, deviceHeight } = getScaledDimensions();
    const maxX = fixedBoardDimensions.width - deviceWidth;
    const maxY = fixedBoardDimensions.height - deviceHeight;

    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));

    // Applica lo snap (le coordinate vengono già scalate dentro getSnapPosition)
    const snappedPosition = getSnapPosition(boundedX, boundedY, draggedDevice);

    const updatedDevices = devices.map(device => {
      if (device.id === draggedDevice) {
        // Converti le coordinate scalate in coordinate logiche (dividi per viewZoom)
        return { ...device, position: { x: snappedPosition.x / viewZoom, y: snappedPosition.y / viewZoom } };
      }
      return device;
    });
    onDevicesChange(updatedDevices);
  };

  const handleDeviceMouseUp = (e: React.MouseEvent) => {
    if (!draggedDevice) {
      setDraggedDevice(null);
      return;
    }

    setDraggedDevice(null);
    setSnapLines({ x: [], y: [] });
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

  const removeSlot = async (slotId: string) => {
    const updatedSlots = slots.filter(slot => slot.id !== slotId);
    setSlots(updatedSlots);
    
    // Notifica la pagina principale dei cambiamenti degli slot
    onSlotsChange?.(updatedSlots);
    
    // Rimuovi anche l'assegnazione del dispositivo se presente
    const slot = slots.find(s => s.id === slotId);
    if (slot?.deviceId) {
      const updatedDevices = devices.map(device => 
        device.id === slot.deviceId 
          ? { ...device, position: { x: 50, y: 50 } }
          : device
      );
      onDevicesChange(updatedDevices);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controlli */}
      <div className="flex gap-4">
        <Button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          variant={isDragOver ? "default" : "outline"}
          disabled={isUploading || isResizing}
          className={`transition-all ${isDragOver ? 'bg-primary text-primary-foreground border-primary' : ''}`}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading 
            ? 'Caricamento...' 
            : isDragOver 
              ? 'Rilascia immagine qui' 
              : tableImage 
                ? isResizing 
                  ? 'Configura dimensione...'
                  : 'Sostituisci Immagine Tavolo'
                : 'Carica Immagine Tavolo'
          }
        </Button>
        
        {tableImage && !isResizing && (
          <>
            <Button
              onClick={() => setIsCreatingSlot(!isCreatingSlot)}
              variant={isCreatingSlot ? "default" : "outline"}
            >
              <Target className="w-4 h-4 mr-2" />
              {isCreatingSlot ? "Annulla Creazione Slot" : "Crea Slot Dispositivo"}
            </Button>

            <Button
              onClick={() => setShowSlots(!showSlots)}
              variant={showSlots ? "default" : "outline"}
            >
              {showSlots ? "Nascondi Slot" : "Mostra Slot"}
            </Button>
          </>
        )}

        {!isResizing && (
          <Button onClick={onAddDevice}>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Dispositivo
          </Button>
        )}
      </div>

      {/* Controlli di zoom per la visualizzazione */}
      {tableImage && !isResizing && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
          <span className="text-sm font-medium">Zoom visualizzazione:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewZoom(Math.max(0.25, viewZoom - 0.25))}
            disabled={viewZoom <= 0.25}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-[60px] text-center bg-white px-2 py-1 rounded border">
            {Math.round(viewZoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewZoom(Math.min(2, viewZoom + 0.25))}
            disabled={viewZoom >= 2}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewZoom(1)}
          >
            Ripristina
          </Button>
          <div className="text-xs text-gray-500 ml-4">
            Riduci lo zoom per vedere tutto il tavolo senza scrollare
          </div>
        </div>
      )}

      {/* Pannello di controllo ridimensionamento immagine */}
      {isResizing && tableImage && (
        <Card className="mb-4 border-blue-500 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <ZoomIn className="w-5 h-5 mr-2" />
              Configura Dimensione Immagine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTempImageScale(Math.max(0.1, tempImageScale - 0.1))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <div className="flex-1">
                <Slider
                  value={[tempImageScale]}
                  onValueChange={(value) => setTempImageScale(value[0])}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTempImageScale(Math.min(2, tempImageScale + 0.1))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <span className="text-sm font-medium min-w-[4rem]">
                {Math.round(tempImageScale * 100)}%
              </span>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleCancelImageConfiguration}
              >
                <X className="w-4 h-4 mr-2" />
                Annulla
              </Button>
              <Button
                onClick={handleSaveImageConfiguration}
              >
                <Save className="w-4 h-4 mr-2" />
                Salva Configurazione
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Container principale con bordo giallo */}
      <div className="border-8 border-yellow-500 rounded-lg bg-white shadow-2xl">
        <div 
          className="overflow-auto max-h-[80vh] min-h-[600px] relative bg-white rounded-lg"
          style={{
            minWidth: `${calculateScrollContainerMinWidth()}px`,
            height: `${600 * viewZoom}px`,
            maxHeight: `${80 * viewZoom}vh`
          }}
        >
          {!tableImage ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Carica un'immagine del tavolo per iniziare</p>
                <p className="text-gray-400 text-sm mt-2">Trascina un'immagine sul pulsante "Carica Immagine"</p>
              </div>
            </div>
          ) : (
            <div 
              className="relative"
              style={{
                padding: `${8 * viewZoom}px`
              }}
            >
              {/* Area della lavagna - tutta l'area interna cliccabile */}
                <div
                  ref={boardRef}
                  className="relative bg-white cursor-pointer mx-auto"
                  style={{
                    width: fixedBoardDimensions ? `${fixedBoardDimensions.width}px` : 'auto',
                    height: fixedBoardDimensions ? `${fixedBoardDimensions.height}px` : 'auto',
                    minHeight: fixedBoardDimensions ? `${fixedBoardDimensions.height}px` : 'auto'
                  }}
                onClick={isResizing ? undefined : handleBoardClick}
                onMouseMove={isResizing ? undefined : handleDeviceMouseMove}
                onMouseUp={isResizing ? undefined : handleDeviceMouseUp}
                >
                {/* Immagine centrata */}
                <div 
                  className="absolute flex items-center justify-center"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: fixedBoardDimensions ? `${fixedBoardDimensions.width}px` : 'auto',
                    height: fixedBoardDimensions ? `${fixedBoardDimensions.height}px` : 'auto'
                  }}
                >
                  <img
                    src={tableImage}
                    alt="Tavolo"
                    className="object-contain rounded shadow-lg"
                    style={{
                      width: `${imageDimensions.width * (isResizing ? tempImageScale : imageScale) * viewZoom}px`,
                      height: `${imageDimensions.height * (isResizing ? tempImageScale : imageScale) * viewZoom}px`,
                      transition: isResizing ? 'none' : 'all 0.3s ease'
                    }}
                  />
                </div>
                
                {/* Marker SVG condiviso per tutte le frecce */}
                <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: 0, height: 0 }}>
                  <defs>
                    <marker id="shared-arrowhead" markerWidth="10" markerHeight="8" 
                     refX="8" refY="4" orient="auto">
                      <polygon points="0 0, 10 4, 0 8" fill="#000000" />
                    </marker>
                  </defs>
                </svg>

                {/* Slots con frecce sempre visibili */}
                {slots.map(slot => {
                  if (!fixedBoardDimensions) return null;
                  
                  // Trova l'elemento immagine DOM per le dimensioni reali
                  const imgElement = boardRef.current?.querySelector('img');
                  if (!imgElement) return null;
                  
                  const imgRect = imgElement.getBoundingClientRect();
                  const boardRect = boardRef.current!.getBoundingClientRect();
                  
                  // Converti le coordinate della lavagna fissa in coordinate relative all'immagine
                  const relativeX = (slot.position.x - fixedBoardDimensions.centerX) / fixedBoardDimensions.width + 0.5;
                  const relativeY = (slot.position.y - fixedBoardDimensions.centerY) / fixedBoardDimensions.height + 0.5;
                  
                  // Posizione assoluta dello slot rispetto al container della lavagna
                  const slotX = (imgRect.left - boardRect.left) + (relativeX * imgRect.width);
                  const slotY = (imgRect.top - boardRect.top) + (relativeY * imgRect.height);
                  
                  // Bordi dell'immagine relativi al container della lavagna
                  const imageTop = imgRect.top - boardRect.top;
                  const imageBottom = imgRect.bottom - boardRect.top;
                  
                  // Determina da quale bordo partire (il più vicino allo slot)
                  const distanceToTop = Math.abs(slotY - imageTop);
                  const distanceToBottom = Math.abs(slotY - imageBottom);
                  const useTopBorder = distanceToTop < distanceToBottom;
                  
                  // Punto di partenza della freccia (30px dal bordo, scalato con il zoom)
                  const arrowOffset = 30 * viewZoom;
                  const arrowStartY = useTopBorder ? imageTop - arrowOffset : imageBottom + arrowOffset;
                  const arrowStartX = slotX; // Stesso X dello slot per linea verticale
                  
                  // Calcola il punto di fine della freccia (bordo del cerchio dello slot, non centro)
                  const slotRadius = 24 * viewZoom; // Raggio dello slot scalato con il zoom
                  
                  // Calcola il punto di arrivo corretto in base alla direzione
                  let arrowEndY;
                  if (useTopBorder) {
                    // Freccia va verso il basso, si ferma sopra il cerchio
                    arrowEndY = slotY - slotRadius;
                  } else {
                    // Freccia va verso l'alto, si ferma sotto il cerchio  
                    arrowEndY = slotY + slotRadius;
                  }
                  
                  return (
                    <div key={slot.id} className="absolute">
                      {/* Freccia sempre visibile - dal bordo dell'immagine al bordo dello slot */}
                      <svg 
                        className="absolute pointer-events-none" 
                        style={{ 
                          left: 0,
                          top: 0,
                          width: `${fixedBoardDimensions.width}px`,
                          height: `${fixedBoardDimensions.height}px`,
                          zIndex: 1
                        }}
                      >
                        <line 
                          x1={arrowStartX} 
                          y1={arrowStartY} 
                          x2={slotX} 
                          y2={arrowEndY} 
                          stroke="#000000" 
                          strokeWidth={2 * viewZoom}
                          markerEnd="url(#shared-arrowhead)"
                        />
                      </svg>
                      
                      {/* Punto di slot - visibile solo se showSlots è true */}
                      {showSlots && (
                        <div
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{ 
                            left: `${slotX}px`, 
                            top: `${slotY}px`
                          }}
                        >
                          <div 
                            className="bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors cursor-move relative z-10"
                            style={{
                              padding: `${12 * viewZoom}px`
                            }}
                            onDrop={(e) => handleDeviceDrop(e, slot.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseMove={(e) => handleSlotDrag(e, slot.id)}
                            onMouseUp={handleSlotDragEnd}
                            draggable={false}
                          >
                            <Target style={{ width: `${16 * viewZoom}px`, height: `${16 * viewZoom}px` }} />
                            
                            {/* Bottone per rimuovere slot */}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute bg-gray-700 hover:bg-gray-800"
                              style={{
                                top: `${-4 * viewZoom}px`,
                                right: `${-4 * viewZoom}px`,
                                width: `${20 * viewZoom}px`,
                                height: `${20 * viewZoom}px`,
                                padding: 0
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSlot(slot.id);
                              }}
                            >
                              <Trash2 style={{ width: `${12 * viewZoom}px`, height: `${12 * viewZoom}px` }} />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Box di connessione prodotti - visibile solo se showSlots è true */}
                      {showSlots && (
                        <div
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{ 
                            left: `${arrowStartX}px`, 
                            top: `${arrowStartY}px`
                          }}
                        >
                          <div 
                            className="bg-blue-500 text-white rounded shadow-lg border border-blue-600 font-semibold z-10"
                            style={{
                              paddingLeft: `${8 * viewZoom}px`,
                              paddingRight: `${8 * viewZoom}px`,
                              paddingTop: `${4 * viewZoom}px`,
                              paddingBottom: `${4 * viewZoom}px`,
                              fontSize: `${12 * viewZoom}px`
                            }}
                          >
                            Prodotti
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Snap lines visualization */}
                {snapLines.x.map((x, i) => (
                  <div
                    key={`snap-x-${i}`}
                    className="absolute bg-blue-500 pointer-events-none z-30"
                    style={{
                      left: x,
                      top: 0,
                      width: `${1 * viewZoom}px`,
                      height: '100%',
                      opacity: 0.7
                    }}
                  />
                ))}
                {snapLines.y.map((y, i) => (
                  <div
                    key={`snap-y-${i}`}
                    className="absolute bg-blue-500 pointer-events-none z-30"
                    style={{
                      left: 0,
                      top: y,
                      width: '100%',
                      height: `${1 * viewZoom}px`,
                      opacity: 0.7
                    }}
                  />
                ))}

                {/* Dispositivi (posizionati a destra dell'area centrale) */}
                {devices.map((device, index) => {
                  const rightMargin = fixedBoardDimensions ? fixedBoardDimensions.width * 0.8 : 960;
                  return (
                    <div
                      key={device.id}
                      className={`absolute ${getDeviceColor(device.type)} text-white rounded shadow-lg cursor-move z-20 select-none ${
                        draggedDevice === device.id ? 'opacity-80 shadow-xl' : ''
                      }`}
                      style={{
                        left: (device.position.x || rightMargin / viewZoom) * viewZoom,
                        top: (device.position.y || (50 / viewZoom + index * 80)) * viewZoom,
                        padding: `${8 * viewZoom}px`,
                        fontSize: `${12 * viewZoom}px`,
                        minWidth: `${120 * viewZoom}px`,
                        maxWidth: `${160 * viewZoom}px`
                      }}
                      onMouseDown={(e) => handleDeviceMouseDown(e, device.id)}
                    >
                      <div className="font-medium truncate">{device.name}</div>
                      {device.color && (
                        <div className="text-xs opacity-90 truncate">{device.color}</div>
                      )}
                      {device.quantity > 1 && (
                        <div className="text-xs font-bold">x{device.quantity}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dialog di conferma sostituzione immagine */}
          <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sostituire l'immagine esistente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stai per sostituire l'immagine del tavolo esistente. Questa azione:
                  <br />• Sostituirà l'immagine attuale con quella nuova
                  <br />• Ricreerà la lavagna resettando tutti gli slot
                  <br />• Manterrà i dispositivi nelle loro posizioni
                  <br /><br />
                  Vuoi continuare?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleReplaceCancel}>
                  Annulla
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleReplaceConfirm}>
                  Sostituisci Immagine
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isCreatingSlot && tableImage && (
            <div className="absolute top-4 left-4 bg-blue-100 border border-blue-300 rounded-lg p-3 z-50">
              <p className="text-sm text-blue-800">
                <Target className="w-4 h-4 inline mr-1" />
                Clicca ovunque nella lavagna bianca per creare un nuovo slot
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}