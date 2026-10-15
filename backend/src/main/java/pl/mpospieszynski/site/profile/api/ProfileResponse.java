package pl.mpospieszynski.site.profile.api;

import java.time.LocalDate;
import java.util.Map;
import pl.mpospieszynski.site.profile.domain.Profile;
import pl.mpospieszynski.site.shared.i18n.SiteLocale;
import pl.mpospieszynski.site.shared.storage.MediaRef;

/** GET /api/v1/public/profile (docs/screens/public/01-app-shell.md, Data). */
public record ProfileResponse(
        SiteLocale lang,
        String fullName,
        String headline,
        String introMd,
        String aboutMd,
        String approachMd,
        String locationLabel,
        Availability availability,
        Map<String, String> socialLinks,
        MediaRef portrait,
        SiteProject siteProject) {

    public record Availability(String status, LocalDate from, boolean visible) {
    }

    public record SiteProject(String slug, SiteLocale lang) {
    }

    static ProfileResponse from(Profile p) {
        return new ProfileResponse(
                p.lang(), p.fullName(), p.headline(), p.introMd(), p.aboutMd(), p.approachMd(), p.locationLabel(),
                new Availability(p.availability().name(), p.availableFrom(), p.showAvailability()),
                p.socialLinks(),
                p.portrait() == null ? null : new MediaRef(p.portrait().url(), p.portrait().alt(), p.portrait().width(), p.portrait().height()),
                p.siteProject() == null ? null : new SiteProject(p.siteProject().slug(), p.siteProject().lang()));
    }
}
