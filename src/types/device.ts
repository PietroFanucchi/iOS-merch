export type DeviceCategory = 'Accessori' | 'iPhone' | 'Watch' | 'Mac' | 'iPad';

export interface Device {
  id: string;
  name: string;
  category: DeviceCategory;
  model?: string;
  description?: string;
  image_url?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDeviceData {
  name: string;
  category: DeviceCategory;
  model?: string;
  description?: string;
  image_url?: string;
  color?: string;
}