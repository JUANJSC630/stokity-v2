/**
 * Whether an accessible dialog (Radix Dialog / AlertDialog) is currently open.
 * Global keyboard shortcuts use it to stay quiet while a dialog has the focus,
 * so e.g. F9 cannot charge a sale behind a confirmation.
 */
export function isModalOpen(root: ParentNode = document): boolean {
    return root.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]') !== null;
}
