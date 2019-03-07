import 'reflect-metadata';
import * as express from 'express';
import { expect } from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import { cleanUpMetadata } from 'inversify-express-utils';
import { CredentialsService  } from './CredentialsService';
import { ServiceNowCredentials } from '../types/ServiceNowCredentials';
import { DynatraceCredentials } from '../types/DynatraceCredentials';
const nock = require('nock');

describe('CredentialsService', () => {
  let credService: CredentialsService;

  beforeEach(() => {
    cleanUpMetadata();
    credService = CredentialsService.getInstance();
  });

  it('Should return the ServiceNow credentials from a K8s secret', async () => {
    const snowCreds : ServiceNowCredentials = await credService.getServiceNowCredentials();
    expect(snowCreds.tenant).to.be.a('string');
    expect(snowCreds.user).to.be.a('string');
    expect(snowCreds.token).to.be.a('string');
  }).timeout(5000);

  it('Should return the Dyantrace credentials from a K8s secret', async () => {
    const dtCreds : DynatraceCredentials = await credService.getDynatraceCredentials();
    expect(dtCreds.tenant).to.be.a('string');
    expect(dtCreds.token).to.be.a('string');
  }).timeout(5000);

  // it('Should not create a K8s secret - credentials undefined', async () => {
  //   const newGitCreds : CredentialsModel = undefined;
  //   const updated : boolean = await credService.updateGithubConfig(newGitCreds);
  //   expect(updated).to.be.false;
  // }).timeout(5000);

  // it('Should not create a K8s secret - missing parameter', async () => {
  //   const newGitCreds = new CredentialsModel();
  //   newGitCreds.org = 'keptn-org';
  //   const updated = await credService.updateGithubConfig(newGitCreds);
  //   expect(updated).to.be.false;
  // }).timeout(5000);

  // it('Should create a K8s secret', async () => {
  //   const gitCreds : CredentialsModel = await credService.getGithubCredentials();
  //   const newGitCreds = new CredentialsModel();
  //   newGitCreds.org = 'keptn-org';
  //   newGitCreds.user = 'keptn';
  //   //newGitCreds.token='abc123';
  //   const updated = await credService.updateGithubConfig(newGitCreds);
  //   expect(updated).to.be.false;

  //   if (updated) {
  //     await credService.updateGithubConfig(gitCreds);
  //   }
  // });
});
