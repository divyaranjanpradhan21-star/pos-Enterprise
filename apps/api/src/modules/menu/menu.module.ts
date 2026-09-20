import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { DatabaseService } from '../../core/database.service';

@Module({
  controllers: [MenuController],
  providers: [MenuService, DatabaseService],
  exports: [MenuService],
})
export class MenuModule {}
