import { interfaces } from 'inversify-express-utils';

export interface ServiceNowIncident {
  problem_id?: string;
  short_description?: string;

  number?: number;
  state?: string;
  impact?: string;
  priority?: number;
  urgency?: number;
  category?: string;
  subcategory?: string;
  description?: string;
  comments?: string;
  assigned_to?: string;
  incident_state? : string;
  close_code? : string;
  close_notes? : string;
}
