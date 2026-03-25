import { PodioAppDefinition } from '../podio-apps.config';

export const opportunitiesApp: PodioAppDefinition = {
  name: 'Opportunities',
  slug: 'opportunities',
  monitoredFields: ['status', 'trip-type'],
};
