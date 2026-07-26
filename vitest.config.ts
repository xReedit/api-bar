import { defineConfig } from 'vitest/config';

// Antes de vitest, "src/tests/*.test.ts(.js)" eran scripts manuales para
// correr con `ts-node` (no usan ningún test runner). Vitest los detecta por
// el patrón *.test.* por defecto y falla porque no tienen describe/it. Se
// limita el include a las pruebas reales de vitest para no romperlos.
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        exclude: ['src/tests/**', 'node_modules/**'],
    },
});
