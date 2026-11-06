import { Fact, Speaker } from '../../src/Components/Kit';
import {
    AnalysisStage,
    DeviceRequirement,
    ModelDownload,
    QueuedSession,
    RunningSession,
    SessionPreview,
    SessionRow,
    StageState,
    StorageShare,
    SubjectStatus,
    SubjectSummary,
    TranscriptLine,
} from '../../src/Screen/Model';
import { PaperInk } from '../../src/theme/PaperInk';

/** Sample data for stories only. Pseudonyms and excerpts are invented. */
export class StoryFixture {
    public static readonly ANALYSIS: ReadonlyArray<AnalysisStage> = [
        AnalysisStage.create('Decryption', 'In memory, never on disk', StageState.Done),
        AnalysisStage.create('Transcription', '41 min processed in 6 min · Parakeet v3', StageState.Done),
        AnalysisStage.create('Speakers', 'You and one other voice', StageState.Done),
        AnalysisStage.create('Audio destroyed', 'No sound of the session remains', StageState.Done),
        AnalysisStage.create('Subject recognition', 'Your confirmation is needed', StageState.Ask),
        AnalysisStage.create('Mini summary', 'On demand, from the session', StageState.Todo),
    ];

    public static readonly DOWNLOADS: ReadonlyArray<ModelDownload> = [
        ModelDownload.create('Transcription', 'Parakeet v3 · 640 MB', 0.62),
        ModelDownload.create('Voices and speakers', 'Silero VAD · CAM++', 1),
        ModelDownload.create('Mini summary', '[MODEL TO CHOOSE]', 0),
    ];

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

    public static readonly NEXT: ReadonlyArray<QueuedSession> = [
        QueuedSession.create('q1', 'Yesterday 16:00', '55 min · pending'),
        QueuedSession.create('q2', 'Tue. 14:00', '', 63),
    ];

    public static readonly PREVIOUS: ReadonlyArray<SessionRow> = [
        SessionRow.create('s1', 'Wed. 21 Oct.', '49 min', 'Back to work on Monday, half time', true),
        SessionRow.create('s2', 'Thu. 9 Oct.', '50 min', 'Argument with his sister about family meals'),
        SessionRow.create('s3', 'Mon. 22 Sept.', '53 min', 'Goal: get back to a sleep rhythm', true),
    ];

    public static readonly RECENT: ReadonlyArray<SessionPreview> = [
        SessionPreview.create('r1', 'Subject Lotus', 'Yesterday', 'Back on the week, more regular sleep, work…'),
        SessionPreview.create('r2', 'Subject Cedar', 'Tue.', 'First session. Reason for consulting, context…'),
        SessionPreview.create('r3', 'Subject Lotus', '28 Oct.', 'Conflict with his sister, how it feels…'),
    ];

    public static readonly REQUIREMENTS: ReadonlyArray<DeviceRequirement> = [
        DeviceRequirement.create('Memory', '6 GB minimum', '3 GB', false),
        DeviceRequirement.create('System', 'iOS 17 or later', 'iOS 18.2', true),
        DeviceRequirement.create('Processor', '64-bit with neural engine', 'A12', false),
    ];

    public static readonly RUNNING: RunningSession = RunningSession.create(
        'Today 10:30',
        '48 min',
        [
            AnalysisStage.create('Decrypt', '', StageState.Done),
            AnalysisStage.create('Voice', '', StageState.Done),
            AnalysisStage.create('Text', '', StageState.Running),
            AnalysisStage.create('Speakers', '', StageState.Todo),
        ],
        0.38,
    );

    public static readonly SHARES: ReadonlyArray<StorageShare> = [
        StorageShare.create('Models', '760 MB', 760, PaperInk.INK),
        StorageShare.create('Sessions to transcribe (encrypted audio)', '410 MB', 410, PaperInk.OCHRE),
        StorageShare.create('Transcripts', '18 MB', 40, PaperInk.ACCENT),
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
