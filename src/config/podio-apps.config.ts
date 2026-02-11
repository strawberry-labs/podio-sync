export interface PodioAppConfig {
  name: string;
  slug: string; // URL-friendly name for webhook route
  appId: string;
  appToken: string;
  // Fields to monitor by external_id - when these change, trigger basecamp sync
  monitoredFields: string[];
  // Fields to monitor by label (display name) - case-insensitive match
  monitoredFieldLabels?: string[];
  // If any changed field's label contains one of these strings, trigger sync
  labelContainsTriggers?: string[];
  // Fields that trigger event creation on Basecamp
  eventCreationTriggerField?: string;
  eventCreationTriggerValue?: string;
}

export interface PodioConfig {
  clientId: string;
  clientSecret: string;
  apps: PodioAppConfig[];
}

export const getPodioConfig = (): PodioConfig => ({
  clientId: process.env.PODIO_CLIENT_ID || '',
  clientSecret: process.env.PODIO_CLIENT_SECRET || '',
  apps: [
    {
      name: 'Camp Sales',
      slug: 'camp-sales',
      appId: process.env.PODIO_APP_CAMP_SALES_ID || '',
      appToken: process.env.PODIO_APP_CAMP_SALES_TOKEN || '',
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
      labelContainsTriggers: [
        'Create Basecamp Event',
      ],
      eventCreationTriggerField: 'create-on-basecamp',
      eventCreationTriggerValue: 'yes',
    },
    {
      name: 'IA Sales',
      slug: 'ia-sales',
      appId: process.env.PODIO_APP_IA_SALES_ID || '',
      appToken: process.env.PODIO_APP_IA_SALES_TOKEN || '',
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
      labelContainsTriggers: [
        'Create Basecamp Event',
      ],
      eventCreationTriggerField: 'create-basecamp-event',
      eventCreationTriggerValue: 'yes',
    },
    {
      name: 'Overseas Camp Sales',
      slug: 'overseas-camp-sales',
      appId: process.env.PODIO_APP_OVERSEAS_CAMP_SALES_ID || '',
      appToken: process.env.PODIO_APP_OVERSEAS_CAMP_SALES_TOKEN || '',
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
      labelContainsTriggers: [
        'Create Basecamp Event',
      ],
      eventCreationTriggerField: 'create-basecamp-event-intl',
      eventCreationTriggerValue: 'yes',
    },
    {
      name: 'Schools',
      slug: 'schools',
      appId: process.env.PODIO_APP_SCHOOLS_ID || '',
      appToken: process.env.PODIO_APP_SCHOOLS_TOKEN || '',
      monitoredFields: [],
    },
    {
      name: 'Opportunities',
      slug: 'opportunities',
      appId: process.env.PODIO_APP_OPPORTUNITIES_ID || '',
      appToken: process.env.PODIO_APP_OPPORTUNITIES_TOKEN || '',
      monitoredFields: [
        'status',
        'trip-type',
      ],
    },
  ],
});
