export interface Store {
  id: string;
  name: string;
  category: 'White' | 'Tier2';
  chain: 'MediaWorld' | 'Comet' | 'Euronics' | 'Unieuro';
  location: string;
  tableIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  devices: Device[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  type: 'iPhone' | 'iPad' | 'Mac' | 'Apple Watch' | 'AirPods' | 'Apple TV' | 'Accessories';
  quantity: number;
  position?: string;
}

export interface StoreStats {
  totalStores: number;
  whiteStores: number;
  tier2Stores: number;
  totalTables: number;
  chainDistribution: Record<Store['chain'], number>;
}