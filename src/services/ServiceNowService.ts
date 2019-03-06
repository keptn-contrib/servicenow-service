import { CredentialsService } from './CredentialsService';

import { ServiceNowIncident } from '../types/ServiceNowIncident';
import { ServiceNowCredentials } from '../types/ServiceNowCredentials';

import { base64decode, base64encode } from 'nodejs-base64';
//import { v4 as uuid } from 'uuid';
import { ServiceNowController } from '../controls/ServiceNowController';
import axios from 'axios';
import { CloudEvent } from 'cloudevent';

const decamelize = require('decamelize');
//const Mustache = require('mustache');
const YAML = require('yamljs');

// Util class
//const utils = new Utils();


export class ServiceNowService {
  private static instance : ServiceNowService;

  public static authToken;
  public static url;

  private constructor() {  }

  static async getInstance() {
    if (ServiceNowService.instance === undefined) {
      ServiceNowService.instance = new ServiceNowService();

      // initialize
      const credService: CredentialsService = CredentialsService.getInstance();
      const serviceNowCreds: ServiceNowCredentials = await credService.getServiceNowCredentials();
      // tslint:disable-next-line: max-line-length
      console.log(`servicenow credentials:${serviceNowCreds.tenant}: ${serviceNowCreds.user} / ${serviceNowCreds.token}`);

      ServiceNowService.authToken = base64encode(`${serviceNowCreds.user}:${serviceNowCreds.token}`);
      ServiceNowService.url = `https://${serviceNowCreds.tenant}.service-now.com/api/now/v1/table/incident`;

      return ServiceNowService.instance;
    }
  }

  async createIncident(incident : CloudEvent) : Promise<boolean> {
    console.log(`[ServiceNowService] creating incident in ServiceNow`);

    const headers = {
      'Content-Type': `application/json`,
      Authorization: `Basic ${ServiceNowService.authToken}`,
    };

    const problemDetails = incident;
    console.log(`problemPayload: ${JSON.stringify(problemDetails)}`);

    if (problemDetails && problemDetails.RemediationAction !== undefined) {
      if (problemDetails.RemediationAction.includes('service-now.com')) {
        console.log(`remediation for ServiceNow found: ${problemDetails.RemediationAction}`);
        const incident : ServiceNowIncident = {
          problem_id: problemDetails.ProblemID,
          short_description: problemDetails.ProblemTitle,
          description: problemDetails.ImpactedEntity,
          category: 'software',
          comments: 'incident created by keptn',
          assigned_to: 'luke.wilson@example.com',
        };

        // error handling has to be included here
        try {
          console.log(`incident: ${incident}`);
          const response = await axios.post(ServiceNowService.url, incident, {headers: headers});
          console.log(response);

        } catch (error) {
          console.log(error);

        }

        //await this.messageService.sendMessage(incident);

      }
    } else {
      console.log(`no remediation found.`);
      //return false;
    }

    return true;
  }



 

  }