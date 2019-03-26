import { ServiceNowCredentials } from '../types/ServiceNowCredentials';
import { K8sClientFactory } from '../lib/K8sClientFactory';
import * as K8sApi from 'kubernetes-client';

import { base64encode, base64decode } from 'nodejs-base64';
import { DynatraceCredentials } from '../types/DynatraceCredentials';

export class CredentialsService {

  private static instance: CredentialsService;

  private k8sClient: K8sApi.ApiRoot;
  private constructor() {
    this.k8sClient = new K8sClientFactory().createK8sClient();
  }

  static getInstance() {
    if (CredentialsService.instance === undefined) {
      CredentialsService.instance = new CredentialsService();
    }
    return CredentialsService.instance;
  }

  async getServiceNowCredentials(): Promise<ServiceNowCredentials> {
    const serviceNowCredentials: ServiceNowCredentials = {
      tenant: '',
      user: '',
      token: '',
    };

    const s = await this.k8sClient.api.v1
      .namespaces('keptn').secrets
      .get({ name: 'servicenow', pretty: true, exact: true, export: true });

    if (s.body.items && s.body.items.length > 0) {
      const secretItem = s.body.items.find(item => item.metadata.name === 'servicenow');
      if (secretItem && secretItem.data !== undefined) {
        serviceNowCredentials.tenant = base64decode(secretItem.data.tenant);
        serviceNowCredentials.user = base64decode(secretItem.data.user);
        serviceNowCredentials.token = base64decode(secretItem.data.token);
      }
    } else {
      console.log(`could not find ServiceNow secret in keptn namespace!`);
    }

    return serviceNowCredentials;
  }

  async getDynatraceCredentials(): Promise<DynatraceCredentials> {
    const dynatraceCredentials: DynatraceCredentials = {
      tenant: '',
      token: '',
    };

    const s = await this.k8sClient.api.v1
      .namespaces('keptn').secrets
      .get({ name: 'dynatrace', pretty: true, exact: true, export: true });

    if (s.body.items && s.body.items.length > 0) {
      const secretItem = s.body.items.find(item => item.metadata.name === 'dynatrace');
      if (secretItem && secretItem.data !== undefined) {
        dynatraceCredentials.tenant = base64decode(secretItem.data.DT_TENANT_ID);
        dynatraceCredentials.token = base64decode(secretItem.data.DT_API_TOKEN);
      }
    } else {
      console.log(`could not find Dynatrace secret in keptn namespace!`);
    }

    return dynatraceCredentials;
  }

}
