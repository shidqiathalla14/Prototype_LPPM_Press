import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';

export const KNEX = 'KNEX_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Knex =>
        knex({
          client: 'pg',
          connection: config.get('database'),
          pool: { min: 1, max: 10 },
        }),
    },
  ],
  exports: [KNEX],
})
export class KnexModule {}
