/**
 * Constants – Option lists and step count for the onboarding wizard.
 */

export const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
];

export const QUALIFICATIONS = [
    // --- 1. Medical (Prescribers & Diagnosis) ---
    // In Europe/UK, GPs are often the first line of mental health care.
    { value: 'Psychiatrist', label: 'Psychiatrist (MD)' },
    { value: 'Child_Psychiatrist', label: 'Child & Adolescent Psychiatrist' },
    { value: 'General_Practitioner_Psy', label: 'General Practitioner (Mental Health Focus)' },

    // --- 2. Psychology (Protected University Titles) ---
    // Standard across Europe (Requires Master's or PhD).
    { value: 'Clinical_Psychologist', label: 'Clinical Psychologist' },
    { value: 'Neuropsychologist', label: 'Neuropsychologist' },
    { value: 'Work_Psychologist', label: 'Occupational / Work Psychologist' }, // "Occupational" is the standard term in UK/US.

    // --- 3. Psychotherapy (State Regulated Title) ---
    // Specific legal status: France (ARS), Germany (Psychologischer Psychotherapeut), UK (HCPC).
    { value: 'Psychotherapist_State', label: 'Psychotherapist (State Regulated)' },

    // --- 4. Clinical Practice & Counseling (Non-Medical / Private Sector) ---
    // Covers "Psychopraticien" (FR), "Heilpraktiker" (DE), "Counsellor" (UK).
    { value: 'Psycho_Practitioner', label: 'Counsellor / Psychopractitioner' },
    { value: 'Psychoanalyst', label: 'Psychoanalyst' },

    // --- 5. Somatic & Specialized Approaches (EU Specificities) ---
    // Psychomotor Therapist: Strong in France/Italy/Benelux (rare in UK/US).
    { value: 'Psychomotor_Therapist', label: 'Psychomotor Therapist' },
    // Sophrologist: Franco-Belgian specificity (often classified as "Relaxation" elsewhere).
    { value: 'Sophrologist', label: 'Sophrologist' },
    { value: 'Art_Therapist', label: 'Art Therapist' },

    // --- 6. Nursing & Support ---
    // Crucial in European public psychiatry protocols.
    { value: 'Psychiatric_Nurse', label: 'Psychiatric Nurse' },

    // --- Other / Research Specific ---
    { value: 'Student_Supervised', label: 'Student / Intern (Supervised)' },
    { value: 'Researcher_Non_Clinician', label: 'Researcher (Non-Clinical)' },
];

export const THERAPY_METHODS = [
    // --- 1. Cognitive & Behavioral (The "Gold Standards") ---
    { value: 'CBT', label: 'CBT (Cognitive Behavioral Therapy)' },
    { value: 'ACT', label: 'ACT (Acceptance and Commitment Therapy)' },
    { value: 'Mindfulness', label: 'Mindfulness-Based (MBSR/MBCT)' },
    { value: 'Schema_Therapy', label: 'Schema Therapy' },

    // --- 2. Psychodynamic & Analytic (Depth Psychology) ---
    // Grouping Analysis and Dynamic allows for broader research classification
    { value: 'Psychoanalysis', label: 'Psychoanalysis / Psychodynamic Therapy' },
    { value: 'Transactional_Analysis', label: 'Transactional Analysis (TA)' },

    // --- 3. Systemic & Humanistic ---
    { value: 'Systemic_Family', label: 'Systemic & Family Therapy' },
    { value: 'Humanistic', label: 'Humanistic (Person-Centered / Gestalt)' },

    // --- 4. Trauma-Informed & Somatic (Crucial for modern research) ---
    { value: 'EMDR', label: 'EMDR' },
    { value: 'Lifespan_Integration', label: 'Lifespan Integration (LI)' }, // "ICV" in French
    { value: 'Brainspotting', label: 'Brainspotting' },
    { value: 'Hypnotherapy', label: 'Clinical Hypnotherapy (Ericksonian)' },

    // --- 5. Body & Movement (European Specificities) ---
    { value: 'Sophrology', label: 'Sophrology' }, // Keep as is, specific to EU market
    { value: 'Psychomotor_Therapy', label: 'Psychomotor Therapy' }, // "Psychomotricité"

    // --- 6. General / Mixed ---
    { value: 'Integrative', label: 'Integrative Psychotherapy' }, // Most common in practice
];

export const ONBOARDING_STEPS = 4;
