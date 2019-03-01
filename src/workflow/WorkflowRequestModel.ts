import { ApiModel, ApiModelProperty, SwaggerDefinitionConstant } from 'swagger-express-ts';

@ApiModel({
  description: '',
  name: 'WorkflowRequestModel',
})
export class ProjectRequestModel {
  @ApiModelProperty({
    description: 'Object containing the workflow information',
    example: [{
      project: 'name of project',
      stages: [
        {
          name: 'dev',
          deployment_strategy: 'tbd',
        },
        {
          name: 'staging',
          deployment_strategy: 'tbd',
        },
        {
          name: 'production',
          deployment_strategy: 'tbd',
        },
      ],
    }],
    type: SwaggerDefinitionConstant.Model.Type.OBJECT,
    required: true,
  })
  public data: any;
}
