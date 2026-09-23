// com.fraudguard.dto.response.PagedResponse
package com.fraudguard.dto.response;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Generic container for paginated API responses.
 *
 * @param <T> payload element type
 * @param content page item list
 * @param page current 0-indexed page number
 * @param size maximum items per page
 * @param totalElements aggregate total element count across all pages
 * @param totalPages total number of pages available
 * @param hasNext whether subsequent pages exist
 * @param hasPrevious whether previous pages exist
 */
public record PagedResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean hasNext,
    boolean hasPrevious
) {
    /**
     * Constructs a PagedResponse from a Spring Data Page instance.
     *
     * @param <T> item type
     * @param page Spring Data Page
     * @return PagedResponse wrapper
     */
    public static <T> PagedResponse<T> from(Page<T> page) {
        return new PagedResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.hasNext(),
            page.hasPrevious()
        );
    }
}
