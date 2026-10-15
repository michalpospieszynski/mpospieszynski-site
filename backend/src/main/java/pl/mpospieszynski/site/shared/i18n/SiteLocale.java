package pl.mpospieszynski.site.shared.i18n;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/** The site's languages. Polish is the default and the source of truth; English is optional per record. */
public enum SiteLocale {
    PL("pl"),
    EN("en");

    public static final SiteLocale DEFAULT = PL;

    private final String code;
    private final Locale locale;

    SiteLocale(String code) {
        this.code = code;
        this.locale = Locale.of(code);
    }

    /** The value used in URLs, JSON and the `locale` database columns. */
    public String code() {
        return code;
    }

    public Locale locale() {
        return locale;
    }

    /** Parses `pl` / `en`, ignoring case and surrounding spaces. */
    public static Optional<SiteLocale> fromCode(String code) {
        if (code == null) {
            return Optional.empty();
        }
        String normalized = code.strip().toLowerCase(Locale.ROOT);
        return Arrays.stream(values()).filter(l -> l.code.equals(normalized)).findFirst();
    }

    @Override
    public String toString() {
        return code;
    }
}
