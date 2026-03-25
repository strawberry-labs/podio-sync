import { PodioAppDefinition } from '../podio-apps.config';

export const overseasCampSalesApp: PodioAppDefinition = {
  name: 'Overseas Camp Sales',
  slug: 'overseas-camp-sales',
  monitoredFields: [
    // Event dates (groups 1-3)
    'group-1-dates',
    'group-2-dates',
    'group-3-dates',
    // Registration & payment deadlines
    'signup-deadline',
    'final-payment-deadline',
    // School & contacts
    'school',
    'primary-contact',
    'secondary-contact',
    // Payment & executive body
    'parents-payments',
    'executive-body',
    // Expected attendees
    'number',
    // Taaleem redirect fields
    'camps-taaleem-redirect-link-intl',
    'camps-taaleem-redirect-description-intl',
    'camps-taaleem-redirect-code-intl',
    // Ticket quantity (max numbers per group)
    'group-1-max-numbers-2',
    'group-2-max-numbers-2',
    'group-3-max-numbers',
    // Ticket price (deposit) - note: typo in Podio field name
    'deposit-amout',
  ],
  labelContainsTriggers: ['Create Basecamp Event'],
  eventCreationTriggerField: 'create-basecamp-event-intl',
  eventCreationTriggerValue: 'yes',
};
