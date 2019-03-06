// import 'reflect-metadata';
import * as express from 'express';
import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import { cleanUpMetadata } from 'inversify-express-utils';
import { ServiceNowController } from './ServiceNowController';
const nock = require('nock');

describe('authenticator', () => {
  let request: express.Request;
  let response: express.Response;
  let next: express.NextFunction;

  beforeEach(() => {
    cleanUpMetadata();
    request = {} as express.Request;
    response = {} as express.Response;
    next = {} as express.NextFunction;
  });
  it('should call next() if authentication was successful', async () => {
    console.log('test started');
    // WorkflowController.
  });

});
