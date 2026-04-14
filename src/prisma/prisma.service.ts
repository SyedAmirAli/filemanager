import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';

function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    return databaseUrl;
  }
  const rest = databaseUrl.slice('file:'.length);
  if (rest.startsWith('/')) {
    return rest;
  }
  return resolve(process.cwd(), rest.replace(/^\.\//, ''));
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL ?? 'file:./dev.db';
    const adapter = new PrismaBetterSqlite3({
      url: resolveSqlitePath(url) as ':memory:' | (string & {}),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
