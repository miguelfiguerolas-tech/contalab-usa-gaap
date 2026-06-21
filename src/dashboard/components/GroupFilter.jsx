import React from 'react';
import { ACCOUNT_GROUPS } from '../../db/statements_us';

// Filter chips by account group (1-6). value '' = all groups.
export default function GroupFilter({ value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
                active={value === ''}
                label="All"
                title="Show all groups"
                onClick={() => onChange('')}
            />
            {Object.entries(ACCOUNT_GROUPS).map(([grupo, nombre]) => (
                <Chip
                    key={grupo}
                    active={value === grupo}
                    label={grupo}
                    title={`Group ${grupo}: ${nombre}`}
                    onClick={() => onChange(value === grupo ? '' : grupo)}
                />
            ))}
        </div>
    );
}

function Chip({ active, label, title, onClick }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-primary)' : 'white',
                color: active ? 'white' : 'var(--color-text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1.4
            }}
        >
            {label}
        </button>
    );
}
