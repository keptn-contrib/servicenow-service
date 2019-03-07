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
import { CloudEvent } from 'cloudevent';

import { ServiceNowCredentials } from '../types/ServiceNowCredentials';
import { CredentialsService } from '../services/CredentialsService';
import { base64encode } from 'nodejs-base64';
import { ServiceNowIncident } from '../types/ServiceNowIncident';
import { ServiceNowService } from '../services/ServiceNowService';

@ApiPath({
  name: 'ServiceNow Controller',
  path: '/',
  security: { apiKeyHeader: [] },
})
@controller('/')
export class ServiceNowController implements interfaces.Controller {

  constructor() { }

  @ApiOperationPost({
    description: 'Handle channel events',
    parameters: {
      body: {
        description: 'Handle channel events',
        model: '',
        required: true,
      },
    },
    responses: {
      200: {
      },
      400: { description: 'Parameters fail' },
    },
    summary: 'Handle channel events',
  })
  @httpPost('/')
  public async handleEvent(
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ): Promise<void> {
    console.log(`handleEvent()`);

    let result = {
      result: 'success',
    };

    const cloudEvent : CloudEvent = request.body;
    console.log(`[ServiceNowController]: event is of type '${cloudEvent.type}'`);

    if (request.body.type === 'sh.keptn.events.problem') {
      console.log(`[ServiceNowController]: passing problem event on to [ServiceNowService]`);

      // const incident : CloudEvent = request.body;
      // console.log(`cloudevent: ${JSON.stringify(cloudEvent)}`);

      const serviceNowSvc : ServiceNowService = await ServiceNowService.getInstance();
      if (cloudEvent.data.State === 'OPEN') {
        const incidentCreated = await serviceNowSvc.createIncident(cloudEvent);
        if (incidentCreated) {
          result = {
            result: 'incident created',
          };
        } else {
          result = {
            result: 'no incident created',
          };
        }
      } else if (cloudEvent.data.State === 'RESOLVED') {
        const incidentUpdated = await serviceNowSvc.updateIncident(cloudEvent);

      }
    }

    response.send(result);

  }

}
