import { CredentialsService } from './CredentialsService';
import { ServiceNowIncident } from '../types/ServiceNowIncident';
import { ServiceNowCredentials } from '../types/ServiceNowCredentials';
import { DynatraceProblem } from '../types/DynatraceProblem';
import { DynatraceEvents } from '../types/DynatraceEvents';
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
      ServiceNowService.authToken = base64encode(`${ServiceNowService.credentials.user}:${ServiceNowService.credentials.token}`);
      ServiceNowService.url = `https://${ServiceNowService.credentials.tenant}.service-now.com/api/now/v1/table/incident`;
      console.log(`ServiceNowService.url = ${ServiceNowService.url}`);
    }
    return ServiceNowService.instance;
  }

  async createIncident(problem : DynatraceProblem, problemDetails : DynatraceEvents) : Promise<boolean> {
    console.log(`[ServiceNowService] creating incident in ServiceNow`);

    if (problemDetails.events !== undefined) {

      const remediationProvider = await this.getRemedationProvider(problemDetails.events[0]);
      if (remediationProvider != null && remediationProvider.includes('service-now')) {
      console.log(`remediationProvider is ServiceNow`);

      // create headers & payload
      const headers = {
        'Content-Type': `application/json`,
        Authorization: `Basic ${ServiceNowService.authToken}`,
      };
      const incident : ServiceNowIncident = {
        problem_id: problem.ProblemID,
        short_description: `${problem.ProblemTitle} PID: ${problem.ProblemID}`,
        x_320273_keptn_dem_remediation_url: problemDetails.events[0].customProperties.RemediationUrl,
        description: problem.ImpactedEntity,
        category: 'software',
        comments: 'incident created by keptn',
        assigned_to: problemDetails.events[0].customProperties.Approver,
      };
      try {
        console.log(`incident: ${JSON.stringify(incident)}`);
        const response = await axios.post(ServiceNowService.url, incident, {headers: headers});
        console.log(response);
        const snowSysId = response.data.result.sys_id;
        console.log(`ServiceNow sys_id of created incident: ${snowSysId}`);
        const comment = `Incident in ServiceNow created. [incident_id:${snowSysId}]. Incident has been assigned to: ${problemDetails.events[0].customProperties.Approver}`;
        this.commentOnProblem(problem.PID, comment);

      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      console.log('no remediation provider found.');
      return false;
    }
      return true;
    } else {
      return false;
    }
  }

  async commentOnProblem(problemId : string, comment : string) : Promise<boolean> {
    const credService: CredentialsService = CredentialsService.getInstance();
    const dynatraceCredentials : DynatraceCredentials = await credService.getDynatraceCredentials();

    const commentUrl = `https://${dynatraceCredentials.tenant}.live.dynatrace.com/api/v1/problem/details/${problemId}/comments?Api-Token=${dynatraceCredentials.token}`;
    const messageBody = {
      comment: comment,
      user: 'keptn',
      context: 'keptn - ServiceNow service',
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
    if (problemDetails !== undefined && problemDetails.customProperties !== undefined && problemDetails.customProperties.RemediationProvider !== undefined) {
      return problemDetails.customProperties.RemediationProvider;
    }
    return null;
  }

  async updateIncident(problem : DynatraceProblem, problemDetails : DynatraceEvents) : Promise<boolean> {
    console.log(`updateIncident`);

    const remediationProvider = await this.getRemedationProvider(problemDetails.events[0]);
    if (remediationProvider != null && remediationProvider.includes('service-now')) {
      const comments = await this.getCommentsOnProblem(problem.PID);
      let snowSysid = null;
      for (const comment of comments.data.comments) {
        console.log(comment.content);
        if (comment.context.includes('ServiceNow') && comment.content.includes('incident_id')) {
          if (snowSysid === null) {
            snowSysid = comment.content.substring(comment.content.indexOf('incident_id:') + 12, comment.content.indexOf(']'));
          }
        }
      }
      // update incident in servicenow
      if (snowSysid !== null) {
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
          const response = await axios.put(`${ServiceNowService.url}/${snowSysid}`, incident, {headers: headers});
          console.log(response);
          console.log(`ServiceNow sys_id of updated incident: ${snowSysid}`);
          const comment = `Incident in ServiceNow resolved. [incident_id:${snowSysid}]`;
          this.commentOnProblem(problem.PID, comment);
          return true;
        } catch (error) {
          console.log(error);
          return false;
        }
      }
    }
    return false;
  }

  async getDynatraceDetails(problem : DynatraceProblem) : Promise<DynatraceEvents> {
    const credService: CredentialsService = CredentialsService.getInstance();
    const dynatraceCredentials : DynatraceCredentials = await credService.getDynatraceCredentials();

    console.log(`dt credentials: ${dynatraceCredentials.tenant} / ${dynatraceCredentials.token}`);

    let problemDetails : DynatraceEvents = null;

    if (problem.ProblemDetails !== undefined && problem.ProblemDetails.rankedEvents !== undefined && problem.ProblemDetails.rankedEvents.length > 0) {
      const entityId = problem.ProblemDetails.rankedEvents[0].entityId;
      console.log(`entityId: ${entityId}`);

      const relativeTime = '2hours';
      const eventsUrl = `https://${dynatraceCredentials.tenant}.live.dynatrace.com/api/v1/events?entityId=${entityId}&relativeTime=${relativeTime}&eventType=CUSTOM_CONFIGURATION&Api-Token=${dynatraceCredentials.token}`;
      console.log(`url: ${eventsUrl}`);
      try {
        const response = await axios.get(eventsUrl);
        problemDetails = response.data;
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log(`no problem details provided`);
    }

    return problemDetails;
  }

}
