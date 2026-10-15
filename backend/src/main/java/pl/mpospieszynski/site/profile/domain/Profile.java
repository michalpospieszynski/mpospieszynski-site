package pl.mpospieszynski.site.profile.domain;

import java.time.LocalDate;
import java.util.Map;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;

/** The public profile in one language, as the service returns it; the API maps it to ProfileResponse. */
public record Profile(
        SiteLocale lang,
        String fullName,
        String headline,
        String introMd,
        String aboutMd,
        String approachMd,
        String locationLabel,
        SiteSettings.Availability availability,
        LocalDate availableFrom,
        boolean showAvailability,
        Map<String, String> socialLinks,
        Portrait portrait,
        SiteProject siteProject) {

    public record Portrait(String url, String alt, Integer width, Integer height) {
    }

    public record SiteProject(String slug, SiteLocale lang) {
    }
}
