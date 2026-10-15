package pl.mpospieszynski.site.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One language's texts of the site settings (table site_settings_translation). */
@Embeddable
public class SiteSettingsText {

    @Column(nullable = false)
    private String headline;

    private String introMd;
    private String aboutMd;
    private String approachMd;
    private String locationLabel;
    private String autoreplySubject;
    private String autoreplyBodyMd;

    protected SiteSettingsText() {
    }

    public SiteSettingsText(ProfileAdmin.ProfileTexts t) {
        headline = t.headline().strip();
        introMd = blankToNull(t.introMd());
        aboutMd = blankToNull(t.aboutMd());
        approachMd = blankToNull(t.approachMd());
        locationLabel = blankToNull(t.locationLabel());
        autoreplySubject = blankToNull(t.autoreplySubject());
        autoreplyBodyMd = blankToNull(t.autoreplyBodyMd());
    }

    public ProfileAdmin.ProfileTexts toTexts() {
        return new ProfileAdmin.ProfileTexts(headline, introMd, aboutMd, approachMd, locationLabel, autoreplySubject,
                autoreplyBodyMd);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    public String headline() {
        return headline;
    }

    public String introMd() {
        return introMd;
    }

    public String aboutMd() {
        return aboutMd;
    }

    public String approachMd() {
        return approachMd;
    }

    public String locationLabel() {
        return locationLabel;
    }

    public String autoreplySubject() {
        return autoreplySubject;
    }

    public String autoreplyBodyMd() {
        return autoreplyBodyMd;
    }
}
