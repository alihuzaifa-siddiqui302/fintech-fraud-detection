import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';
import clsx from 'clsx';

export const PagedTable = ({
  columns = [],
  data = [],
  page = 0,
  totalPages = 1,
  onPageChange,
  onRowClick,
  loading = false,
  emptyTitle = 'No records found',
  emptyMessage,
  emptyIcon,
  rowClassName,
}) => {
  return (
    <div className="w-full bg-slate-800/40 rounded-2xl border border-slate-800 backdrop-blur-sm overflow-hidden flex flex-col shadow-xl">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800/80 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-700/60">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={clsx(
                    'py-3.5 px-4 font-semibold select-none',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  <LoadingSkeleton rows={5} columns={columns.length} />
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={clsx(
                    'transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-slate-700/40',
                    typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                  )}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={clsx(
                        'py-3.5 px-4 whitespace-nowrap',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.className
                      )}
                    >
                      {col.render ? col.render(row, rIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-slate-200">{page + 1}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagedTable;
