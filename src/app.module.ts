import {Module} from "@nestjs/common";
import {AppService} from "./app.service";
import {PersistenceModule} from "./persistence/persistence.module";
import {AppController} from "./app.controller";

@Module({
  imports: [
    PersistenceModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {
}
