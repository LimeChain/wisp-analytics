import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {Message, MessagesSchema} from './schemas/message.schema';
import {PersistenceService} from './persistence.service';
import {ConfigModule, ConfigService} from "@nestjs/config";
import configuration from "../configuration";
import {LightClientUpdate, LightClientUpdateSchema} from "./schemas/light-client-update.schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        let uri = config.get<string>("mongodb.uri")
        return {
          uri: uri,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        };
      },
      inject: [ConfigService]
    }),
    MongooseModule.forFeature([{name: Message.name,schema: MessagesSchema}]),
    MongooseModule.forFeature([{name: LightClientUpdate.name, schema: LightClientUpdateSchema}])
  ],
  providers: [PersistenceService],
  exports: [PersistenceService],
})
export class PersistenceModule {
}
