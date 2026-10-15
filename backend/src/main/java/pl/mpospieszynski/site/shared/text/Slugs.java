package pl.mpospieszynski.site.shared.text;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** URL slugs with Polish transliteration (ą→a, ł→l, ż→z…), the same rules as the admin's slug field. */
public final class Slugs {

    /** The format the database accepts (check constraints on every slug column). */
    public static final Pattern VALID = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

    private Slugs() {
    }

    public static String slugify(String text) {
        if (text == null) {
            return "";
        }
        String folded = Normalizer.normalize(text.toLowerCase(Locale.ROOT).replace('ł', 'l'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return folded.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }

    public static boolean isValid(String slug) {
        return slug != null && VALID.matcher(slug).matches();
    }
}
