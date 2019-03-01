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
    const result = {
      result: 'request for triggering the workflow sent to ServiceNow',
    };

    const credService: CredentialsService = CredentialsService.getInstance();
    const serviceNowCreds: ServiceNowCredentials = await credService.getServiceNowCredentials();
    //console.log(`servicenow credentials: ${serviceNowCreds.tenant}: ${serviceNowCreds.user} / ${serviceNowCreds.token}`);

    const authToken = base64encode(`${serviceNowCreds.user}:${serviceNowCreds.token}`);
    const serviceNowUrl = `https://${serviceNowCreds.tenant}.service-now.com/api/now/v1/table/incident`; 
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authToken}`,
    };
    const message= '{"short_description":"Test incident creation through keptn", "comments":"These are my comments"}';
    
    axios.post(serviceNowUrl,
      message,
      {headers: headers}).then().catch(() => {});
    await this.messageService.sendMessage(request.body);

    response.send(result);
  }

}
