package com.zmartcredential.util;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The search rule of every list: case does not matter, extra spaces are ignored, and every word typed must
 * appear somewhere in the row's fields ("john cahill", "cahill john" and "cahill cardio" all find John Cahill).
 * A single character matches the START of a word ("a" finds Alicia and Aetna, not every name containing an a),
 * so a one-letter search gives a useful result; two or more characters match anywhere.
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
        return words.stream().allMatch(w -> contains(hay, w));
    }

    /** One word in a lower-case text: anywhere, or — for a single character — at the start of a word. */
    public static boolean contains(String lowerText, String word) {
        if (word.length() > 1) return lowerText.contains(word);
        for (int i = lowerText.indexOf(word); i >= 0; i = lowerText.indexOf(word, i + 1)) {
            if (i == 0 || !Character.isLetterOrDigit(lowerText.charAt(i - 1))) return true;
        }
        return false;
    }
}
