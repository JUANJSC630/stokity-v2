import React from 'react';

export type Column<T> = {
    key: keyof T;
    title: string;
    render?: (value: unknown, row: T) => React.ReactNode;
};

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    className?: string;
    theadClassName?: string;
    tbodyClassName?: string;
    trClassName?: string;
    thClassName?: string;
    tdClassName?: string;
    emptyMessage?: React.ReactNode;
    children?: React.ReactNode;
}

export function Table<T extends object>({
    columns,
    data,
    className = 'w-full',
    theadClassName = 'bg-muted/50',
    tbodyClassName = '',
    trClassName = 'border-b hover:bg-muted/20',
    thClassName = 'px-4 py-3 text-sm font-medium',
    tdClassName = 'px-4 py-3 text-sm',
    emptyMessage = <p className="text-muted-foreground">No se encontraron resultados</p>,
    children,
}: TableProps<T>) {
    return (
        <table className={className}>
            <thead className={theadClassName}>
                <tr className="border-b text-left">
                    {columns.map((col) => (
                        <th key={String(col.key)} className={thClassName}>
                            {col.title}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className={tbodyClassName}>
                {data.length > 0 ? (
                    data.map((row, i) => (
                        <tr key={i} className={trClassName}>
                            {columns.map((col) => (
                                <td key={String(col.key)} className={tdClassName}>
                                    {col.render ? col.render(row[col.key], row) : (row[col.key] as React.ReactNode)}
                                </td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={columns.length} className="px-4 py-6 text-center">
                            {emptyMessage}
                        </td>
                    </tr>
                )}
                {children}
            </tbody>
        </table>
    );
}
