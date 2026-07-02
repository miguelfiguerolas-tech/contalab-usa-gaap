import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    { ignores: ['dist/', 'node_modules/'] },
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx}'],
        plugins: {
            react,
            'react-hooks': reactHooks
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true }
            },
            globals: {
                ...globals.browser,
                // API de extensiones (background.js)
                chrome: 'readonly'
            }
        },
        settings: {
            react: { version: 'detect' }
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            // Sin PropTypes en el proyecto: la validación de props no aplica
            'react/prop-types': 'off',
            // Con el JSX runtime automático no hace falta React en scope,
            // pero el proyecto importa React explícitamente; ambas valen
            'react/react-in-jsx-scope': 'off',
            // Regla del React Compiler que marca el patrón fetch-on-mount
            // (cargar de IndexedDB en un useEffect activando un flag de
            // loading). Es el patrón de datos de toda la app; migrar a una
            // librería de data-fetching no compensa a esta escala.
            'react-hooks/set-state-in-effect': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        }
    }
];
