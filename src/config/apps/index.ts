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
import { staffObservationsApp } from './staff-observations.config';
import { teachersFeedbackApp } from './teachers-feedback.config';
import { assessmentLogsApp } from './assessment-logs.config';
import { vehicleRequestFormApp } from './vehicle-request-form.config';
import { trafficFinesApp } from './traffic-fines.config';
import { vehicleSignOutStartApp } from './vehicle-sign-out-start.config';
import { dmDailyLogApp } from './dm-daily-log.config';
import { holidayRequestApp } from './holiday-request.config';
import { contactsApp } from './contacts.config';
import { ajAssessmentsApp } from './aj-assessments.config';
import { ajInstructorReportSheetsApp } from './aj-instructor-report-sheets.config';

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
  staffObservationsApp,
  teachersFeedbackApp,
  assessmentLogsApp,
  vehicleRequestFormApp,
  trafficFinesApp,
  vehicleSignOutStartApp,
  dmDailyLogApp,
  holidayRequestApp,
  contactsApp,
  ajAssessmentsApp,
  ajInstructorReportSheetsApp,
];
