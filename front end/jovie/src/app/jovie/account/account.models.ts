import { Governorate } from '../store/store.models';

/** CustomerResource (GET /api/v1/customer/me). */
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  locale: 'en' | 'ar';
  email_verified: boolean;
  created_at: string | null;
}

/** CustomerAddressResource. */
export interface CustomerAddress {
  id: number;
  label: string | null;
  recipient_name: string;
  phone: string;
  governorate_id: number;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  postal_code: string | null;
  is_default: boolean;
  governorate: Governorate;
}

/** What the address form sends (AddressRequest). Empty optional fields are sent as null. */
export interface AddressInput {
  label: string | null;
  recipient_name: string;
  phone: string;
  governorate_id: number;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  postal_code: string | null;
  is_default?: boolean;
}

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}
