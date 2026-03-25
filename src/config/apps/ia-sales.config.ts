import { PodioAppDefinition } from '../podio-apps.config';

export const iaSalesApp: PodioAppDefinition = {
  name: 'IA Sales',
  slug: 'ia-sales',
  monitoredFields: [
    // Event dates
    'group-1-practice-date',
    'group-1-qualifier-date',
    'group-2-qualifier-date',
    // Registration & payment deadlines
    'signup-deadline',
    'balance-deadline-if-inbound-trip',
    // School & contacts
    'school',
    'primary-contacts',
    'secondary-contacts',
    // Payment & executive body
    'parents-payments',
    'executive-body',
    // Taaleem redirect fields
    'camps-taaleem-redirect-link-aj',
    'camps-taaleem-redirect-description-aj',
    'camps-taaleem-redirect-code-aj',
    // Ticket quantity
    'group-1-max-numbers',
    'group-2-max-numbers',
    // Ticket price (deposit)
    'deposit-amount-if-inbound',
  ],
  labelContainsTriggers: ['Create Basecamp Event'],
  eventCreationTriggerField: 'create-basecamp-event',
  eventCreationTriggerValue: 'yes',
};
