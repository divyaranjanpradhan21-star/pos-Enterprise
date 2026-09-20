import { Module } from '@nestjs/common';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { DatabaseService } from '../../core/database.service';

@Module({
  controllers: [TableController],
  providers: [TableService, DatabaseService],
  exports: [TableService],
})
export class TableModule {}
