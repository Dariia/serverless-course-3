const cdk = require('@aws-cdk/core');
const lambda = require('@aws-cdk/aws-lambda');
const api = require('@aws-cdk/aws-apigateway');
const dynamodb = require('@aws-cdk/aws-dynamodb');
const eventSource = require('@aws-cdk/aws-lambda-event-sources');
const s3 = require('@aws-cdk/aws-s3');
const sqs = require('@aws-cdk/aws-sqs');
const { SqsEventSource } = require('@aws-cdk/aws-lambda-event-sources');
const path = require('path');
const S3EventSource = eventSource.S3EventSource;
const apiDynamodbServiceHandlers = '../src/services/apiDynamoDbService/';

class ServerlessCourse31Stack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, 'newProducts', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    });

    const productsQueue = new sqs.Queue(this, 'newProductsQueue');

    const bucket = new s3.Bucket(this, 'newProducts-aws-cdk-bucket');

    const createProductLambda = this.createLambda(this, 'createProduct', 'handler.createProduct', `${apiDynamodbServiceHandlers}create/`, productsTable);
    const updateProductLambda = this.createLambda(this, 'updateProduct', 'handler.updateProduct', `${apiDynamodbServiceHandlers}update/`, productsTable);
    const allProductsLambda = this.createLambda(this, 'allProducts', 'handler.getAllProducts', `${apiDynamodbServiceHandlers}get/`, productsTable);
    const getProductLambda = this.createLambda(this, 'getProduct', 'handler.getProduct', `${apiDynamodbServiceHandlers}get/`, productsTable);
    const deleteProductLambda = this.createLambda(this, 'deleteProduct', 'handler.deleteProduct', `${apiDynamodbServiceHandlers}delete/`, productsTable);

    const processS3Lambda = this.createLambda(this, 'processS3Bucket', 'processS3Bucket.handler', '../src/services/s3SqsService/handlers', undefined, productsQueue);
    const processSQSMessageLambda = this.createLambda(this, 'processSQSMessage', 'processSQSMessage.handler', '../src/services/sqsDynamodbService/handlers', productsTable);

    const restApi = new api.RestApi(this, 'newProducts-api');

    const products = restApi.root.addResource('newProducts');
    const product = products.addResource('{newProducts_id}');

    const allProductsLambdaIntegration = new api.LambdaIntegration(allProductsLambda);
    const createProductLambdaIntegration = new api.LambdaIntegration(createProductLambda);
    const getProductLambdaIntegration = new api.LambdaIntegration(getProductLambda);
    const updateProductLambdaIntegration = new api.LambdaIntegration(updateProductLambda);
    const deleteProductLambdaIntegration = new api.LambdaIntegration(deleteProductLambda);

    products.addMethod('GET', allProductsLambdaIntegration);
    product.addMethod('POST', createProductLambdaIntegration);
    product.addMethod('GET', getProductLambdaIntegration);
    product.addMethod('PUT', updateProductLambdaIntegration);
    product.addMethod('DELETE', deleteProductLambdaIntegration);

    processS3Lambda.addEventSource(new S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED]
    }));

    processSQSMessageLambda.addEventSource(new SqsEventSource(productsQueue));

    bucket.grantReadWrite(processS3Lambda);
  };

  createLambda = (scope, id, handler, src, table, queue) => {
    const lambdaFunction = new lambda.Function(scope, id, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset(path.join(__dirname, src)),
      handler: handler,
      environment: {
        DYNAMODB_TABLE: table ? table.tableName : '',
        QUEUE_URL: queue ? queue.queueUrl : ''
      }
    });

    if (table) {
      // Give our Lambda permissions to read and write data from the passed in DynamoDB table
      table.grantReadWriteData(lambdaFunction);
    }

    if (queue) {
      queue.grantSendMessages(lambdaFunction);
    }

    return lambdaFunction;
  }
}

module.exports = { ServerlessCourse31Stack }
