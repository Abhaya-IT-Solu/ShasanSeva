'use client';

import styles from './Pagination.module.css';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

export default function Pagination({
    page,
    totalPages,
    total,
    onPageChange,
    loading = false,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const handlePrev = () => {
        if (page > 1) onPageChange(page - 1);
    };

    const handleNext = () => {
        if (page < totalPages) onPageChange(page + 1);
    };

    return (
        <div className={styles.pagination}>
            <span className={styles.info}>
                Showing page {page} of {totalPages} ({total} total)
            </span>
            <div className={styles.controls}>
                <button
                    className={styles.btn}
                    onClick={handlePrev}
                    disabled={page <= 1 || loading}
                >
                    ← Previous
                </button>
                <span className={styles.pageNum}>{page}</span>
                <button
                    className={styles.btn}
                    onClick={handleNext}
                    disabled={page >= totalPages || loading}
                >
                    Next →
                </button>
            </div>
        </div>
    );
}
