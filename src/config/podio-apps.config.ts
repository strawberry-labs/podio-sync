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
        'registration-end-date',
        'event-dates',
        'teacher',
      ],
      eventCreationTriggerField: 'create-on-basecamp',
      eventCreationTriggerValue: 'yes',
    },
    {
      name: 'Overseas Camp Sales',
      slug: 'overseas-camp-sales',
      appId: process.env.PODIO_APP_OVERSEAS_CAMP_SALES_ID || '',
      appToken: process.env.PODIO_APP_OVERSEAS_CAMP_SALES_TOKEN || '',
      monitoredFields: [
        'registration-end-date',
        'event-dates',
        'teacher',
      ],
      eventCreationTriggerField: 'create-on-basecamp',
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
