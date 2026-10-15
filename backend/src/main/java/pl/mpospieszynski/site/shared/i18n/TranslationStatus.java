package pl.mpospieszynski.site.shared.i18n;

import java.util.List;

/**
 * How complete the English version of a record is (admin lists and the dashboard): {@code MISSING} without an
 * English row, {@code PARTIAL} when a text filled in Polish is empty in English, else {@code COMPLETE}.
 */
public enum TranslationStatus {
    COMPLETE,
    PARTIAL,
    MISSING;

    /**
     * @param polish  the Polish values of the translatable fields, in a fixed order
     * @param english the English values in the same order, or null when there is no English row
     */
    public static TranslationStatus of(List<String> polish, List<String> english) {
        if (english == null) {
            return MISSING;
        }
        for (int i = 0; i < polish.size(); i++) {
            if (filled(polish.get(i)) && !filled(english.get(i))) {
                return PARTIAL;
            }
        }
        return COMPLETE;
    }

    private static boolean filled(String value) {
        return value != null && !value.isBlank();
    }
}
