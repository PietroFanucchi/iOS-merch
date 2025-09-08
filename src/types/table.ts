export type TableType = 'singolo' | 'doppio_back_to_back' | 'doppio_free_standing' | 'test';

export interface Table {
  id: string;
  name: string;
  table_type: TableType;
  devices: any[];
  created_at: string;
  updated_at: string;
  image_url?: string;
  slots?: any[];
}

export interface CreateTableData {
  name: string;
  table_type: TableType;
}