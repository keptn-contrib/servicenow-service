import { CredentialsService } from './CredentialsService';
import { ServiceNowIncident } from '../types/ServiceNowIncident';
import { ServiceNowCredentials } from '../types/ServiceNowCredentials';
import { base64decode, base64encode } from 'nodejs-base64';
import axios from 'axios';
import { CloudEvent } from 'cloudevent';
import { DynatraceCredentials } from '../types/DynatraceCredentials';

export class ServiceNowService {
  private static instance : ServiceNowService;

  public static authToken : string;
  public static url : string;
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
        const snow_sysid = response.data.result.sys_id;
        console.log(`ServiceNow sys_id of created incident: ${snow_sysid}`);
        const comment = `Incident in ServiceNow created. [incident_id:${snow_sysid}]`;
        this.commentOnProblem(problem.data.PID, comment);

      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      return false;
    }
    return true;
  }

  async commentOnProblem(problemId : string, comment : string) : Promise<boolean> {
    const credService: CredentialsService = CredentialsService.getInstance();
    const dynatraceCredentials : DynatraceCredentials = await credService.getDynatraceCredentials();

    const commentUrl = `https://${dynatraceCredentials.tenant}.live.dynatrace.com/api/v1/problem/details/${problemId}/comments?Api-Token=${dynatraceCredentials.token}`;
    const messageBody = {
      'comment': comment,
      'user': 'keptn',
      'context': 'keptn - ServiceNow service',
    };
    try {
      const response = await axios.post(commentUrl, messageBody);
      console.log(response);
    } catch (error) {
      console.log(error);
      return false;
    }
    return true;
  }

  async getCommentsOnProblem(problemId : string) : Promise<any> {
    const credService: CredentialsService = CredentialsService.getInstance();
    const dynatraceCredentials : DynatraceCredentials = await credService.getDynatraceCredentials();

    const commentUrl = `https://${dynatraceCredentials.tenant}.live.dynatrace.com/api/v1/problem/details/${problemId}/comments?Api-Token=${dynatraceCredentials.token}`;
    let response = {};
    try {
      response = await axios.get(commentUrl);
      console.log(response);
    } catch (error) {
      console.log(error);
      return false;
    }
    return response;
  }

  async getRemedationProvider(problemDetails) : Promise<string> {
    if (problemDetails.customProperties !== undefined && problemDetails.customProperties.RemediationProvider !== undefined) {
      return problemDetails.customProperties.RemediationProvider;
    }
    return null;
  }

  async updateIncident(problem : CloudEvent) : Promise<boolean> {
    console.log(`updateIncident`);

    let incidentUpdated = false;

    const problemDetails = await this.getDynatraceDetails(problem);

    // console.log(`problemDetails: ${JSON.stringify(problemDetails)}`);

    const remediationProvider = await this.getRemedationProvider(problemDetails.events[0]);
    if (remediationProvider != null && remediationProvider.includes('service-now')) {
      let comments = await this.getCommentsOnProblem(problem.data.PID);
      let snow_sysid = null;
      for (let c of comments.data.comments) {
        console.log(c.content);
        if (c.context.includes('ServiceNow') && c.content.includes('incident_id')) {
          if (snow_sysid === null)
            snow_sysid = c.content.substring(c.content.indexOf('incident_id:')+12, c.content.length-1);
        }
      }
      // update incident in servicenow
      if (snow_sysid !== null) {
        const headers = {
          'Content-Type': `application/json`,
          Authorization: `Basic ${ServiceNowService.authToken}`,
        };
        const incident : ServiceNowIncident = {
          incident_state: '6', // 6 = resolved, 7 = closed
          close_code: 'Solved Remotely (Permanently)',
          close_notes: 'Dynatrace problem closed, therefore incident is resolved',
        };
        try {
          console.log(`incident: ${JSON.stringify(incident)}`);
          const response = await axios.put(`${ServiceNowService.url}/${snow_sysid}`, incident, {headers: headers});
          console.log(response);
          console.log(`ServiceNow sys_id of updated incident: ${snow_sysid}`);
          const comment = `Incident in ServiceNow resolved. [incident_id:${snow_sysid}]`;
          this.commentOnProblem(problem.data.PID, comment);
  
        } catch (error) {
          console.log(error);
          return false;
        }
      }
    }
    return incidentUpdated;
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
