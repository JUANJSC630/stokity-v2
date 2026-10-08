import { afterEach, describe, expect, it } from 'vitest';
import { isModalOpen } from '../modal';

function addDialog(role: string, state: string) {
    const element = document.createElement('div');
    element.setAttribute('role', role);
    element.setAttribute('data-state', state);
    document.body.appendChild(element);

    return element;
}

describe('isModalOpen', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('is false on a page without dialogs', () => {
        expect(isModalOpen()).toBe(false);
    });

    it('is true while a dialog is open', () => {
        addDialog('dialog', 'open');

        expect(isModalOpen()).toBe(true);
    });

    it('is true while an alert dialog is open', () => {
        addDialog('alertdialog', 'open');

        expect(isModalOpen()).toBe(true);
    });

    it('ignores a dialog that is closed', () => {
        addDialog('dialog', 'closed');

        expect(isModalOpen()).toBe(false);
    });

    it('ignores other roles', () => {
        addDialog('listbox', 'open');

        expect(isModalOpen()).toBe(false);
    });
});
