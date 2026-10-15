package pl.mpospieszynski.site.shared.i18n;

import java.util.Map;
import java.util.Optional;

/** Picks a translation with the site's fallback rule (docs/ARCHITECTURE.md §7): requested language, else Polish. */
public final class Translations {

    private Translations() {
    }

    public static <T> Optional<Localized<T>> pick(Map<SiteLocale, T> translations, SiteLocale requested) {
        T exact = translations.get(requested);
        if (exact != null) {
            return Optional.of(new Localized<>(exact, requested));
        }
        T fallback = translations.get(SiteLocale.DEFAULT);
        return Optional.ofNullable(fallback).map(value -> new Localized<>(value, SiteLocale.DEFAULT));
    }
}
