import { interfaces } from 'inversify-express-utils';

export interface ServiceNowIncident {
  problem_id: number;
  short_description: string;

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
}
