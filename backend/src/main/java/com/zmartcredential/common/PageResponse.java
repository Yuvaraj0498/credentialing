package com.zmartcredential.common;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    /** Pages an in-memory list (used where filtering happens after aggregation). */
    public static <T> PageResponse<T> ofList(List<T> all, int page, int size) {
        int safeSize = Math.max(1, size);
        int from = Math.min(Math.max(0, page) * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        int totalPages = (int) Math.ceil(all.size() / (double) safeSize);
        return new PageResponse<>(all.subList(from, to), page, safeSize, all.size(), totalPages);
    }
}
