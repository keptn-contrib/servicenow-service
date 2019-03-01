import { ServiceNowCredentials } from '../lib/types/ServiceNowCredentials';
import { K8sClientFactory } from '../lib/k8s/K8sClientFactory';
import * as K8sApi from 'kubernetes-client';

//import { KeptnConfigSecretFactory } from '../lib/types/KeptnConfigSecretFactory';
//import { KeptnGithubCredentialsSecret } from '../lib/types/KeptnGithubCredentialsSecret';

import { base64encode, base64decode } from 'nodejs-base64';

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

  // async updateGithubConfig(keptnConfig: KeptnGithubCredentials) {
  //   const secret = new KeptnConfigSecretFactory().createKeptnConfigSecret(keptnConfig);

  //   const created = await this.updateGithubCredentials(secret);
  //   console.log(created);
  // }

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
      const ghItem = s.body.items.find(item => item.metadata.name === 'servicenow');
      if (ghItem && ghItem.data !== undefined) {
        // console.log(ghItem.data);
        serviceNowCredentials.tenant = base64decode(ghItem.data.tenant);
        serviceNowCredentials.user = base64decode(ghItem.data.user);
        serviceNowCredentials.token = base64decode(ghItem.data.token);
      }
    }

    return serviceNowCredentials;
  }

  // private async updateGithubCredentials(secret: KeptnGithubCredentialsSecret) {
  //   try {
  //     const deleteResult = await this.k8sClient.api.v1
  //       .namespaces('keptn').secrets('github-credentials').delete();
  //     console.log(deleteResult);
  //   }
  //   catch (e) { }
  //   const created = await this.k8sClient.api.v1.namespaces('keptn').secrets.post({
  //     body: secret,
  //   });

  //   return created;
  // }
}