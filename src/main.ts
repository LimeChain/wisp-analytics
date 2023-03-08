import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {ConfigService} from "@nestjs/config";
import {Logger} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const logger = new Logger("Main");
  const port = process.env.PORT ? process.env.PORT : app.get(ConfigService).get<string>("server.port");
  await app.listen(port);
  logger.log(`Server started on port ${port}`);
}

bootstrap();
