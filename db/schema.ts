import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const restaurantState = sqliteTable('restaurant_state', {
  id: text('id').primaryKey(),
  version: integer('version').notNull().default(0),
  data: text('data').notNull(),
});
