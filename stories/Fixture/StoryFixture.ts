import { Fact, Speaker } from '../../src/Components/Kit';
import { SessionPreview, SubjectStatus, SubjectSummary, TranscriptLine } from '../../src/Screen/Model';

/** Sample data for stories only. Pseudonyms and excerpts are invented. */
export class StoryFixture {
    public static readonly FACTS: ReadonlyArray<Fact> = [
        Fact.create('First session', '11 March 2026'),
        Fact.create('Average rhythm', 'every 15 days'),
        Fact.create('Total time', '10 h 08'),
        Fact.create('Average length', '51 min'),
    ];

    public static readonly LINES: ReadonlyArray<TranscriptLine> = [
        TranscriptLine.create(Speaker.Therapist, 'How has the week been since last time?', '02:14'),
        TranscriptLine.create(Speaker.Subject, 'Rather better. I sleep a little more, I wake up less at night.', '02:20'),
        TranscriptLine.create(Speaker.Therapist, 'What changed, in your view?', '02:41'),
        TranscriptLine.create(Speaker.Subject, 'I went back to work, mornings only. It makes me get up.', '02:47'),
        TranscriptLine.create(Speaker.Subject, 'And in the evening I am tired, so I stay off my phone.', '03:05'),
        TranscriptLine.create(Speaker.Therapist, 'And with your sister, could you talk again?', '03:18'),
        TranscriptLine.create(Speaker.Subject, 'Not really. We met on Sunday, it was tense.', '03:26'),
    ];

    public static readonly RECENT: ReadonlyArray<SessionPreview> = [
        SessionPreview.create('r1', 'Subject Lotus', 'Yesterday', 'Back on the week, more regular sleep, work…'),
        SessionPreview.create('r2', 'Subject Cedar', 'Tue.', 'First session. Reason for consulting, context…'),
        SessionPreview.create('r3', 'Subject Lotus', '28 Oct.', 'Conflict with his sister, how it feels…'),
    ];

    public static readonly SUBJECTS: ReadonlyArray<SubjectSummary> = [
        SubjectSummary.create('a', 'Subject Lotus', '6 days ago', '12 sessions since March · every 15 days', SubjectStatus.Analysing, 'Analysis running'),
        SubjectSummary.create('b', 'Subject Cedar', '9 days ago', '1 session', SubjectStatus.NewVoice, 'New voice to confirm'),
        SubjectSummary.create('c', 'Subject Amber', '3 weeks ago', '7 sessions since January · every month'),
        SubjectSummary.create('d', 'Subject Willow', '2 months ago', '3 sessions since May'),
        SubjectSummary.create('e', 'Subject Elm', '6 months ago', '5 sessions since 2024 · every 6 months'),
    ];

    public static readonly SUMMARY =
        'Sleep more regular since returning to work half time. Less phone time in the evening. Still tense with his sister, met on Sunday.';
}
