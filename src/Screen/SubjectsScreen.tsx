import type React from 'react';
import { useState } from 'react';
import { SubjectsListScreen } from './Subject/SubjectsListScreen';

/** Subjects tab. No subject data layer exists yet, so the list shows its empty state. */
export function SubjectsScreen(): React.JSX.Element {
    const [query, setQuery] = useState('');

    return <SubjectsListScreen subjects={[]} query={query} onQueryChange={setQuery} />;
}
