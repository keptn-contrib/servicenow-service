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
import { ServiceNowService } from '../services/ServiceNowService';
import { DynatraceProblem } from '../types/DynatraceProblem';
import { Utils } from '../lib/Utils';

const utils = new Utils();

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

    let result = {
      result: 'success',
    };

    let keptnContext = null;
    if (request.body !== undefined && request.body.shkeptncontext !== undefined) {
      keptnContext = request.body.shkeptncontext;
    }

    utils.logMessage(keptnContext,
                     `[ServiceNowController]: event is of type '${request.body.type}'`);

    if (request.body !== undefined && request.body.type === 'sh.keptn.events.problem') {
      const dtproblem : DynatraceProblem = request.body.data;
      utils.logMessage(keptnContext,
                       `[ServiceNowController]: passing problem event on to [ServiceNowService]`);

      const serviceNowSvc : ServiceNowService = await ServiceNowService.getInstance();
      if (dtproblem.State === 'OPEN') {
        const problemDetails = await serviceNowSvc.getDynatraceDetails(dtproblem, keptnContext);
        let incidentCreated = false;
        if (problemDetails !== undefined) {
          incidentCreated = await serviceNowSvc.createIncident(dtproblem,
                                                               problemDetails,
                                                               keptnContext);
        }
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
        const problemDetails = await serviceNowSvc.getDynatraceDetails(dtproblem, keptnContext);
        const incidentUpdated = await serviceNowSvc.updateIncident(dtproblem,
                                                                   problemDetails,
                                                                   keptnContext);
        if (incidentUpdated) {
          result = {
            result: 'incident updated',
          };
        } else {
          result = {
            result: 'incident not updated',
          };
        }
      }
    }

    response.send(result);

  }

}
