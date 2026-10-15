package pl.mpospieszynski.site.shared.i18n;

/**
 * A translated value together with the language it is actually in, so responses can say
 * which language they contain (`lang`) when English falls back to Polish.
 */
public record Localized<T>(T value, SiteLocale lang) {

    /** True when the value is not in the language that was asked for. */
    public boolean isFallbackFor(SiteLocale requested) {
        return lang != requested;
    }
}
