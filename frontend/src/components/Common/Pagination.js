import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage = 10,
  totalItems = 0,
  showInfo = true,
  className = ""
}) => {
  const [jumpToPage, setJumpToPage] = useState('');

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    return { startItem, endItem };
  };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  const { startItem, endItem } = getItemRange();

  return (
    <div className={`flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 pagination-container ${className}`}>
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 pagination-button"
          aria-label="Previous page"
          title="Previous page (←)"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`px-3 py-2 text-sm rounded-md transition-all duration-200 pagination-button ${
              page === currentPage
                ? 'bg-primary-600 text-white shadow-md'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-label={page === '...' ? 'More pages' : `Go to page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
            title={page === '...' ? 'More pages' : `Go to page ${page}`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 pagination-button"
          aria-label="Next page"
          title="Next page (→)"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
      
      {showInfo && (
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 pagination-info">
            {totalItems > 0 && (
              <>
                Showing {startItem}-{endItem} of {totalItems}
                <span className="mx-2">•</span>
              </>
            )}
            Page {currentPage} of {totalPages}
          </div>
          
          {totalPages > 10 && (
            <form onSubmit={handleJumpToPage} className="flex items-center space-x-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Jump to:
              </label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Page"
              />
              <button
                type="submit"
                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors duration-200"
              >
                Go
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Pagination; 