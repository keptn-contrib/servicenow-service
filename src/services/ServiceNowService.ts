import { CredentialsService } from './CredentialsService';

import { ServiceNowIncident } from '../types/ServiceNowIncident';
import { ServiceNowCredentials } from '../types/ServiceNowCredentials';

import { base64decode, base64encode } from 'nodejs-base64';
import { ServiceNowController } from '../controls/ServiceNowController';
import axios from 'axios';
import { CloudEvent } from 'cloudevent';
import { DynatraceCredentials } from '../types/DynatraceCredentials';

const decamelize = require('decamelize');
const YAML = require('yamljs');

export class ServiceNowService {
  private static instance : ServiceNowService;

  public static authToken;
  public static url;
  public static credentials : ServiceNowCredentials;

  private constructor() {  }

  static async getInstance() {
    if (ServiceNowService.instance === undefined) {
      ServiceNowService.instance = new ServiceNowService();

      // initialize
      const credService: CredentialsService = CredentialsService.getInstance();
      ServiceNowService.credentials = await credService.getServiceNowCredentials();
      // tslint:disable max-line-length
      console.log(`servicenow credentials: ${ServiceNowService.credentials.tenant}: ${ServiceNowService.credentials.user} / ${ServiceNowService.credentials.token}`);

      ServiceNowService.authToken = base64encode(`${ServiceNowService.credentials.user}:${ServiceNowService.credentials.token}`);
      ServiceNowService.url = `https://${ServiceNowService.credentials.tenant}.service-now.com/api/now/v1/table/incident`;
    }
    return ServiceNowService.instance;
  }

  async createIncident(problem : CloudEvent) : Promise<boolean> {
    console.log(`[ServiceNowService] creating incident in ServiceNow`);

    const problemDetails = await this.getDynatraceDetails(problem);

    console.log(`problemDetails: ${JSON.stringify(problemDetails)}`);

    const remediationProvider = await this.getRemedationProvider(problemDetails.events[0]);
    if (remediationProvider != null && remediationProvider.includes('service-now')) {
      console.log(`remediationProvider is ServiceNow`);

      // create headers & payload
      const headers = {
        'Content-Type': `application/json`,
        Authorization: `Basic ${ServiceNowService.authToken}`,
      };
      const incident : ServiceNowIncident = {
        problem_id: problem.data.ProblemID,
        short_description: `${problem.data.ProblemTitle} PID: ${problem.data.ProblemID}`,
        description: problem.data.ImpactedEntity,
        category: 'software',
        comments: 'incident created by keptn',
        assigned_to: problemDetails.events[0].customProperties.Approver,
      };
      try {
        console.log(`incident: ${JSON.stringify(incident)}`);
        const response = await axios.post(ServiceNowService.url, incident, {headers: headers});
        console.log(response);

      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      return false;
    }
    return true;
  }

  async getRemedationProvider(problemDetails) : Promise<string> {
    if (problemDetails.customProperties !== undefined && problemDetails.customProperties.RemediationProvider !== undefined) {
      return problemDetails.customProperties.RemediationProvider;
    }
    return null;
  }

  async getDynatraceDetails(problem : CloudEvent) : Promise<any> {
    const credService: CredentialsService = CredentialsService.getInstance();
    const dynatraceCredentials : DynatraceCredentials = await credService.getDynatraceCredentials();

    console.log(`dt credentials: ${dynatraceCredentials.tenant} / ${dynatraceCredentials.token}`);

    let problemDetails = {};

    if (problem.data.ProblemDetails !== undefined) {
      const entityId = problem.data.ProblemDetails.rankedEvents[0].entityId;
      console.log(`entityId: ${entityId}`);

      const relativeTime = '2hours';
      const getEventsUrl = `https://${dynatraceCredentials.tenant}.live.dynatrace.com/api/v1/events?entityId=${entityId}&relativeTime=${relativeTime}&eventType=CUSTOM_CONFIGURATION&Api-Token=${dynatraceCredentials.token}`;
      const headers = {
        'Content-Type': `application/json`,
        Authorization: `Basic ${ServiceNowService.authToken}`,
      };
      // console.log(`url: ${getEventsUrl}`);
      try {
        const response = await axios.get(getEventsUrl);
        // console.log(`event response:`);
        // console.log(response);

        problemDetails = response.data;

        if (response.data !== undefined && response.data.events !== undefined) {
          const eventDetails = response.data.events[0];
          // console.log(`eventDetails.customProperties.Approver: ${eventDetails.customProperties.Approver}`);
          // console.log(`eventDetails.customProperties.RemediationProvider: ${eventDetails.customProperties.RemediationProvider}`);
        }

      } catch (error) {
        console.log(error);
      }
    } else {
      console.log(`no problem details provided`);
    }

    return problemDetails;
  }

}
