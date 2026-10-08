package com.zmartcredential.util;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Filename keyword heuristic for document_type codes (fallback while AI classification is deferred).
 * Fixes the prototype's guessDocType: matches whole words only ("idea" is not DEA, "covid" is not CV/ID),
 * returns real document_type codes and null when nothing matches (no fake "misc"/"Uncategorized").
 */
public final class DocTypeGuesser {

    private static final Map<String, Pattern> RULES = new LinkedHashMap<>();

    static {
        // order matters: first match wins
        rule("dea", "\\bdea\\b");
        rule("csr_license", "\\b(csr|cds)\\b|\\bcontrolled substances?\\b");
        rule("ecfmg", "\\becfmg\\b");
        rule("clia", "\\bclia\\b");
        rule("gov_id", "\\b(passport|drivers?|driver ?s|dl|identification|id|id card|photo id)\\b");
        rule("medical_license", "\\b(medical )?licen[cs]es?\\b");
        rule("malpractice", "\\b(malpractice|liability|coi|insurance|face ?sheet)\\b");
        rule("board_cert", "\\b(board|boards|abim|abem|abfm|abp|abpn|abos|abms)\\b");
        rule("cv", "\\b(cv|resume|curriculum|vitae)\\b");
        rule("w9", "\\bw ?9\\b");
        rule("diploma", "\\b(diploma|degree)\\b");
        rule("cme", "\\b(cme|cmes)\\b");
        rule("claim_history", "\\bclaims? history\\b|\\bloss runs?\\b");
        rule("collaborative", "\\b(collaborative|collaboration|supervisory)\\b");
    }

    private DocTypeGuesser() {
    }

    private static void rule(String code, String regex) {
        RULES.put(code, Pattern.compile(regex));
    }

    /** document_type code guessed from a file name or relative path, or null if no rule matches. */
    public static String guess(String fileName) {
        if (fileName == null || fileName.isBlank()) return null;
        String name = fileName.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        int dot = name.lastIndexOf('.');
        if (dot > 0) name = name.substring(0, dot);
        // split camelCase ("MedicalLicense") and treat separators as word boundaries
        name = name.replaceAll("([a-z])([A-Z])", "$1 $2").toLowerCase(Locale.ROOT);
        name = name.replaceAll("[^a-z0-9]+", " ").trim();
        for (Map.Entry<String, Pattern> e : RULES.entrySet()) {
            if (e.getValue().matcher(name).find()) return e.getKey();
        }
        return null;
    }
}
