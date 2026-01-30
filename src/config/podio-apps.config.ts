export interface PodioAppConfig {
  name: string;
  slug: string; // URL-friendly name for webhook route
  appId: string;
  appToken: string;
  // Fields to monitor for changes - when these change, trigger basecamp sync
  monitoredFields: string[];
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
      monitoredFields: [
        'registration-end-date',
        'event-dates',
        'teacher',
        'additional-school-charge',
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
