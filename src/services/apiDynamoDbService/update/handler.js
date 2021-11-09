"use strict";

const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const updateProduct = (event, context, callback) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id
    },
    ExpressionAttributeValues: {
      ":name": data.email,
      ":price": data.price,
      ":image": data.image,
      ":checked": data.checked,
      ":updatedAt": new Date().getTime()
    },
    UpdateExpression:
      "SET name = :name, price = :price, image = :image, updatedAt = :updatedAt",
    ReturnValues: "ALL_NEW"
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.error(error);

      callback(null, {
        statusCode: error.statusCode || 501
      });
      return;
    }

    callback(null, {
      statusCode: 200,
      body: JSON.stringify(result.Attributes)
    });
  });
};

module.exports = updateProduct;
