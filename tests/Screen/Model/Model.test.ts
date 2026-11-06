import { Speaker } from '@/Components/Kit/Speaker';
import { AnalysisStage } from '@/Screen/Model/AnalysisStage';
import { DeviceRequirement } from '@/Screen/Model/DeviceRequirement';
import { LanguageOption } from '@/Screen/Model/LanguageOption';
import { ModelDownload } from '@/Screen/Model/ModelDownload';
import { QueuedSession } from '@/Screen/Model/QueuedSession';
import { RunningSession } from '@/Screen/Model/RunningSession';
import { SessionPreview } from '@/Screen/Model/SessionPreview';
import { SessionRow } from '@/Screen/Model/SessionRow';
import { StageState } from '@/Screen/Model/StageState';
import { StorageShare } from '@/Screen/Model/StorageShare';
import { SubjectStatus } from '@/Screen/Model/SubjectStatus';
import { SubjectSummary } from '@/Screen/Model/SubjectSummary';
import { TranscriptLine } from '@/Screen/Model/TranscriptLine';

describe('SessionPreview', () => {
    it('takes the initial of the pseudonym', () => {
        expect(SessionPreview.create('1', 'Subject Lotus', 'Yesterday', '…').getInitial()).toBe('L');
    });

    it('returns an empty initial for an empty name', () => {
        expect(SessionPreview.create('1', '', 'Yesterday', '…').getInitial()).toBe('');
    });
});

describe('SubjectSummary', () => {
    it('has no status by default', () => {
        const subject = SubjectSummary.create('1', 'Subject Elm', '6 months ago', '5 sessions');
        expect(subject.hasStatus()).toBe(false);
        expect(subject.getInitial()).toBe('E');
    });

    it('reports a pending status', () => {
        const subject = SubjectSummary.create('1', 'Subject Cedar', '9 days ago', '1 session', SubjectStatus.NewVoice, 'New voice');
        expect(subject.hasStatus()).toBe(true);
    });

    it('returns an empty initial for an empty name', () => {
        expect(SubjectSummary.create('1', '', '', '').getInitial()).toBe('');
    });
});

describe('TranscriptLine', () => {
    const lines = [
        TranscriptLine.create(Speaker.Subject, 'a', '00:01'),
        TranscriptLine.create(Speaker.Subject, 'b', '00:02'),
        TranscriptLine.create(Speaker.Therapist, 'c', '00:03'),
    ];

    it('is first of group at the start of the transcript', () => {
        expect(TranscriptLine.isFirstOfGroup(lines, 0)).toBe(true);
    });

    it('is not first of group when the same speaker continues', () => {
        expect(TranscriptLine.isFirstOfGroup(lines, 1)).toBe(false);
    });

    it('is first of group when the speaker changes', () => {
        expect(TranscriptLine.isFirstOfGroup(lines, 2)).toBe(true);
    });

    it('is not last of group when the same speaker continues', () => {
        expect(TranscriptLine.isLastOfGroup(lines, 0)).toBe(false);
    });

    it('is last of group when the speaker changes', () => {
        expect(TranscriptLine.isLastOfGroup(lines, 1)).toBe(true);
    });

    it('is last of group at the end of the transcript', () => {
        expect(TranscriptLine.isLastOfGroup(lines, 2)).toBe(true);
    });
});

describe('AnalysisStage', () => {
    it('needs an answer only when asking', () => {
        expect(AnalysisStage.create('Recognition', '', StageState.Ask).needsAnswer()).toBe(true);
        expect(AnalysisStage.create('Transcription', '', StageState.Done).needsAnswer()).toBe(false);
    });
});

describe('ModelDownload', () => {
    it('clamps progress above one', () => {
        expect(ModelDownload.create('ASR', '', 1.4).progress).toBe(1);
    });

    it('clamps progress below zero', () => {
        expect(ModelDownload.create('ASR', '', -0.2).progress).toBe(0);
    });

    it('is complete at full progress', () => {
        expect(ModelDownload.create('ASR', '', 1).isComplete()).toBe(true);
        expect(ModelDownload.create('ASR', '', 0.5).isComplete()).toBe(false);
    });
});

describe('QueuedSession', () => {
    it('is interrupted when it carries a progress', () => {
        expect(QueuedSession.create('1', 'Tue.', '', 63).isInterrupted()).toBe(true);
    });

    it('is not interrupted by default', () => {
        expect(QueuedSession.create('1', 'Yesterday', '55 min').isInterrupted()).toBe(false);
    });
});

describe('RunningSession', () => {
    it('clamps the running progress', () => {
        expect(RunningSession.create('Today', '48 min', [], 2).runningProgress).toBe(1);
        expect(RunningSession.create('Today', '48 min', [], -1).runningProgress).toBe(0);
    });
});

describe('SessionRow', () => {
    it('has no note by default', () => {
        expect(SessionRow.create('1', 'Wed.', '49 min', '…').hasNote).toBe(false);
    });
});

describe('DeviceRequirement', () => {
    it('keeps the comparison', () => {
        const requirement = DeviceRequirement.create('Memory', '6 GB', '3 GB', false);
        expect(requirement.isMet).toBe(false);
        expect(requirement.actual).toBe('3 GB');
    });
});

describe('StorageShare', () => {
    it('keeps its size in megabytes', () => {
        expect(StorageShare.create('Models', '760 MB', 760, '#000000').megabytes).toBe(760);
    });
});

describe('LanguageOption', () => {
    it('keeps the code and its label', () => {
        const option = LanguageOption.create('fr', 'French');
        expect(option.code).toBe('fr');
        expect(option.label).toBe('French');
    });
});
