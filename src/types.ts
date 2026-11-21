export interface Printer {
  id: string;
  serial_number: string;
  model: string;
  customer: string;
  location: string;
  installation_counter: number;
  created_at: string;
}

export interface PrinterOverview extends Printer {
  last_visit: string | null;
  last_counter: number;
  visits: number;
}

export interface PartReplacement {
  id: string;
  part_code: string;
  description: string;
  quantity: number;
}

export interface Maintenance {
  id: string;
  printer_id: string;
  maintenance_date: string;
  counter: number;
  technician: string;
  summary: string;
  part_replacements: PartReplacement[];
}

export interface PartLife {
  printer_id: string;
  serial_number: string;
  model: string;
  customer: string;
  part_code: string;
  description: string;
  replaced_on: string;
  replaced_at_counter: number;
  current_counter: number;
  last_visit: string;
  pages_since_replacement: number;
}
