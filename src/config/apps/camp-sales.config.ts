import { PodioAppDefinition } from '../podio-apps.config';

export const campSalesApp: PodioAppDefinition = {
  name: 'Camp Sales',
  slug: 'camp-sales',
  monitoredFields: [],
  monitoredFieldLabels: [
    'Sale Title',
    'Location 1',
    'Group 1 Dates',
    'Registration Close Date',
    'Signup Deadline',
    'School',
    'Primary Contact',
    'Payments Managed By',
    'Total Expected Students',
    'Executive body',
  ],
  labelContainsTriggers: ['Create Basecamp Event'],
  eventCreationTriggerField: 'create-on-basecamp',
  eventCreationTriggerValue: 'yes',
};
