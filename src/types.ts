export interface Employee {
  per_no: string;
  gid: string;
  first_name: string;
  last_name: string;
  cost_center: string;
  department: string;
  email: string;
  assigned_date: string;
  counter_no: number;
}

export interface TimeSlot {
  slot_id: number;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  curr_bookings: number;
}

export interface Booking {
  per_no: string;
  slot_id: number;
  first_name?: string;
  last_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
}
