import { PodioAppDefinition } from '../podio-apps.config';
import { campSalesApp } from './camp-sales.config';
import { iaSalesApp } from './ia-sales.config';
import { overseasCampSalesApp } from './overseas-camp-sales.config';
import { schoolsApp } from './schools.config';
import { opportunitiesApp } from './opportunities.config';
import { staffMemberApp } from './staff-member.config';
import { staffApp } from './staff.config';
import { hiringProcessApp } from './hiring-process.config';
import { leadershipKpiFeedbackApp } from './leadership-kpi-feedback.config';

/**
 * All Podio app definitions.
 * To add a new app:
 * 1. Create a new file in this directory (e.g. my-app.config.ts)
 * 2. Import and add it to this array
 * 3. Add env vars: PODIO_APP_MY_APP_ID and PODIO_APP_MY_APP_TOKEN
 */
export const appDefinitions: PodioAppDefinition[] = [
  campSalesApp,
  iaSalesApp,
  overseasCampSalesApp,
  schoolsApp,
  opportunitiesApp,
  staffMemberApp,
  staffApp,
  hiringProcessApp,
  leadershipKpiFeedbackApp,
];
