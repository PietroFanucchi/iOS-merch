import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DeviceCategory, Device } from "@/types/device";

interface DeviceFormProps {
  onDeviceCreated: () => void;
  device?: Device;
  trigger?: React.ReactNode;
}

export function DeviceForm({ onDeviceCreated, device, trigger }: DeviceFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(device?.name || "");
  const [category, setCategory] = useState<DeviceCategory | "">(device?.category || "");
  const [model, setModel] = useState(device?.model || "");
  const [description, setDescription] = useState(device?.description || "");
  const [imageUrl, setImageUrl] = useState(device?.image_url || "");
  const [color, setColor] = useState(device?.color || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditing = !!device;

  // Funzione per aggiornare il dispositivo in tutti i tavoli dove è presente
  const updateDeviceInAllTables = async (oldDevice: Device, updatedData: any) => {
    try {
      // Recupera tutti i tavoli che contengono questo dispositivo
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('id, devices')
        .neq('devices', '[]');

      if (tablesError) throw tablesError;

      for (const table of tables || []) {
        const devices = Array.isArray(table.devices) ? table.devices : [];
        let hasChanges = false;
        
        // Aggiorna i dispositivi che corrispondono al deviceId modificato
        const updatedDevices = devices.map((tableDevice: any) => {
          if (tableDevice.deviceId === oldDevice.id) {
            hasChanges = true;
            return {
              ...tableDevice,
              name: updatedData.name,
              type: updatedData.category,
              color: updatedData.color || tableDevice.color
            };
          }
          return tableDevice;
        });

        // Salva solo se ci sono stati cambiamenti
        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('tables')
            .update({ devices: updatedDevices })
            .eq('id', table.id);

          if (updateError) {
            console.error(`Error updating table ${table.id}:`, updateError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating device in tables:', error);
    }
  };

  // Funzione per refreshare i cartelli prezzo automatici
  const refreshAutomaticPriceTagsForDevice = async (oldDevice: Device, updatedData: any) => {
    // Solo per iPhone e Watch che hanno cartelli automatici
    if (updatedData.category !== 'iPhone' && updatedData.category !== 'Watch') {
      return;
    }

    try {
      // Recupera tutti i tavoli che contengono questo dispositivo
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('id, price_tags, devices')
        .neq('devices', '[]');

      if (tablesError) throw tablesError;

      for (const table of tables || []) {
        const devices = Array.isArray(table.devices) ? table.devices : [];
        const priceTags = Array.isArray(table.price_tags) ? table.price_tags : [];
        
        // Verifica se questo tavolo contiene il dispositivo modificato
        const hasDevice = devices.some((tableDevice: any) => tableDevice.deviceId === oldDevice.id);
        
        if (hasDevice) {
          let hasChanges = false;
          
          // Aggiorna i cartelli prezzo automatici che corrispondono al vecchio nome
          const updatedPriceTags = priceTags.map((tag: any) => {
            if (tag.isAutomatic && tag.name === oldDevice.name) {
              hasChanges = true;
              return {
                ...tag,
                name: updatedData.name
              };
            }
            return tag;
          });

          // Salva solo se ci sono stati cambiamenti
          if (hasChanges) {
            const { error: updateError } = await supabase
              .from('tables')
              .update({ price_tags: updatedPriceTags })
              .eq('id', table.id);

            if (updateError) {
              console.error(`Error updating price tags for table ${table.id}:`, updateError);
            }
          }
        }
      }

      // Aggiorna anche le associazioni nella tabella dedicata
      const { error: associationsError } = await supabase
        .from('price_tag_device_associations')
        .update({ price_tag_name: updatedData.name })
        .eq('price_tag_name', oldDevice.name);

      if (associationsError) {
        console.error('Error updating price tag associations:', associationsError);
      }
    } catch (error) {
      console.error('Error refreshing automatic price tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !category) {
      toast.error("Nome e categoria sono obbligatori");
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditing) {
        const updatedData = {
          name: name.trim(),
          category,
          model: model.trim() || null,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          color: color.trim() || null,
        };

        const { error } = await supabase
          .from("devices")
          .update(updatedData)
          .eq('id', device.id);

        if (error) throw error;

        // Aggiorna il dispositivo in tutti i tavoli dove è presente
        await updateDeviceInAllTables(device, updatedData);
        
        // Refresha i cartelli prezzo automatici se necessario
        await refreshAutomaticPriceTagsForDevice(device, updatedData);
        
        toast.success("Dispositivo modificato e sincronizzato su tutti i tavoli");
      } else {
        const { error } = await supabase
          .from("devices")
          .insert({
            name: name.trim(),
            category,
            model: model.trim() || null,
            description: description.trim() || null,
            image_url: imageUrl.trim() || null,
            color: color.trim() || null,
          });

        if (error) throw error;
        toast.success("Dispositivo creato con successo");
      }

      if (!isEditing) {
        setName("");
        setCategory("");
        setModel("");
        setDescription("");
        setImageUrl("");
        setColor("");
      }
      setOpen(false);
      onDeviceCreated();
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} device:`, error);
      toast.error(`Errore nella ${isEditing ? 'modifica' : 'creazione'} del dispositivo`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Dispositivo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifica Dispositivo' : 'Crea Nuovo Dispositivo'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. iPhone 15 Pro"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={(value: DeviceCategory) => setCategory(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iPhone">iPhone</SelectItem>
                <SelectItem value="iPad">iPad</SelectItem>
                <SelectItem value="Mac">Mac</SelectItem>
                <SelectItem value="Watch">Watch</SelectItem>
                <SelectItem value="Accessori">Accessori</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="model">Modello (opzionale)</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="es. 15 Pro, Air M2, Series 9"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrizione (opzionale)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione del dispositivo"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="imageUrl">URL Immagine (opzionale)</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div>
            <Label htmlFor="color">Colore (opzionale)</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="es. Nero, Bianco, Rosa"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (isEditing ? "Modifica..." : "Creazione...") 
                : (isEditing ? "Modifica Dispositivo" : "Crea Dispositivo")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}