import { ServiceNowCredentials } from './ServiceNowCredentials';
import { ApiModel, ApiModelProperty } from 'swagger-express-ts';

@ApiModel({
  description: '',
})
export class ConfigRequestModel {
  @ApiModelProperty({
    description: 'Object containing the required ServiceNow credentials',
    example: [{
      user: 'myUser',
      token: 'myToken',
    }],
  })
  data: ServiceNowCredentials;
}
