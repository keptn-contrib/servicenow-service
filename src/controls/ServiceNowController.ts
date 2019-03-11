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
const { CloudEvent, CloudEventValidator: V, CloudEventTransformer: T } = require('cloudevent');

import { ServiceNowCredentials } from '../types/ServiceNowCredentials';
import { CredentialsService } from '../services/CredentialsService';
import { base64encode } from 'nodejs-base64';
import { ServiceNowIncident } from '../types/ServiceNowIncident';
import { ServiceNowService } from '../services/ServiceNowService';
// import { CloudEvent } from 'cloudevent';

@ApiPath({
  name: 'ServiceNow Controller',
  path: '/',
  security: { apiKeyHeader: [] },
})
@controller('/')
export class ServiceNowController implements interfaces.Controller {

  constructor() { }

  @ApiOperationPost({
    description: 'dispatches problem events to ServiceNow',
    parameters: {
      body: {
        description: 'cloud event with problem description in data block',
        model: 'CloudEvent',
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

    const dtproblem : DynatraceProblem = request.body.data;

    console.log(`[ServiceNowController]: event is of type '${request.body.type}'`);

    if (request.body.type === 'sh.keptn.events.problem') {
      console.log(`[ServiceNowController]: passing problem event on to [ServiceNowService]`);

      const serviceNowSvc : ServiceNowService = await ServiceNowService.getInstance();
      if (dtproblem.State === 'OPEN') {
        const incidentCreated = await serviceNowSvc.createIncident(dtproblem);
        if (incidentCreated) {
          result = {
            result: 'incident created',
          };
        } else {
          result = {
            result: 'no incident created',
          };
        }
      } else if (dtproblem.State === 'RESOLVED') {
        const incidentUpdated = await serviceNowSvc.updateIncident(dtproblem);

      }
    }

    response.send(result);

  }

}
