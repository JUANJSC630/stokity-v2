import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
        return path.endsWith('.tsx') && !path.includes(`${join('components', 'ui')}`) ? [path] : [];
    });
}

/** `<Button size="icon">` elements that a screen reader would announce as just "button". */
function unnamedIconButtons(file: string): string[] {
    const text = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
            const opening = ts.isJsxElement(node) ? node.openingElement : node;
            const props = opening.attributes.properties.filter(ts.isJsxAttribute);
            const named = (name: string) => props.some((prop) => prop.name.getText() === name);
            const isIconButton =
                opening.tagName.getText() === 'Button' &&
                props.some((prop) => prop.name.getText() === 'size' && prop.initializer?.getText() === '"icon"');
            const hasScreenReaderText = ts.isJsxElement(node) && /<span[^>]*sr-only/.test(node.getText());

            if (isIconButton && !named('aria-label') && !named('aria-labelledby') && !hasScreenReaderText) {
                found.push(`${relative(root, file)}:${source.getLineAndCharacterOfPosition(opening.getStart()).line + 1}`);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);

    return found;
}

describe('icon-only buttons', () => {
    it('always have an accessible name', () => {
        const unnamed = sourceFiles(root).flatMap(unnamedIconButtons);

        expect(unnamed).toEqual([]);
    });
});
