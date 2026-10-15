package pl.mpospieszynski.site.profile.domain;

import java.time.LocalDate;
import java.util.UUID;
import pl.mpospieszynski.site.shared.i18n.TranslationStatus;

/** What the admin settings screen exchanges (docs/screens/admin/10-settings.md). */
public final class ProfileAdmin {

    private ProfileAdmin() {
    }

    public record ProfileTexts(String headline, String introMd, String aboutMd, String approachMd, String locationLabel,
                               String autoreplySubject, String autoreplyBodyMd) {
    }

    public record ProfileTranslations(ProfileTexts pl, ProfileTexts en) {
    }

    public record AvailabilitySettings(SiteSettings.Availability status, LocalDate from, boolean visible) {
    }

    public record SocialLinks(String github, String linkedin, String email) {
    }

    public record ProfileInput(long version, String fullName, AvailabilitySettings availability, SocialLinks socialLinks,
                               UUID portraitMediaId, UUID siteProjectId, ProfileTranslations translations) {
    }

    public record AdminProfile(long version, String fullName, AvailabilitySettings availability, SocialLinks socialLinks,
                               UUID portraitMediaId, UUID siteProjectId, TranslationStatus enStatus,
                               ProfileTranslations translations) {
    }
}
