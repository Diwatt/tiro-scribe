import { defineEntity, p } from '@mikro-orm/core';
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/Database/Database';
import { DatabaseException } from '@/Exception';
import { SqlJsDialect } from '../helpers/SqlJsDialect';

class Probe {
    public uuid!: string;
}

const ProbeSchema = defineEntity({
    name: 'Probe',
    tableName: 'probes',
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
    },
});

describe('Database (v2)', () => {
    afterEach(async () => {
        await Database.close();
    });

    it('getEntityManager throws DATABASE_NOT_INITIALIZED before initialize', () => {
        expect(() => Database.getEntityManager()).toThrow(DatabaseException);
    });

    it('initialize is idempotent and returns the same instance', async () => {
        const engine = await initSqlJs();
        const first = await Database.initialize({ dialect: new SqlJsDialect(engine), entities: [ProbeSchema] });
        const second = await Database.initialize({ dialect: new SqlJsDialect(engine), entities: [ProbeSchema] });
        expect(second).toBe(first);
    });

    it('getEntityManager returns a working repository after initialize', async () => {
        const engine = await initSqlJs();
        await Database.initialize({ dialect: new SqlJsDialect(engine), entities: [ProbeSchema] });

        const probe = new Probe();
        probe.uuid = uuidv4();
        await Database.getEntityManager().upsert(probe);
        expect(await Database.getEntityManager().findOne(Probe, probe.uuid)).not.toBeNull();
    });
});
