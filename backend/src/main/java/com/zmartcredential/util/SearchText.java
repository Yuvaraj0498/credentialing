package com.zmartcredential.util;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The search rule of every list: case does not matter, extra spaces are ignored, and every word typed must
 * appear somewhere in the row's fields ("john cahill", "cahill john" and "cahill cardio" all find John Cahill).
 */
public final class SearchText {

    private SearchText() {
    }

    /** The words of a search box (lower-case; split on spaces and commas). Empty = no search. */
    public static List<String> words(String q) {
        if (q == null || q.isBlank()) return List.of();
        return Arrays.stream(q.toLowerCase(Locale.ROOT).trim().split("[\\s,]+")).filter(w -> !w.isEmpty()).toList();
    }

    /** True when every word of q appears in one of the fields (or q is empty). */
    public static boolean matches(String q, Object... fields) {
        return matches(words(q), fields);
    }

    public static boolean matches(List<String> words, Object... fields) {
        if (words.isEmpty()) return true;
        String hay = Arrays.stream(fields).filter(Objects::nonNull).map(Object::toString)
                .collect(Collectors.joining(" ")).toLowerCase(Locale.ROOT);
        return words.stream().allMatch(hay::contains);
    }
}
