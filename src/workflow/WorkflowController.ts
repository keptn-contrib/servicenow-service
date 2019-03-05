import * as express from 'express';
import { inject, injectable } from 'inversify';
import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  httpDelete,
} from 'inversify-express-utils';
import {
  ApiOperationGet,
  ApiOperationPost,
  ApiPath,
  SwaggerDefinitionConstant,
  ApiOperationDelete,
} from 'swagger-express-ts';
import axios from 'axios';

import { MessageService } from '../svc/MessageService';
import { ServiceNowCredentials } from '../lib/types/ServiceNowCredentials';
import { CredentialsService } from '../svc/CredentialsService';
import { base64encode } from 'nodejs-base64';
import { ServiceNowIncident } from '../lib/types/ServiceNowIncident';

@ApiPath({
  name: 'Workflow',
  path: '/workflow',
  security: { apiKeyHeader: [] },
})
@controller('/workflow')
export class WorkflowController implements interfaces.Controller {

  @inject('MessageService') private readonly messageService: MessageService;

  constructor() { }

  @ApiOperationPost({
    description: 'Trigger a workflow',
    parameters: {
      body: {
        description: 'Workflow information',
        model: 'WorkflowRequestModel',
        required: true,
      },
    },
    responses: {
      200: {
      },
      400: { description: 'Parameters fail' },
    },
    summary: 'Trigger a ServiceNow workflow',
  })
  @httpPost('/')
  public async triggerWorkflow(
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ): Promise<void> {
    let result = {
      result: 'request for triggering the workflow sent to ServiceNow',
    };

    const credService: CredentialsService = CredentialsService.getInstance();
    const serviceNowCreds: ServiceNowCredentials = await credService.getServiceNowCredentials();
    // tslint:disable-next-line: max-line-length
    console.log(`servicenow credentials:${serviceNowCreds.tenant}: ${serviceNowCreds.user} / ${serviceNowCreds.token}`);

    const authToken = base64encode(`${serviceNowCreds.user}:${serviceNowCreds.token}`);
    // tslint:disable-next-line: max-line-length
    const serviceNowUrl = `https://${serviceNowCreds.tenant}.service-now.com/api/now/v1/table/incident`;
    const headers = {
      'Content-Type': `application/json`,
      Authorization: `Basic ${authToken}`,
    };

    const problemDetails = request.body;
    console.log(`problemPayload: ${JSON.stringify(problemDetails)}`);

    // TODO get latest deployment or configuration event
    // ideas: have a dedicated dynatrace service getting the details?

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

        result = {
          result: 'request for triggering the workflow in ServiceNow FAILED',
        };

        // error handling has to be included here
        try {
          console.log(`incident: ${incident}`);
          const response = await axios.post(serviceNowUrl, incident, {headers: headers});
          console.log(response);
          result = {
            result: 'request for triggering the workflow in ServiceNow succeeded.',
          };
        } catch (error) {
          console.log(error);
          result = {
            result: `request for triggering the workflow in ServiceNow FAILED: ${error}`,
          };
        }

        await this.messageService.sendMessage(incident);

      }
    } else {
      console.log(`no remediation found.`);
      result = {
        result: 'no remediation action found. nothing to do here.',
      };
      response.send(result);
    }

  }

}
