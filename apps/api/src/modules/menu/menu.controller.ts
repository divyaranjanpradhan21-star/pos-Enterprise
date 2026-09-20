import { Controller, Get, Query, Req } from '@nestjs/common';
import { MenuService, CategoryDto, MenuItemDto } from './menu.service';
import { Request } from 'express';

@Controller('api/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('categories')
  async getCategories(@Req() req: Request): Promise<CategoryDto[]> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    return this.menuService.getCategories(tenantId);
  }

  @Get('items')
  async getMenuItems(
    @Req() req: Request,
    @Query('categoryId') categoryId?: string,
  ): Promise<MenuItemDto[]> {
    const tenantId = req.tenantId ?? '018e6a12-0000-7000-8000-tenant000001';
    return this.menuService.getMenuItems(tenantId, categoryId);
  }
}
