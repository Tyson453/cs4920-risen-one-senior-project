'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const users = [
      {
        uuid: 'john-doe-uuid',
        assignments: ['51506e92-650c-4c84-a15f-752370243891'],
        birthday: '',
        birthdayNoAcknowledge: false,
        email: 'john.doe@risen-one.com',
        firstName: 'John',
        lastName: 'Doe',
        maxHours: 120,
        maxSickHours: 40,
        name: 'John Doe',
        notes: ' ',
        pmTeams: [],
        requestedPTO: {
          '01/06/2026': {
            doa_name: '',
            end: '16:00',
            hours: 8,
            included: true,
            start: '08:00',
            types: { pto: 8, sick: 0, unpaid: 0 }
          },
          '01/07/2026': {
            doa_name: '',
            end: '16:00',
            hours: 8,
            included: true,
            start: '08:00',
            types: { pto: 0, sick: 8, unpaid: 0 }
          }
        },
        roles: ['EMPLOYEE', 'ADMIN', 'LEAD', 'PM'],
        startDate: '08/01',
        startYear: '2021',
        state: 'Missouri'
      },
      {
        uuid: 'jane-smith-uuid',
        assignments: ['62617f03-761d-5d95-b26g-863481354902'],
        birthday: '',
        birthdayNoAcknowledge: false,
        email: 'jane.smith@risen-one.com',
        firstName: 'Jane',
        lastName: 'Smith',
        maxHours: 120,
        maxSickHours: 40,
        name: 'Jane Smith',
        notes: ' ',
        pmTeams: [],
        requestedPTO: {},
        roles: ['EMPLOYEE', 'LEAD'],
        startDate: '09/15',
        startYear: '2022',
        state: 'Missouri'
      },
      {
        uuid: 'bob-johnson-uuid',
        assignments: ['51506e92-650c-4c84-a15f-752370243891'],
        birthday: '',
        birthdayNoAcknowledge: false,
        email: 'bob.johnson@risen-one.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        maxHours: 120,
        maxSickHours: 40,
        name: 'Bob Johnson',
        notes: ' ',
        pmTeams: [],
        requestedPTO: {},
        roles: ['EMPLOYEE'],
        startDate: '03/10',
        startYear: '2023',
        state: 'Missouri'
      }
    ];

    const projects = [
      {
        uuid: '51506e92-650c-4c84-a15f-752370243891',
        contract: 'Contract',
        description: 'example description',
        pointOfContact: 'John Doe',
        productManager: '',
        productOwner: 'John Doe',
        projectFullName: 'Project 22',
        projectName: 'PR22',
        startDate: '01/01/2021',
        status: 'Active'
      },
      {
        uuid: '62617f03-761d-5d95-b26g-863481354902',
        contract: 'Internal',
        description: 'Development project',
        pointOfContact: 'Jane Smith',
        productManager: 'Jane Smith',
        productOwner: 'Jane Smith',
        projectFullName: 'Project Alpha',
        projectName: 'ALPHA',
        startDate: '06/15/2022',
        status: 'Active'
      }
    ];

    const dailyReports = [
      {
        uuid: '2025/12/03106475023372690658361',
        date: '2025/12/03',
        projects: [
          {
            projectId: '51506e92-650c-4c84-a15f-752370243891',
            reportStatus: 'healthy',
            reportText: 'test'
          }
        ],
        reportStatus: true,
        updated_by: 'John Doe',
        userId: 'john-doe-uuid'
      },
      {
        uuid: '2025/12/04106475023372690658362',
        date: '2025/12/04',
        projects: [
          {
            projectId: '62617f03-761d-5d95-b26g-863481354902',
            reportStatus: 'at-risk',
            reportText: 'Working on bug fixes'
          }
        ],
        reportStatus: true,
        updated_by: 'Jane Smith',
        userId: 'jane-smith-uuid'
      }
    ];

    // Import users
    for (const user of users) {
      const params = {
        TableName: process.env.USERS_TABLE || 'users',
        Item: user
      };
      await dynamoDb.put(params).promise();
    }

    // Import projects
    for (const project of projects) {
      const params = {
        TableName: process.env.PROJECTS_TABLE || 'projects',
        Item: project
      };
      await dynamoDb.put(params).promise();
    }

    // Import daily reports
    for (const report of dailyReports) {
      const params = {
        TableName: process.env.DAILY_STATUS_TABLE || 'daily-status',
        Item: report
      };
      await dynamoDb.put(params).promise();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Data imported successfully',
        usersImported: users.length,
        projectsImported: projects.length,
        dailyReportsImported: dailyReports.length
      })
    };
  } catch (error) {
    console.error('Error importing data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to import data' })
    };
  }
};