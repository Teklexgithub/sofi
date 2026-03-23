// Matches CATEGORY_CHOICES in Django
export type CategoryType = 'KHAT' | 'DRINK' | 'WATER' | 'NUTS' | 'CIGARETTE';

// Add this interface
export interface Vendor {
  id: string; // UUID
  name: string;
  contact_person?: string;
}

export interface Product {
  id: string; 
  name: string;
  category: CategoryType;
  category_display: string; 
  vendor?: string; // This holds the ID for foreign key selection
  vendor_name?: string; // For display in tables
  pieces_per_pack: number;
  buying_price_per_piece: string; 
  selling_price_per_piece: string;
}


export interface StoreStock {
  id: string;
  branch: string;
  product: string;
  product_name: string; // From our serializer
  quantity_in_packs: number;
}

export interface ShopStock {
  id: string;
  branch: string;
  product: string;
  product_name: string; // From our serializer
  quantity_in_pieces: number;
}

export interface InternalTransfer {
  id: string;
  branch: string;
  product: string;
  packs_moved: number;
  pieces_created: number;
  timestamp: string;
  performed_by: string;
}