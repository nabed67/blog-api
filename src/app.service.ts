import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome() {
    return {
      message: 'Welcome to the Blog API!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'ok',
      statusCode: 200,
    };
  }
}
