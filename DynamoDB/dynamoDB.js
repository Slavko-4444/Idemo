const AWS = require("aws-sdk");
const uuid = require("uuid");
const moment = require('moment');


const usersTable = process.env.USERS_TABLE

const documentClient = new AWS.DynamoDB.DocumentClient();


const Dynamo = {
  async getItem(Id, TableName) {
    const params = {
      TableName: TableName,
    };
    var key = { ID:Id };
    params.Key = key;

    const data = await documentClient.get(params).promise();

    if (!Object.keys(data).length)
      return {
        data: {},
        status: 200,
      };

    if (!data || !data.Item)
      return {
        message: data.message,
        status: data.status,
      };

    return {
      data: data.Item,
      status: 200,
    };
  },

  async getAll(TableName) {
    const params = {
      TableName: TableName,
    };

    const data = await documentClient.scan(params).promise();
    if (!data || !data.Items) {
      return {
        message: `There was an error fetching the data from ${TableName}`,
        status: 400,
      };
    }

    return {
      data: data.Items,
      status: 200,
    };
  },

  async write(data, TableName) {
    const Item = { ...data};
    Item.ID = uuid.v1();
    Item.time = moment().format();
    const params = {
      TableName: TableName,
      Item: Item,
    }; 
    var res;
    try {
      res = await documentClient.put(params).promise();
    } catch (err) {
      return {
        message: `There was an error inserting ${data} in tabel ${TableName}\n ${err}`,
        status: 400,
      };
    }

    return {
      data: params.Item,
      status: 200,
    };
  },

  async delteItem(Id, TableName) {

    const params = {
      TableName: TableName,
      Key: {
        ID: Id
      }
    }

    try {
      const deleteItem = await documentClient.delete(params).promise();
    
      return {
        data: true,
        status: 200
      }      
    } catch (error) {
      return {
        message: error,
        status: 400
      }
    }
    
  },

  async updateItem(Id, data, TableName) {
    const params = {
      TableName: TableName,
      Item: {
        ID: Id,
        time: moment().format(),
        ...data
      }  
    };

    try {
     var res = await documentClient.put(params).promise();
    } catch (err) {
      return {
        message: `There was an error inserting ${data} in tabel ${TableName}\n ${err}`,
        status: 400,
      };
    }

    return {
      data: params.Item,
      status: 200,
    };
  },

  async getAllBlogsOfUser(id, blogTable) {
    const params = {
        TableName: blogTable,
        FilterExpression: 'us = :us',
        ExpressionAttributeValues: {
        ':us': id
      }
    }

    try {
      const blogs = await documentClient.scan(params).promise();
      return {
        data: blogs.Items,
        status: 200
      }
    } catch (error) {
      return {
        status: 400,
        message: error
      }
    }
  },

  async getUserByUsername(username) {
    
    const params = {
      TableName: usersTable,
      // Specify which items in the results are returned.
      FilterExpression: "email=:topic",
      // Define the expression attribute value, which are substitutes for the values you want to compare.
      ExpressionAttributeValues: {
        ":topic": username,
      }
    }

    try {
      const user = await documentClient.scan(params).promise();
      return {
        data: user.Items[0],
        status: 200
      }
    } catch (error) {
      return {
        status: 400,
        message: error
      }
    }
    

  },
  

};

module.exports = Dynamo;
