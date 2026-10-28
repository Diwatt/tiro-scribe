import { defineEntity, p } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { AbstractRepository } from '@/Repository/AbstractRepository';
import { createTestOrm } from '../helpers/mikroOrm';

class Widget {
    public uuid!: string;
    public label!: string;
}

const WidgetSchema = defineEntity({
    name: 'Widget',
    tableName: 'widgets',
    repository: () => WidgetRepository,
    properties: {
        uuid: p.uuid().length(36).primary().onCreate(() => uuidv4()),
        label: p.string().default(''),
    },
});
WidgetSchema.setClass(Widget);

class WidgetRepository extends AbstractRepository<Widget> {}

describe('AbstractRepository', () => {
    test('persist upserts and findOne round-trips', async () => {
        const orm = await createTestOrm([WidgetSchema]);
        // scratch class: EntityRepositoryType inference does not apply, cast to the custom repo
        const repo = orm.em.getRepository(Widget) as WidgetRepository;

        const widget = new Widget();
        widget.uuid = uuidv4();
        widget.label = 'first';
        await repo.persist(widget);

        widget.label = 'second';
        await repo.persist(widget);

        const found = await repo.findOne(widget.uuid);
        expect(found?.label).toBe('second');
        await orm.close(true);
    });

    test('exists returns true only for stored primary keys', async () => {
        const orm = await createTestOrm([WidgetSchema]);
        const repo = orm.em.getRepository(Widget) as WidgetRepository;

        const widget = new Widget();
        widget.uuid = uuidv4();
        await repo.persist(widget);

        expect(await repo.exists(widget.uuid)).toBe(true);
        expect(await repo.exists(uuidv4())).toBe(false);
        await orm.close(true);
    });
});
