import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database.service';

export interface CategoryDto {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItemDto {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: string;
  taxRate: number;
  taxInclusive: boolean;
  station: string;
  isAvailable: boolean;
  variants?: { id: string; name: string; priceDelta: string }[];
  modifiers?: { id: string; name: string; price: string }[];
}

@Injectable()
export class MenuService {
  constructor(private readonly db: DatabaseService) {}

  // Fallback demo menu for initial out-of-the-box readiness
  private readonly demoCategories: CategoryDto[] = [
    { id: 'cat-1', name: 'Pizza', sortOrder: 1 },
    { id: 'cat-2', name: 'Burgers', sortOrder: 2 },
    { id: 'cat-3', name: 'Starters & Sides', sortOrder: 3 },
    { id: 'cat-4', name: 'Beverages', sortOrder: 4 },
    { id: 'cat-5', name: 'Desserts', sortOrder: 5 },
  ];

  private readonly demoItems: MenuItemDto[] = [
    {
      id: 'item-1',
      categoryId: 'cat-1',
      name: 'Margherita Pizza',
      description: 'Classic mozzarella, basil & signature San Marzano tomato sauce',
      basePrice: '299.00',
      taxRate: 5.0,
      taxInclusive: true,
      station: 'KITCHEN',
      isAvailable: true,
      variants: [
        { id: 'var-1a', name: 'Regular (8")', priceDelta: '0.00' },
        { id: 'var-1b', name: 'Medium (10")', priceDelta: '100.00' },
        { id: 'var-1c', name: 'Large (12")', priceDelta: '200.00' },
      ],
      modifiers: [
        { id: 'mod-1', name: 'Extra Cheese', price: '50.00' },
        { id: 'mod-2', name: 'Gluten Free Crust', price: '70.00' },
      ],
    },
    {
      id: 'item-2',
      categoryId: 'cat-1',
      name: 'Chicken Pepperoni Pizza',
      description: 'Spicy chicken pepperoni with melted aged provolone & oregano',
      basePrice: '399.00',
      taxRate: 5.0,
      taxInclusive: true,
      station: 'KITCHEN',
      isAvailable: true,
      variants: [
        { id: 'var-2a', name: 'Regular (8")', priceDelta: '0.00' },
        { id: 'var-2b', name: 'Medium (10")', priceDelta: '120.00' },
        { id: 'var-2c', name: 'Large (12")', priceDelta: '220.00' },
      ],
      modifiers: [
        { id: 'mod-1', name: 'Extra Cheese', price: '50.00' },
        { id: 'mod-3', name: 'Jalapenos', price: '30.00' },
      ],
    },
    {
      id: 'item-3',
      categoryId: 'cat-2',
      name: 'Classic Chicken Burger',
      description: 'Grilled chicken breast patty, brioche bun, cheddar cheese & herb mayo',
      basePrice: '249.00',
      taxRate: 5.0,
      taxInclusive: true,
      station: 'KITCHEN',
      isAvailable: true,
      modifiers: [
        { id: 'mod-1', name: 'Extra Cheese Slice', price: '40.00' },
        { id: 'mod-4', name: 'Bacon Rasher', price: '80.00' },
      ],
    },
    {
      id: 'item-4',
      categoryId: 'cat-2',
      name: 'Crispy Paneer Burger',
      description: 'Spiced battered cottage cheese slab with tangy chipotle coleslaw',
      basePrice: '199.00',
      taxRate: 5.0,
      taxInclusive: true,
      station: 'KITCHEN',
      isAvailable: true,
    },
    {
      id: 'item-5',
      categoryId: 'cat-3',
      name: 'Peri Peri French Fries',
      description: 'Golden crispy potato fries tossed in aromatic African peri peri spice',
      basePrice: '129.00',
      taxRate: 5.0,
      taxInclusive: true,
      station: 'KITCHEN',
      isAvailable: true,
    },
    {
      id: 'item-6',
      categoryId: 'cat-4',
      name: 'Cold Brew Coffee',
      description: 'Slow-steeped Arabica blend served chilled over artisan ice cube',
      basePrice: '149.00',
      taxRate: 18.0,
      taxInclusive: false,
      station: 'BAR',
      isAvailable: true,
    },
    {
      id: 'item-7',
      categoryId: 'cat-4',
      name: 'Fresh Lime Soda',
      description: 'Sparkling mineral water with freshly squeezed lime and organic mint',
      basePrice: '89.00',
      taxRate: 18.0,
      taxInclusive: false,
      station: 'BAR',
      isAvailable: true,
    },
    {
      id: 'item-8',
      categoryId: 'cat-5',
      name: 'Molten Lava Cake',
      description: 'Warm Belgian chocolate cake with oozing center and vanilla bean gelato',
      basePrice: '189.00',
      taxRate: 5.0,
      taxInclusive: true,
      station: 'KITCHEN',
      isAvailable: true,
    },
  ];

  async getCategories(tenantId: string): Promise<CategoryDto[]> {
    try {
      if (this.db.category) {
        const categories = await this.db.category.findMany({
          where: { tenantId, isActive: true },
          orderBy: { sortOrder: 'asc' },
        });
        if (categories.length > 0) {
          return categories.map((c) => ({
            id: c.id,
            name: c.name,
            sortOrder: c.sortOrder,
          }));
        }
      }
    } catch {
      // Fallback
    }
    return this.demoCategories;
  }

  async getMenuItems(tenantId: string, categoryId?: string): Promise<MenuItemDto[]> {
    try {
      if (this.db.menuItem) {
        const items = await this.db.menuItem.findMany({
          where: {
            tenantId,
            ...(categoryId ? { categoryId } : {}),
            isAvailable: true,
          },
          include: {
            variants: true,
          },
        });
        if (items.length > 0) {
          return items.map((i) => ({
            id: i.id,
            categoryId: i.categoryId,
            name: i.name,
            description: i.description ?? '',
            basePrice: i.basePrice.toString(),
            taxRate: Number(i.taxRate),
            taxInclusive: i.taxInclusive,
            station: i.station,
            isAvailable: i.isAvailable,
            variants: i.variants.map((v) => ({
              id: v.id,
              name: v.name,
              priceDelta: v.priceDelta.toString(),
            })),
          }));
        }
      }
    } catch {
      // Fallback
    }

    if (categoryId) {
      return this.demoItems.filter((i) => i.categoryId === categoryId);
    }
    return this.demoItems;
  }
}
